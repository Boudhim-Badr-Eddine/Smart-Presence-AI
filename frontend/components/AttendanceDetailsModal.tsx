'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Camera,
  Clock,
} from 'lucide-react';

interface StudentAttendance {
  id: number | null;
  student_id: number;
  student_name: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'flagged';
  face_confidence?: number;
  liveness_passed: boolean;
  location_verified: boolean;
  checked_in_at?: string;
  photo_url?: string;
}

interface AttendanceDetailsModalProps {
  isOpen: boolean;
  sessionId: number | null;
  sessionTitle?: string;
  onClose: () => void;
  onConfirm: (attendance: StudentAttendance[]) => void;
}

export default function AttendanceDetailsModal({
  isOpen,
  sessionId,
  sessionTitle,
  onClose,
  onConfirm,
}: AttendanceDetailsModalProps) {
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    if (!sessionId) return;
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading attendance for session:', sessionId);
      const data = await apiClient<StudentAttendance[]>(
        `/api/trainer/session-attendance?session_id=${sessionId}`,
        { method: 'GET', useCache: false }
      );
      console.log('Attendance data received:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Length:', data?.length);
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading attendance:', err);
      setError(err.message || 'Erreur lors du chargement de la présence');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen && sessionId) {
      loadAttendance();
    } else if (!isOpen) {
      // Reset state when modal closes
      setAttendance([]);
      setError(null);
    }
  }, [isOpen, sessionId, loadAttendance]);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      setError(null);
      
      // Send confirmation to backend
      await apiClient(`/api/trainer/confirm-attendance?session_id=${sessionId}`, {
        method: 'POST',
        data: {
          attendance_records: attendance.map(a => ({
            student_id: a.student_id,
            status: a.status
          }))
        }
      });

      onConfirm(attendance);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la confirmation');
    } finally {
      setIsConfirming(false);
    }
  };

  const checkedInCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const flaggedCount = attendance.filter(a => a.status === 'flagged').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-500" />
            Détails de Présence - {sessionTitle}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-emerald-300 text-sm font-medium mb-1">Présents</p>
                <p className="text-3xl font-bold text-emerald-400">{checkedInCount}</p>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-red-300 text-sm font-medium mb-1">Absents</p>
                <p className="text-3xl font-bold text-red-400">{absentCount}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-amber-300 text-sm font-medium mb-1">En attente</p>
                <p className="text-3xl font-bold text-amber-400">{flaggedCount}</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <p className="text-center text-zinc-400 py-8">Chargement...</p>
              ) : error ? (
                <p className="text-center text-red-400 py-8">{error}</p>
              ) : attendance.length === 0 ? (
                <p className="text-center text-zinc-400 py-8">Aucun enregistrement de présence</p>
              ) : (
                attendance.map((record) => (
                  <div
                    key={record.id || `student-${record.student_id}`}
                    className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    {record.photo_url && (
                      <img
                        src={record.photo_url}
                        alt={record.student_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-white">{record.student_name}</p>
                      <div className="flex gap-2 text-xs text-zinc-400 mt-1">
                        {record.face_confidence && (
                          <span>Confiance: {(record.face_confidence * 100).toFixed(0)}%</span>
                        )}
                        {record.liveness_passed && (
                          <span className="text-emerald-400">✓ Vivant</span>
                        )}
                        {record.location_verified && (
                          <span className="text-emerald-400">✓ Localisation OK</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {(record.status === 'present' || record.status === 'late') && (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm">Présent</span>
                        </div>
                      )}
                      {record.status === 'absent' && (
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle className="h-5 w-5" />
                          <span className="text-sm">Absent</span>
                        </div>
                      )}
                      {record.status === 'flagged' && (
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertCircle className="h-5 w-5" />
                          <span className="text-sm">En attente</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
              <Button variant="outline" onClick={onClose} disabled={isConfirming}>
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirming || attendance.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirmation en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmer la présence
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
