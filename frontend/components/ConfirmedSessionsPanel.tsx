'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Loader2,
  Download,
  Eye,
} from 'lucide-react';

interface ConfirmedSession {
  id: number;
  title: string;
  class_name: string;
  date: string;
  trainer_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  confirmed_at: string;
}

interface StudentRecord {
  student_name: string;
  status: 'present' | 'absent' | 'late';
  face_confidence?: number;
}

export default function ConfirmedSessionsPanel() {
  const [sessions, setSessions] = useState<ConfirmedSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ConfirmedSession | null>(null);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadConfirmedSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('spa_access_token') : null;
        console.log('[ConfirmedSessionsPanel] Token check:', { hasToken: !!token, loadAttempt });
        
        if (!token) {
          console.log('[ConfirmedSessionsPanel] No token, skipping fetch');
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        console.log('[ConfirmedSessionsPanel] Fetching from /api/admin/confirmed-sessions');
        const data = await apiClient<ConfirmedSession[]>(
          '/api/admin/confirmed-sessions?limit=50',
          { method: 'GET', useCache: false }
        );
        
        console.log('[ConfirmedSessionsPanel] Response received:', { 
          type: typeof data,
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : 'N/A',
          data: data
        });
        
        if (mounted) {
          setSessions(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err: any) {
        console.error('[ConfirmedSessionsPanel] Error:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
        
        if (mounted) {
          setError(err.message || 'Failed to load confirmed sessions');
          setSessions([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Delay to ensure token is available
    const timer = setTimeout(() => {
      loadConfirmedSessions();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [loadAttempt]);

  const loadSessionDetails = async (sessionId: number) => {
    try {
      setIsLoadingRecords(true);
      const data = await apiClient<StudentRecord[]>(
        `/api/admin/confirmed-session-details?session_id=${sessionId}`,
        { method: 'GET', useCache: false }
      );
      setStudentRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading session details:', err);
      setStudentRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleViewDetails = (session: ConfirmedSession) => {
    setSelectedSession(session);
    loadSessionDetails(session.id);
  };

  const handleDownloadReport = async (sessionId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/session-attendance-report?session_id=${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('spa_access_token')}`,
          },
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${sessionId}.csv`;
        a.click();
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-500" />
          Sessions Confirmées avec Présence
        </h2>
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Sessions Confirmées avec Présence
          </h2>
          <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
            {sessions.length} sessions
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={() => setLoadAttempt(a => a + 1)}
              className="ml-2 px-2 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-xs"
            >
              Réessayer
            </button>
          </div>
        )}

        {!sessions || sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            {error ? 'Erreur lors du chargement' : 'Aucune session confirmée pour le moment'}
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-lg border border-white/10 bg-white/2 p-4 hover:bg-white/5 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-2">{session.title}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 mb-3">
                    <div>
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {session.date}
                    </div>
                    <div>{session.class_name}</div>
                    <div>Formateur: {session.trainer_name}</div>
                    <div>Confirmée: {new Date(session.confirmed_at).toLocaleTimeString()}</div>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-emerald-300">
                        {session.present_count} présents
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="text-red-300">
                        {session.absent_count} absents
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Users className="h-4 w-4" />
                      <span>{session.total_students} étudiants</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(session)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadReport(session.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSession?.title}</DialogTitle>
          </DialogHeader>

          {isLoadingRecords ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-emerald-300 text-sm">Présents</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {studentRecords.filter(r => r.status === 'present' || r.status === 'late').length}
                  </p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-red-300 text-sm">Absents</p>
                  <p className="text-2xl font-bold text-red-400">
                    {studentRecords.filter(r => r.status === 'absent').length}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {studentRecords.length === 0 ? (
                  <p className="text-center text-zinc-400 py-4">Aucun enregistrement</p>
                ) : (
                  studentRecords.map((record, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/2 p-3"
                    >
                      <span className="text-white">{record.student_name}</span>
                      <div className="flex items-center gap-3">
                        {record.face_confidence && (
                          <span className="text-xs text-zinc-400">
                            {(record.face_confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {(record.status === 'present' || record.status === 'late') ? (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Présent</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-400">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Absent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
