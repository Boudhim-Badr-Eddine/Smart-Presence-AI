'use client';
export const dynamic = 'force-dynamic';
import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import SessionRequestModal from '@/components/SessionRequestModal';
import AttendanceDetailsModal from '@/components/AttendanceDetailsModal';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronRight,
  MessageSquare,
  NotebookPen,
  Send,
  Play,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

type Session = {
  id: number;
  title: string;
  class_name: string;
  date: string;
  start_time: string;
  end_time: string;
  students: number;
  attendance_rate?: number;
  is_active?: boolean;
  is_requested?: boolean;
};

type SessionNote = {
  id: number;
  session_id: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
};

export default function TrainerSessionsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterClass, setFilterClass] = useState<string | null>(null);
  const [noteModalSession, setNoteModalSession] = useState<Session | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [showSessionRequestModal, setShowSessionRequestModal] = useState(false);
  const [selectedSessionForRequest, setSelectedSessionForRequest] = useState<Session | null>(null);
  const [detailsModalSession, setDetailsModalSession] = useState<number | null>(null);
  const [activatingSessionId, setActivatingSessionId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const {
    data: sessionsData,
    isError: isSessionsError,
    isLoading: isSessionsLoading,
    error: sessionsError,
    isEnabled: isSessionsEnabled,
  } = useQuery({
    queryKey: ['trainer-sessions'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!user && !!localStorage.getItem('spa_access_token'),
    queryFn: async () => {
      try {
        const res = await apiClient<any[]>(`/api/trainer/sessions?page=1&limit=100`, {
          method: 'GET',
          useCache: false,
        });

        return (res || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          class_name: s.class_name ?? '',
          date: s.date,
          start_time: String(s.start_time || '').slice(0, 5),
          end_time: String(s.end_time || '').slice(0, 5),
          students: s.students ?? 0,
          attendance_rate: s.attendance_rate,
          is_active: s.is_active ?? false,
        })) as Session[];
      } catch (err: any) {
        console.error('Failed to fetch trainer sessions:', err);
        throw err;
      }
    },
  });

  const { data: notesData } = useQuery({
    queryKey: ['trainer-session-notes'],
    queryFn: async () => {
      const res = await apiClient<any[]>(`/api/trainer/session-notes`, {
        method: 'GET',
        useCache: false,
      });

      const items: SessionNote[] = (res || []).map((n: any) => ({
        id: n.id,
        session_id: n.session_id,
        title: n.title,
        content: n.notes ?? n.content ?? '',
        created_by: 'Vous',
        created_at: n.date ? new Date(n.date).toISOString() : new Date().toISOString(),
      }));
      return { items };
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (payload: { session_id: number; notes: string }) => {
      return apiClient(`/api/trainer/session-notes`, {
        method: 'POST',
        data: payload,
        useCache: false,
      });
    },
    // Optimistic update keeps the UI responsive while awaiting any backend
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['trainer-session-notes'] });
      const previous = queryClient.getQueryData<{ items: SessionNote[] }>([
        'trainer-session-notes',
      ]);
      const optimistic: SessionNote = {
        id: payload.session_id,
        session_id: payload.session_id,
        title: getSessionTitle(payload.session_id),
        content: payload.notes,
        created_by: 'Vous',
        created_at: new Date().toISOString(),
      };

      const nextItems = [
        optimistic,
        ...((previous?.items ?? []).filter((n) => n.session_id !== payload.session_id) || []),
      ];
      queryClient.setQueryData(['trainer-session-notes'], {
        items: nextItems,
      });
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['trainer-session-notes'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-session-notes'] });
    },
  });

  const activationMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return apiClient(`/api/trainer/activate-session?session_id=${sessionId}`, {
        method: 'POST',
        useCache: false,
      });
    },
    onMutate: (sessionId) => {
      setActivatingSessionId(sessionId);
    },
    onSettled: () => {
      setActivatingSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
    },
  });

  const isSavingNote = addNoteMutation.status === 'pending';

  const sessions: Session[] = useMemo(() => sessionsData ?? [], [sessionsData]);
  const notes = notesData?.items ?? [];

  const classes = [...new Set(sessions.map((s) => s.class_name).filter(Boolean))];

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesSearch =
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.class_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !filterClass || session.class_name === filterClass;
      return matchesSearch && matchesClass;
    });
  }, [searchQuery, filterClass, sessions]);

  const upcomingSessions = filteredSessions.filter((s) => new Date(s.date) > new Date());
  const pastSessions = filteredSessions.filter((s) => new Date(s.date) <= new Date());

  const getNotesForSession = (sessionId: number) => notes.filter((n) => n.session_id === sessionId);
  const getSessionTitle = (sessionId: number) =>
    sessions.find((s) => s.id === sessionId)?.title ?? 'Session';

  const handleOpenNoteModal = (session: Session) => {
    setNoteModalSession(session);
    setNoteContent(getNotesForSession(session.id)[0]?.content ?? '');
  };

  const handleSubmitNote = async () => {
    if (!noteModalSession || !noteContent.trim()) return;
    await addNoteMutation.mutateAsync({ session_id: noteModalSession.id, notes: noteContent.trim() });
    setNoteModalSession(null);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette session?')) {
      // Handle deletion
      console.log('Deleting session:', id);
    }
  };

  return (
    <RoleGuard allow={['trainer']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[
            { label: 'Tableau de bord formateur', href: '/trainer' },
            { label: 'Mes sessions' },
          ]}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
              Mes sessions
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Gérez vos sessions et pointages
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition dark:bg-blue-600 dark:hover:bg-blue-700 light:bg-blue-500 light:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Créer une session
          </button>
        </div>

        {isSessionsError && !isSessionsLoading && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-start justify-between">
            <div>
              <p className="font-semibold mb-1">Erreur</p>
              <p>Impossible de charger vos sessions. Vérifiez votre connexion et réessayez.</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs whitespace-nowrap"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Chercher par titre ou classe..."
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white placeholder-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500 light:border-gray-300 light:bg-white light:text-gray-900 light:placeholder-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <select
                aria-label="Filtrer par classe"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
                value={filterClass || ''}
                onChange={(e) => setFilterClass(e.target.value || null)}
              >
                <option value="">Toutes les classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
              Sessions à venir
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingSessions.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white p-6 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
                        {session.title}
                      </h3>
                      <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                        {session.class_name}
                                          <div className="flex items-center gap-2">
                                            {session.is_active ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                                Activée
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                                                Désactivée
                                              </span>
                                            )}
                                          </div>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        aria-label="Modifier la session"
                        className="p-1 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-gray-700 transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Supprimer la session"
                        onClick={() => handleDelete(session.id)}
                        className="p-1 text-zinc-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {new Date(session.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {session.start_time} - {session.end_time}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>{session.students} étudiants</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => {
                        setSelectedSessionForRequest(session);
                        setShowSessionRequestModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 font-medium text-blue-300 hover:bg-blue-600/30 transition text-xs"
                      title="Demander une session à l'administrateur"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Demander
                    </button>
                    <button 
                      onClick={() => activationMutation.mutate(session.id)}
                      disabled={activatingSessionId === session.id || session.is_active}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 px-4 py-2 font-medium text-emerald-300 hover:bg-emerald-600/30 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Activer la présence pour cette session"
                    >
                      {activatingSessionId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : session.is_active ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {activatingSessionId === session.id
                        ? 'Activation...'
                        : session.is_active
                          ? 'Activée'
                          : 'Désactivée'}
                    </button>
                    <button 
                      onClick={() => setDetailsModalSession(session.id)}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600/20 px-4 py-2 font-medium text-purple-300 hover:bg-purple-600/30 transition text-xs"
                      title="Voir les détails de présence"
                    >
                      <Eye className="h-4 w-4" />
                      Détails
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <button
                      onClick={() => handleOpenNoteModal(session)}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600/20 px-4 py-2 font-medium text-orange-300 hover:bg-orange-600/30 transition"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Notes ({getNotesForSession(session.id).length})
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
              Sessions passées
            </h2>
            <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden">
              <div className="divide-y divide-white/5 dark:divide-white/5 light:divide-gray-200">
                {pastSessions.map((session, idx) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between px-6 py-4 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition"
                  >
                    <div>
                      <p className="font-medium text-white dark:text-white light:text-gray-900">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.start_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.students} étudiants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.attendance_rate !== undefined && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                            {session.attendance_rate}%
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                            Présence
                                                {session.is_active ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                                    Activée
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                                                    Désactivée
                                                  </span>
                                                )}
                          </p>
                        </div>
                      )}
                      <button 
                        onClick={() => activationMutation.mutate(session.id)}
                        disabled={activatingSessionId === session.id || session.is_active}
                        className="rounded border border-emerald-500/20 bg-emerald-600/20 px-3 py-1 text-sm font-medium text-emerald-300 hover:bg-emerald-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {activatingSessionId === session.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : session.is_active ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {activatingSessionId === session.id
                          ? 'Activation...'
                          : session.is_active
                            ? 'Activée'
                            : 'Désactivée'}
                      </button>
                      <button 
                        onClick={() => setDetailsModalSession(session.id)}
                        className="rounded border border-white/10 dark:border-white/10 light:border-gray-300 px-3 py-1 text-sm text-white dark:text-white light:text-gray-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-100 transition"
                      >
                        Détails
                      </button>
                      <button
                        onClick={() => handleOpenNoteModal(session)}
                        className="rounded border border-orange-500/20 bg-orange-600/20 px-3 py-1 text-sm font-medium text-orange-300 hover:bg-orange-600/30 transition"
                      >
                        Notes ({getNotesForSession(session.id).length})
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Notes */}
        {notes.length > 0 && (
          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
                  Notes récentes
                </h3>
              </div>
              <p className="text-xs text-zinc-400">{notes.length} notes</p>
            </div>
            <div className="divide-y divide-white/5 dark:divide-white/5 light:divide-gray-200">
              {notes.slice(0, 4).map((note) => (
                <div key={note.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900">
                        {note.title}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        {getSessionTitle(note.session_id)}
                      </p>
                      <p className="mt-2 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700 whitespace-pre-line">
                        {note.content}
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>{new Date(note.created_at).toLocaleDateString('fr-FR')}</p>
                      <p className="mt-1">Par {note.created_by}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredSessions.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white p-8 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mb-4">
              Aucune session trouvée
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition dark:bg-blue-600 dark:hover:bg-blue-700 light:bg-blue-500 light:hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              Créer une session
            </button>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {noteModalSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/10 p-6 dark:border-white/10 dark:bg-white/10 light:border-gray-300 light:bg-white"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Notes de session</p>
                <h3 className="text-xl font-semibold text-white dark:text-white light:text-gray-900">
                  {noteModalSession.title}
                </h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  {noteModalSession.class_name} •{' '}
                  {new Date(noteModalSession.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => setNoteModalSession(null)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <NotebookPen className="h-4 w-4 text-emerald-300" />
                  <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900">
                    Ajouter une note
                  </p>
                </div>
                <textarea
                  placeholder="Ajoutez des notes sur le déroulement, les actions à suivre, les étudiants à surveiller..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
                />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSubmitNote}
                    disabled={isSavingNote || !noteContent.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Enregistrer la note
                  </button>
                  <button
                    onClick={() => setNoteModalSession(null)}
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 dark:hover:bg-white/10 light:text-gray-900 light:border-gray-300 light:hover:bg-gray-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-gray-50 max-h-80 overflow-y-auto">
                <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900 mb-3">
                  Notes existantes
                </p>
                <div className="space-y-3">
                  {getNotesForSession(noteModalSession.id).length > 0 ? (
                    getNotesForSession(noteModalSession.id).map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-white/10 bg-white/5 p-3 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900">
                            {note.title}
                          </p>
                          <span className="text-xs text-zinc-500">
                            {new Date(note.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700 whitespace-pre-line">
                          {note.content}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">Par {note.created_by}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-zinc-400 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
                      Aucune note pour cette session. Ajoutez vos observations pour garder une
                      trace.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 dark:bg-white/10 light:bg-white border border-white/10 dark:border-white/10 light:border-gray-300 rounded-xl p-6 max-w-md w-full mx-4"
          >
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
              Créer une session
            </h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mb-6">
              La création de sessions se fait via l'espace Admin.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full rounded-lg border border-white/20 px-4 py-2 text-white dark:text-white light:text-gray-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-100 transition"
            >
              Fermer
            </button>
          </motion.div>
        </div>
      )}

      {/* Session Request Modal */}
      <SessionRequestModal
        isOpen={showSessionRequestModal}
        onClose={() => {
          setShowSessionRequestModal(false);
          setSelectedSessionForRequest(null);
        }}
        onSuccess={() => {
          setShowSessionRequestModal(false);
          setSelectedSessionForRequest(null);
          queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
        }}
        session={selectedSessionForRequest}
      />

      {/* Attendance Details Modal */}
      <AttendanceDetailsModal
        isOpen={!!detailsModalSession}
        sessionId={detailsModalSession}
        sessionTitle={
          sessionsData?.find((s) => s.id === detailsModalSession)?.title || 'Session'
        }
        onClose={() => setDetailsModalSession(null)}
        onConfirm={() => {
          setDetailsModalSession(null);
          queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
        }}
      />
    </RoleGuard>
  );
}
