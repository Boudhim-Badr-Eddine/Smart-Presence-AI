"use client";
export const dynamic = 'force-dynamic';
import RoleGuard from "@/components/auth/RoleGuard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, Plus, Edit2, Trash2, Search, Filter, ChevronRight, MessageSquare, NotebookPen, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getApiBase } from "@/lib/config";

type Session = {
  id: number;
  title: string;
  class_name: string;
  date: string;
  start_time: string;
  end_time: string;
  students: number;
  attendance_rate?: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterClass, setFilterClass] = useState<string | null>(null);
  const [noteModalSession, setNoteModalSession] = useState<Session | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const queryClient = useQueryClient();
  const apiBase = getApiBase();

  const { data: sessionsData } = useQuery({
    queryKey: ["trainer-sessions"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/trainer/sessions`).catch(() => ({
        data: [
          { id: 1, title: "Développement Web I", class_name: "L3-Dev-A", date: "2025-12-15", start_time: "09:00", end_time: "11:00", students: 24, attendance_rate: 92 },
          { id: 2, title: "Base de Données", class_name: "L3-Dev-B", date: "2025-12-16", start_time: "14:00", end_time: "16:00", students: 28, attendance_rate: 85 },
          { id: 3, title: "Développement Web II", class_name: "L3-Dev-A", date: "2025-12-17", start_time: "09:00", end_time: "11:00", students: 24, attendance_rate: 88 },
          { id: 4, title: "Sécurité Informatique", class_name: "L3-Sec", date: "2025-12-18", start_time: "13:00", end_time: "15:00", students: 20, attendance_rate: 95 },
          { id: 5, title: "Cloud Computing", class_name: "L3-Dev-B", date: "2025-12-19", start_time: "10:00", end_time: "12:00", students: 28, attendance_rate: 79 },
        ],
      }));
      return res.data as Session[];
    },
  });

  const { data: notesData } = useQuery({
    queryKey: ["trainer-session-notes"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/trainer/session-notes`).catch(() => ({
        data: {
          items: [
            { id: 101, session_id: 1, title: "Préparer le TD", content: "Ajouter un exercice sur les hooks avant la séance.", created_by: "Vous", created_at: new Date().toISOString() },
            { id: 102, session_id: 2, title: "Rappel SQL", content: "Insister sur les jointures et clés étrangères.", created_by: "Vous", created_at: new Date().toISOString() },
            { id: 103, session_id: 3, title: "Suivi étudiants", content: "Planifier un rattrapage pour les absents chroniques.", created_by: "Vous", created_at: new Date().toISOString() },
          ],
        },
      }));
      return res.data as { items: SessionNote[] };
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (payload: { session_id: number; title: string; content: string }) => {
      return axios.post(`${apiBase}/api/trainer/session-notes`, payload);
    },
    // Optimistic update keeps the UI responsive while awaiting any backend
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["trainer-session-notes"] });
      const previous = queryClient.getQueryData<{ items: SessionNote[] }>(["trainer-session-notes"]);
      const optimistic: SessionNote = {
        id: Date.now(),
        session_id: payload.session_id,
        title: payload.title || "Note",
        content: payload.content,
        created_by: "Vous",
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(["trainer-session-notes"], {
        items: [optimistic, ...(previous?.items ?? [])],
      });
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["trainer-session-notes"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-session-notes"] });
    },
  });

  const isSavingNote = addNoteMutation.status === "pending";

  const sessions: Session[] = useMemo(() => sessionsData ?? [], [sessionsData]);
  const notes = notesData?.items ?? [];

  const classes = [...new Set(sessions.map(s => s.class_name))];

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.class_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !filterClass || session.class_name === filterClass;
      return matchesSearch && matchesClass;
    });
  }, [searchQuery, filterClass, sessions]);

  const upcomingSessions = filteredSessions.filter(s => new Date(s.date) > new Date());
  const pastSessions = filteredSessions.filter(s => new Date(s.date) <= new Date());

  const getNotesForSession = (sessionId: number) => notes.filter((n) => n.session_id === sessionId);
  const getSessionTitle = (sessionId: number) => sessions.find((s) => s.id === sessionId)?.title ?? "Session";

  const handleOpenNoteModal = (session: Session) => {
    setNoteModalSession(session);
    setNoteTitle("");
    setNoteContent("");
  };

  const handleSubmitNote = async () => {
    if (!noteModalSession || !noteContent.trim()) return;
    await addNoteMutation.mutateAsync({
      session_id: noteModalSession.id,
      title: noteTitle || noteModalSession.title,
      content: noteContent.trim(),
    });
    setNoteModalSession(null);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette session?")) {
      // Handle deletion
      console.log("Deleting session:", id);
    }
  };

  return (
    <RoleGuard allow={["trainer"]}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[
            { label: "Tableau de bord formateur", href: "/trainer" },
            { label: "Mes sessions" },
          ]}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">Mes sessions</h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Gérez vos sessions et pointages</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition dark:bg-blue-600 dark:hover:bg-blue-700 light:bg-blue-500 light:hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Créer une session
          </button>
        </div>

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
                value={filterClass || ""}
                onChange={(e) => setFilterClass(e.target.value || null)}
              >
                <option value="">Toutes les classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">Sessions à venir</h2>
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
                      <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">{session.title}</h3>
                      <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">{session.class_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button aria-label="Modifier la session" className="p-1 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-gray-700 transition">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button aria-label="Supprimer la session" onClick={() => handleDelete(session.id)} className="p-1 text-zinc-400 hover:text-red-400 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>{session.start_time} - {session.end_time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>{session.students} étudiants</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 font-medium text-blue-300 hover:bg-blue-600/30 transition">
                      <ChevronRight className="h-4 w-4" />
                      Pointer
                    </button>
                    <button
                      onClick={() => handleOpenNoteModal(session)}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 px-4 py-2 font-medium text-emerald-300 hover:bg-emerald-600/30 transition"
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
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">Sessions passées</h2>
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
                      <p className="font-medium text-white dark:text-white light:text-gray-900">{session.title}</p>
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
                          <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">{session.attendance_rate}%</p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">Présence</p>
                        </div>
                      )}
                      <button className="rounded border border-white/10 dark:border-white/10 light:border-gray-300 px-3 py-1 text-sm text-white dark:text-white light:text-gray-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-100 transition">
                        Détails
                      </button>
                      <button
                        onClick={() => handleOpenNoteModal(session)}
                        className="rounded border border-emerald-500/20 bg-emerald-600/20 px-3 py-1 text-sm font-medium text-emerald-300 hover:bg-emerald-600/30 transition"
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
                <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">Notes récentes</h3>
              </div>
              <p className="text-xs text-zinc-400">{notes.length} notes</p>
            </div>
            <div className="divide-y divide-white/5 dark:divide-white/5 light:divide-gray-200">
              {notes.slice(0, 4).map((note) => (
                <div key={note.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900">{note.title}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">{getSessionTitle(note.session_id)}</p>
                      <p className="mt-2 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700 whitespace-pre-line">{note.content}</p>
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
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mb-4">Aucune session trouvée</p>
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
                <h3 className="text-xl font-semibold text-white dark:text-white light:text-gray-900">{noteModalSession.title}</h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">{noteModalSession.class_name} • {new Date(noteModalSession.date).toLocaleDateString('fr-FR')}</p>
              </div>
              <button onClick={() => setNoteModalSession(null)} className="text-white/60 hover:text-white">✕</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <NotebookPen className="h-4 w-4 text-emerald-300" />
                  <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900">Ajouter une note</p>
                </div>
                <input
                  type="text"
                  placeholder="Titre (optionnel)"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
                />
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
                <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900 mb-3">Notes existantes</p>
                <div className="space-y-3">
                  {getNotesForSession(noteModalSession.id).length > 0 ? (
                    getNotesForSession(noteModalSession.id).map((note) => (
                      <div key={note.id} className="rounded-lg border border-white/10 bg-white/5 p-3 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900">{note.title}</p>
                          <span className="text-xs text-zinc-500">{new Date(note.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700 whitespace-pre-line">{note.content}</p>
                        <p className="mt-2 text-xs text-zinc-500">Par {note.created_by}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-zinc-400 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
                      Aucune note pour cette session. Ajoutez vos observations pour garder une trace.
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
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">Créer une session</h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mb-6">Formulaire de création à implémenter</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full rounded-lg border border-white/20 px-4 py-2 text-white dark:text-white light:text-gray-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-100 transition"
            >
              Fermer
            </button>
          </motion.div>
        </div>
      )}
    </RoleGuard>
  );
}
