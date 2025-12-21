'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { apiClient } from '@/lib/api-client';

interface FacialRecognitionProps {
  userId: number;
  mode: 'enroll' | 'verify';
  onComplete?: (success: boolean, message: string) => void;
}

export default function FacialRecognition({
  userId,
  mode = 'verify',
  onComplete,
}: FacialRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [photosRequired] = useState(mode === 'enroll' ? 5 : 1);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  /**
   * Initializes webcam stream for facial capture.
   * Requests user media permissions and sets up video element.
   * @throws {Error} If camera access is denied or unavailable
   */
  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const photoData = canvasRef.current.toDataURL('image/jpeg');

        setPhotos((prev) => {
          const next = [...prev, photoData];
          if (mode === 'enroll' && next.length >= photosRequired) {
            setTimeout(() => {
              void enrollFace(next);
            }, 500);
          }
          return next;
        });
      }
    }
  };

  const enrollFace = async (images?: string[]) => {
    try {
      setLoading(true);
      setError(null);

      const imagesBase64 = images ?? photos;
      if (!imagesBase64.length) {
        setError('Aucune photo capturée');
        return;
      }

      await apiClient('/api/facial/enroll', {
        method: 'POST',
        data: {
          student_id: userId,
          images_base64: imagesBase64,
        },
      });

      setSuccess(true);
      setPhotos([]);
      stopCamera();
      if (onComplete) {
        onComplete(true, 'Inscription faciale réussie!');
      }
    } catch (err) {
      const detail = (err as any)?.response?.data?.detail as string | undefined;
      setError(detail || "Erreur lors de l'inscription faciale");
      console.error('Enroll error:', err);
      if (onComplete) {
        onComplete(false, "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyFace = async () => {
    try {
      setLoading(true);
      setError(null);

      if (photos.length === 0) {
        setError('Aucune photo capturée');
        return;
      }

      const result = await apiClient<{ verified: boolean; confidence: number }>('/api/facial/verify', {
        method: 'POST',
        data: {
          student_id: userId,
          image_base64: photos[0],
        },
      });

      if (!result?.verified) {
        setError(`Reconnaissance faciale échouée (confiance ${Math.round((result?.confidence || 0) * 100)}%)`);
        if (onComplete) {
          onComplete(false, 'Reconnaissance faciale échouée');
        }
        return;
      }

      setSuccess(true);
      setPhotos([]);
      stopCamera();
      if (onComplete) {
        onComplete(true, 'Reconnaissance faciale réussie!');
      }
    } catch (err) {
      const detail = (err as any)?.response?.data?.detail as string | undefined;
      setError(detail || 'Erreur lors de la vérification faciale');
      console.error('Verify error:', err);
      if (onComplete) {
        onComplete(false, 'Reconnaissance faciale échouée');
      }
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <div className="flex justify-center mb-4">
          <Check size={48} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-emerald-300 mb-2">
          {mode === 'enroll' ? 'Inscription réussie!' : 'Vérification réussie!'}
        </h3>
        <p className="text-white/60 text-sm">
          {mode === 'enroll' ? 'Votre visage a été enregistré avec succès.' : 'Accès autorisé.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 flex gap-3">
          <X className="text-rose-400 flex-shrink-0" size={20} />
          <p className="text-rose-300 text-sm">{error}</p>
        </div>
      )}

      {/* Camera Feed */}
      <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-video object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Face Guide Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-4 border-blue-400 rounded-lg opacity-50" />
            </div>
          </>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
            <div className="text-center">
              <Camera size={48} className="mx-auto text-white/40 mb-3" />
              <p className="text-white/60">Caméra inactive</p>
            </div>
          </div>
        )}
      </div>

      {/* Photos Captured */}
      {photos.length > 0 && (
        <div>
          <p className="text-sm text-white/60 mb-2">
            Photos capturées: {photos.length}/{photosRequired}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border border-white/10"
              >
                <Image
                  src={photo}
                  alt={`capture-${index}`}
                  fill
                  className="object-cover"
                  loading="lazy"
                />
                <button
                  onClick={() => removePhoto(index)}
                  type="button"
                  aria-label={`Supprimer la photo ${index + 1}`}
                  title={`Supprimer la photo ${index + 1}`}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {Array.from({ length: photosRequired - photos.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-lg border border-white/10 border-dashed flex items-center justify-center bg-white/5"
              >
                <span className="text-white/30 text-xs">+{photosRequired - photos.length - i}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="w-full flex items-center justify-center gap-2 bg-blue-500/30 text-blue-300 hover:bg-blue-500/40 px-4 py-3 rounded-lg transition font-medium"
          >
            <Camera size={18} />
            Allumer la caméra
          </button>
        ) : (
          <>
            <button
              onClick={capturePhoto}
              disabled={loading || (mode === 'enroll' && photos.length >= photosRequired)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition font-medium"
            >
              <Upload size={18} />
              Capturer une photo {mode === 'enroll' && `(${photos.length}/${photosRequired})`}
            </button>
            <button
              onClick={stopCamera}
              className="w-full flex items-center justify-center gap-2 bg-white/10 text-white/60 hover:bg-white/20 px-4 py-3 rounded-lg transition"
            >
              <X size={18} />
              Éteindre la caméra
            </button>
          </>
        )}

        {mode === 'verify' && photos.length > 0 && (
          <button
            onClick={verifyFace}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition font-medium"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <Check size={18} />
                Vérifier le visage
              </>
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
        <p className="text-sm text-white/60">
          {mode === 'enroll'
            ? `Capturez ${photosRequired} photos de votre visage sous différents angles pour une meilleure reconnaissance.`
            : 'Capturez une photo de votre visage pour vérifier votre identité.'}
        </p>
      </div>
    </div>
  );
}
