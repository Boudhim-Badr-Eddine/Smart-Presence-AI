'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { useRequireAuth } from '@/lib/auth-context';
import {
  Camera,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface ActiveSession {
  id: number;
  title: string;
  class_name: string;
  date: string;
  start_time: string;
  end_time: string;
  trainer_name: string;
  is_attendance_active: boolean;
}

interface CheckinResult {
  status: 'approved' | 'rejected' | 'flagged';
  message: string;
  face_confidence?: number;
  liveness_passed: boolean;
  location_verified: boolean;
}

type ActiveSessionsResponse = ActiveSession[] | { data: ActiveSession[] };

export default function StudentCheckInPage() {
  const router = useRouter();
  const { user } = useRequireAuth(['student']);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadActiveSessions();
  }, []);

  // Auto-retry on network errors (max 3 times)
  useEffect(() => {
    if (error?.includes('connexion') && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadActiveSessions();
      }, 3000); // Retry after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  const loadActiveSessions = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear previous errors
      
      // Check if user is authenticated
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('spa_access_token');
        if (!token) {
          setError('Session expirée. Veuillez vous reconnecter.');
          setIsLoading(false);
          return;
        }
        console.log('Token exists, length:', token.length);
      }
      
      console.log('Fetching active sessions...');
      const data = await apiClient<ActiveSessionsResponse>(
        '/api/student/active-sessions-for-checkin',
        {
          method: 'GET',
          useCache: false,
        }
      );
      
      console.log('Active sessions response:', data);
      
      // Filter to only show sessions that have attendance activated
      // Handle both direct array and wrapped response
      const sessionsArray: ActiveSession[] = Array.isArray(data) ? data : (data?.data ?? []);
      const activatedSessions = sessionsArray.filter(s => s.is_attendance_active === true);
      setActiveSessions(activatedSessions);
      
      if (!activatedSessions || activatedSessions.length === 0) {
        setError('Aucune session active pour le check-in. Le formateur doit d\'abord activer la session.');
      }
    } catch (err: any) {
      console.error('Error loading active sessions:', err);
      console.error('Error details:', err.response?.data || err.message);
      
      // Handle different error types
      if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        setError('Erreur de connexion. Vérifiez votre connexion internet et réessayez.');
      } else if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.status === 403) {
        setError('Accès refusé. Vous devez être connecté en tant qu\'étudiant.');
      } else if (err.response?.status === 404) {
        setError('Aucune session disponible pour le moment.');
      } else {
        setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement des sessions. Réessayez dans quelques secondes.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const requestLocation = async () => {
    try {
      setLocationError(null);
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err)
        );
      });
      setLatitude(position.latitude);
      setLongitude(position.longitude);
    } catch (err) {
      setLocationError('Impossible d\'obtenir la localisation. Vérifiez les permissions.');
    }
  };

  const submitCheckin = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedSession) {
      setError('Erreur: configuration de caméra incorrecte');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');

      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setError('Erreur: impossible de capturer la photo');
          return;
        }

        try {
          const formData = new FormData();
          formData.append('photo', blob, 'checkin.jpg');

          const params = new URLSearchParams();
          params.set('session_id', String(selectedSession.id));
          if (latitude !== null) params.set('latitude', String(latitude));
          if (longitude !== null) params.set('longitude', String(longitude));

          const result = await apiClient<CheckinResult>(
            `/api/student/submit-checkin?${params.toString()}`,
            {
              method: 'POST',
              data: formData,
            }
          );

          setCheckinResult(result);
          setIsCameraActive(false);
          if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
          }
        } catch (err: any) {
          setError(err.message || 'Erreur lors du check-in');
        } finally {
          setIsSubmitting(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Erreur');
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-4xl p-6">
        <Breadcrumbs
          items={[
            { label: 'Mon espace étudiant', href: '/student' },
            { label: 'Check-in par reconnaissance faciale' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Check-in par Reconnaissance Faciale</h1>
          <p className="text-zinc-400">
            Sélectionnez une session active et effectuez un check-in avec votre visage.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Erreur</p>
                <p>{error}</p>
              </div>
            </div>
            {error.includes('connexion') && (
              <button
                onClick={() => {
                  setRetryCount(0);
                  loadActiveSessions();
                }}
                className="mt-3 w-full rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-600/30 transition"
              >
                Réessayer maintenant
              </button>
            )}
            {error.includes('Session expirée') && (
              <button
                onClick={() => window.location.href = '/login'}
                className="mt-3 w-full rounded-lg bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-600/30 transition"
              >
                Se reconnecter
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : !selectedSession ? (
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold text-white mb-4">Sessions actives disponibles</h2>
            {activeSessions.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
                <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                <p className="text-white mb-2">Aucune session active</p>
                <p className="text-zinc-400 text-sm">
                  Attendez que votre formateur active une session pour effectuer un check-in.
                </p>
              </div>
            ) : (
              activeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-6 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{session.title}</h3>
                      <div className="space-y-1 text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {session.date} • {session.start_time} - {session.end_time}
                        </div>
                        <div>{session.class_name}</div>
                        <div>Formateur: {session.trainer_name}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : checkinResult ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8">
            <div className="text-center">
              {checkinResult.status === 'approved' && (
                <>
                  <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Check-in Approuvé</h2>
                  <p className="text-zinc-300 mb-2">{checkinResult.message}</p>
                  {checkinResult.face_confidence && (
                    <p className="text-sm text-zinc-400">
                      Confiance faciale: {(checkinResult.face_confidence * 100).toFixed(1)}%
                    </p>
                  )}
                </>
              )}
              {checkinResult.status === 'flagged' && (
                <>
                  <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Check-in en Attente</h2>
                  <p className="text-zinc-300 mb-2">{checkinResult.message}</p>
                  <p className="text-sm text-zinc-400">
                    Votre check-in sera confirmé par votre formateur.
                  </p>
                </>
              )}
              {checkinResult.status === 'rejected' && (
                <>
                  <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Check-in Rejeté</h2>
                  <p className="text-zinc-300 mb-2">{checkinResult.message}</p>
                </>
              )}

              <div className="mt-8 flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    setSelectedSession(null);
                    setCheckinResult(null);
                    setLatitude(null);
                    setLongitude(null);
                  }}
                >
                  Nouvelle tentative
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/student')}
                >
                  Retour au tableau de bord
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                {selectedSession.title}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Date & Heure</p>
                  <p className="text-white">
                    {selectedSession.date} • {selectedSession.start_time}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400">Formateur</p>
                  <p className="text-white">{selectedSession.trainer_name}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  className="hidden"
                />
              </div>

              {!isCameraActive ? (
                <Button
                  onClick={startCamera}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Démarrer la caméra
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
                    Positionnez votre visage face à la caméra. Assurez-vous d'avoir un bon éclairage.
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={requestLocation}
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {latitude ? 'Localisation OK' : 'Ajouter localisation'}
                    </Button>
                    {locationError && (
                      <p className="text-xs text-red-400">{locationError}</p>
                    )}
                  </div>

                  <Button
                    onClick={submitCheckin}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi du check-in...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Valider le check-in
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={() => setSelectedSession(null)}
              className="w-full"
            >
              Changer de session
            </Button>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
