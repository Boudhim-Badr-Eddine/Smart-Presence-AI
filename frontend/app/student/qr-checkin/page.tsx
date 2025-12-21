"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { QrCode, CheckCircle, XCircle, Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { syncManager } from "@/lib/offline-sync";
import { apiClient } from "@/lib/api-client";

export default function QRCheckinPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [gpsPermission, setGpsPermission] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    }
  }, [searchParams]);

  const verifyToken = async (qrToken: string) => {
    try {
      setLoading(true);
      const data = await apiClient(`/api/qr/verify/${encodeURIComponent(qrToken)}`);
      setSessionInfo(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to verify QR code',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCheckin = async () => {
    if (!token || !user) return;

    try {
      setLoading(true);

      // Try to get GPS location
      let location = coords;
      if (!location && gpsPermission) {
        try {
          location = await getLocation();
          setCoords(location);
        } catch (error) {
          console.warn('GPS not available:', error);
        }
      }

      // Attempt check-in
      const requestData = {
        token,
        gps_lat: location?.lat,
        gps_lng: location?.lng,
      };

      let success = false;
      let message = '';

      if (navigator.onLine) {
        // Online - submit directly
        await apiClient('/api/qr/checkin', {
          method: 'POST',
          data: requestData,
        });

        success = true;
        message = 'Check-in successful!';
      } else {
        // Offline - queue for later
        await syncManager.addCheckin({
          qrToken: token,
          sessionId: sessionInfo.session_id,
          studentId: user.id,
          timestamp: Date.now(),
          gpsLat: location?.lat,
          gpsLng: location?.lng,
          method: 'qr_code_offline',
        });

        success = true;
        message = 'Offline check-in queued. Will sync when online.';
      }

      setResult({ success, message });

    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Check-in failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestGPS = async () => {
    try {
      const location = await getLocation();
      setCoords(location);
      setGpsPermission(true);
    } catch (error) {
      console.error('GPS permission denied:', error);
      setGpsPermission(false);
    }
  };

  if (!user || user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center text-white">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <p className="text-xl">Access denied. Students only.</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center text-white">
          <QrCode className="h-16 w-16 mx-auto mb-4 text-amber-400" />
          <p className="text-xl">No QR code provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700">
        <div className="text-center mb-8">
          <QrCode className="h-16 w-16 mx-auto mb-4 text-amber-400" />
          <h1 className="text-3xl font-bold text-white mb-2">QR Code Check-In</h1>
          <p className="text-slate-400">Scan complete - Ready to check in</p>
        </div>

        {loading && (
          <div className="flex justify-center mb-6">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        )}

        {sessionInfo && !result && (
          <div className="space-y-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">Session</p>
              <p className="text-white font-semibold">Session #{sessionInfo.session_id}</p>
            </div>

            {/* GPS Option */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-400" />
                  <span className="text-white font-medium">Location Verification</span>
                </div>
                {coords && (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                )}
              </div>
              {!coords && (
                <button
                  onClick={requestGPS}
                  className="text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  Enable GPS
                </button>
              )}
              {coords && (
                <p className="text-xs text-slate-400 mt-1">
                  Location captured: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
            </div>

            <button
              onClick={handleCheckin}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking in...' : 'Check In Now'}
            </button>

            {!navigator.onLine && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-yellow-300 text-sm text-center">
                  ⚠️ You are offline. Check-in will be queued and synced later.
                </p>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="text-center">
            {result.success ? (
              <>
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-400" />
                <p className="text-2xl font-bold text-white mb-2">Success!</p>
                <p className="text-slate-300">{result.message}</p>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <p className="text-2xl font-bold text-white mb-2">Failed</p>
                <p className="text-slate-300">{result.message}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
