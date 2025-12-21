'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { QrCode, Camera, Lock, CheckCircle2, AlertCircle, LogOut, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRScanner from '@/components/common/QRScanner';
import { AttendanceDialog } from '@/components/AttendanceDialog';
import { LoadingOverlay } from '@/components/ui/spinner';

type TrainerSession = {
  id: number;
  title: string;
  class_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status?: string;
  students?: number;
};

type SessionStudent = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  class_name: string;
};

type SessionAttendanceRecord = {
  id: number;
  session_id: number;
  student_id: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_at?: string | null;
  justification?: string | null;
  percentage?: number | null;
};

interface StudentAttendance {
  studentId: number;
  name: string;
  status: 'unmarked' | 'present' | 'absent' | 'late' | 'excused';
  markedAt?: string;
  justification?: string;
  percentage?: number;
}

interface DialogState {
  open: boolean;
  studentId: number | null;
  studentName: string;
  status: 'absent' | 'late';
  defaultPercentage: number;
}

export default function MarkAttendance() {
  const router = useRouter();
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [markingMethod, setMarkingMethod] = useState<'qr' | 'facial' | 'pin' | null>(null);
  const [studentList, setStudentList] = useState<StudentAttendance[]>([]);
  const [markedStudents, setMarkedStudents] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    studentId: null,
    studentName: '',
    status: 'absent',
    defaultPercentage: 0,
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionsData = await apiClient<any[]>(`/api/trainer/sessions?page=1&limit=100`, {
        method: 'GET',
        useCache: false,
      });

      const mapped: TrainerSession[] = (sessionsData || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        class_name: s.class_name ?? '',
        date: s.date,
        start_time: String(s.start_time || '').slice(0, 5),
        end_time: String(s.end_time || '').slice(0, 5),
        status: s.status,
        students: s.students,
      }));
      setSessions(mapped);
      setError(null);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Échec du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionRoster = async (sessionId: number) => {
    setLoading(true);
    try {
      const [students, attendance] = await Promise.all([
        apiClient<SessionStudent[]>(`/api/trainer/sessions/${sessionId}/students`, {
          method: 'GET',
          useCache: false,
        }),
        apiClient<{ records: SessionAttendanceRecord[] }>(`/api/attendance/session/${sessionId}/all`, {
          method: 'GET',
          useCache: false,
        }),
      ]);

      const recordByStudent = new Map<number, SessionAttendanceRecord>();
      (attendance?.records || []).forEach((r) => recordByStudent.set(r.student_id, r));

      const list: StudentAttendance[] = (students || []).map((st) => {
        const rec = recordByStudent.get(st.id);
        return {
          studentId: st.id,
          name: `${st.first_name} ${st.last_name}`.trim() || st.email,
          status: rec?.status ?? 'unmarked',
          markedAt: rec?.marked_at ? new Date(rec.marked_at).toLocaleTimeString('fr-FR') : undefined,
          justification: rec?.justification ?? undefined,
          percentage: rec?.percentage ?? undefined,
        };
      });

      setStudentList(list);
      setMarkedStudents(new Set(list.filter((s) => s.status !== 'unmarked').map((s) => s.studentId)));
      setError(null);
    } catch (err) {
      console.error('Failed to load roster:', err);
      setError('Échec du chargement des étudiants');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (sessionId: number) => {
    setSelectedSession(sessionId);
    setMarkingMethod(null);
    setStudentList([]);
    setMarkedStudents(new Set());
    void loadSessionRoster(sessionId);
  };

  const handleStartMarking = async (method: 'qr' | 'facial' | 'pin') => {
    setMarkingMethod(method);
    if (method === 'qr') {
      setShowQRScanner(true);
    }
    if (selectedSession) {
      await loadSessionRoster(selectedSession);
    }
  };

  const handleQRScan = (data: string) => {
    // In a real system, this would map the QR code to a student
    console.log('QR Code scanned:', data);
    setShowQRScanner(false);
  };

  const persistAttendance = async (payload: {
    session_id: number;
    student_id: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    percentage?: number;
    justification?: string;
    marked_via?: string;
  }) => {
    await apiClient(`/api/attendance`, {
      method: 'POST',
      data: {
        ...payload,
        marked_via: payload.marked_via ?? 'manual',
        percentage: payload.percentage ?? (payload.status === 'present' ? 100 : 0),
      },
      useCache: false,
    });
  };

  const markPresent = async (studentId: number) => {
    if (!selectedSession) return;
    await persistAttendance({
      session_id: selectedSession,
      student_id: studentId,
      status: 'present',
      percentage: 100,
      marked_via: markingMethod ? `trainer_${markingMethod}` : 'manual',
    });

    setMarkedStudents(new Set([...markedStudents, studentId]));
    setStudentList((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              status: 'present',
              markedAt: new Date().toLocaleTimeString('fr-FR'),
              justification: undefined,
              percentage: 100,
            }
          : s,
      ),
    );
  };

  const markAbsent = (studentId: number) => {
    const student = studentList.find((s) => s.studentId === studentId);
    if (!student) return;

    setDialogState({
      open: true,
      studentId,
      studentName: student.name,
      status: 'absent',
      defaultPercentage: 0,
    });
  };

  const markLate = (studentId: number) => {
    const student = studentList.find((s) => s.studentId === studentId);
    if (!student) return;

    setDialogState({
      open: true,
      studentId,
      studentName: student.name,
      status: 'late',
      defaultPercentage: 75,
    });
  };

  const handleDialogSubmit = async (justification: string, percentage: number) => {
    if (!dialogState.studentId) return;

    if (selectedSession) {
      await persistAttendance({
        session_id: selectedSession,
        student_id: dialogState.studentId,
        status: dialogState.status,
        justification,
        percentage,
        marked_via: markingMethod ? `trainer_${markingMethod}` : 'manual',
      });
    }

    setMarkedStudents(new Set([...markedStudents, dialogState.studentId]));
    setStudentList((prev) =>
      prev.map((s) =>
        s.studentId === dialogState.studentId
          ? {
              ...s,
              status: dialogState.status,
              markedAt: new Date().toLocaleTimeString('fr-FR'),
              justification,
              percentage,
            }
          : s,
      ),
    );
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spa_access_token');
    }
    router.push('/auth/login');
  };

  const currentSession = sessions.find((s) => s.id === selectedSession);
  const filteredStudents = studentList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const attendanceRate =
    studentList.length > 0 ? Math.round((markedStudents.size / studentList.length) * 100) : 0;

  if (loading) {
    return <LoadingOverlay text="Chargement des séances..." />;
  }

  return (
    <div
      className="min-h-screen bg-dark px-6 py-10"
      role="main"
      aria-label="Page de marquage de présence"
    >
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/trainer"
            className="text-white/60 hover:text-white transition"
            aria-label="Retour au tableau de bord du formateur"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <p className="text-sm text-white/60">Marquer les présences</p>
            <h1 className="text-3xl font-bold">Pointage d'assistance</h1>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30"
          aria-label="Se déconnecter"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </header>

      {error && (
        <div
          className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-red-300 text-sm border border-red-500/20"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {!selectedSession ? (
        // Session Selection
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-lg">Sélectionnez une session</h2>
          </div>
          <div
            className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3"
            role="region"
            aria-label="Liste des sessions disponibles"
          >
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className="rounded-lg border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 hover:border-white/20 transition"
                aria-label={`Session: ${session.title}, Classe: ${session.class_name}, Date: ${new Date(session.date).toLocaleDateString('fr-FR')}`}
              >
                <p className="font-semibold">{session.title}</p>
                <p className="text-sm text-white/60">{session.class_name}</p>
                <p className="mt-2 text-xs text-white/50">
                  {new Date(session.date).toLocaleDateString('fr-FR')}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {session.start_time} - {session.end_time}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : !markingMethod ? (
        // Method Selection
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{currentSession?.title}</p>
                <p className="text-white/60">{currentSession?.class_name}</p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-white/60 hover:text-white transition"
                aria-label="Retour à la sélection de session"
              >
                ✕
              </button>
            </div>

            <h2 className="mb-6 font-semibold text-lg">Choisissez la méthode de pointage</h2>
            <div
              className="grid gap-4 md:grid-cols-3"
              aria-label="Méthodes de marquage de présence"
            >
              {/* QR Code Method */}
              <button
                onClick={() => handleStartMarking('qr')}
                className="rounded-lg border-2 border-white/10 bg-white/5 p-6 hover:border-blue-500/50 hover:bg-blue-500/10 transition"
                aria-label="Code QR: Scannez les codes QR des étudiants"
              >
                <QrCode className="mx-auto mb-3 text-blue-300" size={32} />
                <h3 className="font-semibold">Code QR</h3>
                <p className="mt-2 text-sm text-white/60">Scanner les codes QR des étudiants</p>
              </button>

              {/* Facial Recognition Method */}
              <button
                onClick={() => handleStartMarking('facial')}
                className="rounded-lg border-2 border-white/10 bg-white/5 p-6 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition"
                aria-label="Reconnaissance faciale: Utilisez la caméra pour reconnaître les visages"
              >
                <Camera className="mx-auto mb-3 text-emerald-300" size={32} />
                <h3 className="font-semibold">Reconnaissance faciale</h3>
                <p className="mt-2 text-sm text-white/60">
                  Utiliser la caméra pour reconnaître les visages
                </p>
              </button>

              {/* PIN Method */}
              <button
                onClick={() => handleStartMarking('pin')}
                className="rounded-lg border-2 border-white/10 bg-white/5 p-6 hover:border-amber-500/50 hover:bg-amber-500/10 transition"
                aria-label="Code PIN: Entrez les codes PIN des étudiants"
              >
                <Lock className="mx-auto mb-3 text-amber-300" size={32} />
                <h3 className="font-semibold">Code PIN</h3>
                <p className="mt-2 text-sm text-white/60">Entrer les codes PIN des étudiants</p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Attendance Marking Interface
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{currentSession?.title}</p>
                <p className="text-white/60">
                  Méthode:{' '}
                  {markingMethod === 'qr'
                    ? 'Code QR'
                    : markingMethod === 'facial'
                      ? 'Reconnaissance faciale'
                      : 'Code PIN'}
                </p>
              </div>
              <button
                onClick={() => setMarkingMethod(null)}
                className="text-white/60 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex items-end gap-4">
              <div>
                <p className="text-4xl font-bold text-emerald-300">{attendanceRate}%</p>
                <p className="text-white/60 text-sm">Marqués</p>
              </div>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <progress
                  value={attendanceRate}
                  max={100}
                  className="h-2 w-full appearance-none [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:bg-emerald-400 [&::-moz-progress-bar]:bg-emerald-400"
                  aria-label="Progression du pointage"
                />
              </div>
              <p className="text-white/60 text-sm">
                {markedStudents.size}/{studentList.length} étudiants
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <input
              type="text"
              placeholder="Rechercher un étudiant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Student List */}
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-lg">Liste des étudiants</h2>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {filteredStudents.map((student) => (
                <div
                  key={student.studentId}
                  className={`px-6 py-4 flex items-center justify-between ${
                    student.status === 'unmarked' ? '' : 'bg-white/5'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{student.name}</p>
                    {student.markedAt && (
                      <p className="text-xs text-white/50">Marqué à: {student.markedAt}</p>
                    )}
                    {student.justification && (
                      <p className="text-xs text-white/60">
                        Justification: {student.justification}
                      </p>
                    )}
                    {student.percentage !== undefined && (
                      <p className="text-xs text-white/60">Pourcentage: {student.percentage}%</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {student.status === 'unmarked' ? (
                      <>
                        <button
                          onClick={() => markPresent(student.studentId)}
                          className="px-3 py-1 text-sm font-medium rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                        >
                          Présent
                        </button>
                        <button
                          onClick={() => markLate(student.studentId)}
                          className="px-3 py-1 text-sm font-medium rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
                        >
                          Retard
                        </button>
                        <button
                          onClick={() => markAbsent(student.studentId)}
                          className="px-3 py-1 text-sm font-medium rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                        >
                          Absent
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <StatusBadge status={student.status} />
                        <CheckCircle2 size={20} className="text-emerald-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary and Actions */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex gap-4">
            <button
              onClick={() => setMarkingMethod(null)}
              className="flex-1 rounded-lg border border-white/20 px-4 py-3 text-white hover:bg-white/5 transition"
            >
              Changer de méthode
            </button>
            <button
              onClick={() => setSelectedSession(null)}
              className="flex-1 rounded-lg bg-emerald-500/20 text-emerald-300 px-4 py-3 hover:bg-emerald-500/30 transition font-medium"
            >
              Terminer le pointage
            </button>
          </div>
        </div>
      )}

      {showQRScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />}

      <AttendanceDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ ...dialogState, open })}
        studentName={dialogState.studentName}
        status={dialogState.status}
        defaultPercentage={dialogState.defaultPercentage}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    present: 'bg-emerald-400/20 text-emerald-300',
    absent: 'bg-rose-400/20 text-rose-300',
    late: 'bg-amber-400/20 text-amber-300',
    excused: 'bg-blue-400/20 text-blue-300',
  };
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors['present']}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
