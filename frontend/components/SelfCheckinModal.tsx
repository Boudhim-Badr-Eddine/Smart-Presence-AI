'use client';

import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Camera, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SelfCheckinModalProps {
  isOpen: boolean;
  sessionId: number;
  sessionTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type CheckinStep = 'instructions' | 'camera' | 'location' | 'submitting' | 'success' | 'error';

interface CheckinResult {
  status: 'approved' | 'rejected' | 'flagged';
  face_confidence?: number;
  liveness_passed: boolean;
  location_verified: boolean;
  rejection_reason?: string;
}

export default function SelfCheckinModal({
  isOpen,
  sessionId,
  sessionTitle,
  onClose,
  onSuccess,
}: SelfCheckinModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<CheckinStep>('instructions');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Request camera access
  const startCamera = useCallback(async () => {
    try {
      setStep('camera');
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setStep('error');
    }
  }, []);

  // Request location
  const requestLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas disponible.');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setStep('submitting');
        setIsLoadingLocation(false);
      },
      (error) => {
        setLocationError(`Erreur de géolocalisation: ${error.message}`);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Capture photo and submit
  const submitCheckin = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Erreur: impossible d\'accéder à la caméra.');
      setStep('error');
      return;
    }

    try {
      setStep('submitting');
      setError(null);

      // Capture frame from video
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');

      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Convert to blob
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setError('Erreur: impossible de capturer la photo.');
          setStep('error');
          return;
        }

        try {
          const formData = new FormData();
          formData.append('photo', blob, 'checkin.jpg');
          if (latitude !== null) formData.append('latitude', latitude.toString());
          if (longitude !== null) formData.append('longitude', longitude.toString());
          formData.append('session_id', sessionId.toString());

          const response = await fetch('/api/smart-attendance/self-checkin', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erreur lors de l\'enregistrement');
          }

          const data = await response.json();
          setResult(data);
          setStep('success');

          // Auto-close on success
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erreur d\'enregistrement');
          setStep('error');
        }
      }, 'image/jpeg');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la capture');
      setStep('error');
    }
  }, [sessionId, latitude, longitude, onSuccess, onClose]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const handleClose = () => {
    stopCamera();
    setStep('instructions');
    setError(null);
    setResult(null);
    setLatitude(null);
    setLongitude(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto-Enregistrement</DialogTitle>
          <DialogDescription>
            {sessionTitle && `Cours: ${sessionTitle}`}
          </DialogDescription>
        </DialogHeader>

        {/* Instructions Step */}
        {step === 'instructions' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cet enregistrement utilise l'IA pour vérifier votre présence. Assurez-vous d'avoir une bonne
                lumière et une connexion Internet stable.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Étapes:</h3>
              <ol className="text-sm space-y-1 ml-4 list-decimal">
                <li>Acceptez l'accès à la caméra</li>
                <li>Autorisez la géolocalisation (si demandé)</li>
                <li>Prenez une photo claire de votre visage</li>
                <li>Confirmez l'enregistrement</li>
              </ol>
            </div>

            <Button onClick={startCamera} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Démarrer l'enregistrement
            </Button>
          </div>
        )}

        {/* Camera Step */}
        {step === 'camera' && (
          <div className="space-y-4">
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <canvas ref={canvasRef} className="hidden" width={1280} height={720} />

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Annuler
              </Button>
              <Button onClick={requestLocation} className="flex-1">
                <MapPin className="mr-2 h-4 w-4" />
                Localiser & Enregistrer
              </Button>
            </div>
          </div>
        )}

        {/* Location Step */}
        {step === 'location' && (
          <div className="space-y-4">
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Accès à la localisation demandé...
              </AlertDescription>
            </Alert>
            <Button disabled className="w-full">
              Chargement...
            </Button>
          </div>
        )}

        {/* Submitting Step */}
        {step === 'submitting' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vérification en cours... Cela peut prendre quelques secondes.
              </AlertDescription>
            </Alert>
            <Button disabled className="w-full">
              Traitement...
            </Button>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && result && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Enregistrement réussi!
              </AlertDescription>
            </Alert>

            {result.status === 'approved' && (
              <div className="text-sm space-y-1">
                <p className="font-semibold text-green-700">✓ Vérification réussie</p>
                {result.face_confidence && (
                  <p className="text-gray-600">
                    Confiance faciale: {(result.face_confidence * 100).toFixed(1)}%
                  </p>
                )}
                {result.liveness_passed && (
                  <p className="text-gray-600">✓ Détection de vivacité: Approuvée</p>
                )}
                {result.location_verified && (
                  <p className="text-gray-600">✓ Localisation: Vérifiée</p>
                )}
              </div>
            )}

            {result.status === 'flagged' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Enregistrement en attente de révision. Un administrateur examinera votre demande.
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error || 'Une erreur s\'est produite lors de l\'enregistrement.'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Fermer
              </Button>
              <Button onClick={startCamera} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
