'use client';
export const dynamic = 'force-dynamic';
import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  BarChart3,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';
import { getApiBase } from '@/lib/config';
import { getWebSocketManager } from '@/lib/websocket';
import OnboardingTour from '@/components/OnboardingTour';

type AttendanceRecord = {
  id: number;
  student: string;
  email: string;
  session: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  date: string;
  percentage?: number;
  justification?: {
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    submitted_at: string;
    admin_comment?: string;
  };
};

export default function TrainerAttendancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterSession, setFilterSession] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const queryClient = useQueryClient();
  const apiBase = getApiBase();

  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsub = ws.subscribe('attendance_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-attendance'] });
    });
    return () => unsub();
  }, [queryClient]);

  const { data } = useQuery({
    queryKey: ['trainer-attendance'],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/trainer/attendance`).catch(() => ({
        data: {
          items: [
            {
              id: 1,
              student: 'Mohamed Alaoui',
              email: 'mohamed@example.com',
              session: 'Dev Web',
              status: 'present',
              date: '2025-12-12',
              percentage: 100,
            },
            {
              id: 2,
              student: 'Sara Bennani',
              email: 'sara@example.com',
              session: 'Dev Web',
              status: 'absent',
              date: '2025-12-12',
              percentage: 0,
              justification: {
                status: 'pending',
                reason: 'Maladie, certificat envoyé.',
                submitted_at: '2025-12-12T07:30:00Z',
              },
            },
            {
              id: 3,
              student: 'Youssef Amrani',
              email: 'youssef@example.com',
              session: 'Dev Web',
              status: 'late',
              date: '2025-12-12',
              percentage: 75,
              justification: {
                status: 'pending',
                reason: 'Transport en grève',
                submitted_at: '2025-12-12T08:00:00Z',
              },
            },
            {
              id: 4,
              student: 'Ahmed Ben Ali',
              email: 'ahmed@example.com',
              session: 'Database',
              status: 'present',
              date: '2025-12-13',
              percentage: 100,
            },
            {
              id: 5,
              student: 'Fatima Zahra',
              email: 'fatima@example.com',
              session: 'Database',
              status: 'excused',
              date: '2025-12-13',
              percentage: 50,
              justification: {
                status: 'approved',
                reason: 'Déplacement administratif',
                submitted_at: '2025-12-11T18:00:00Z',
                admin_comment: 'Document reçu',
              },
            },
            {
              id: 6,
              student: 'Karim El Khabazi',
              email: 'karim@example.com',
              session: 'Dev Web',
              status: 'present',
              date: '2025-12-14',
              percentage: 100,
            },
          ],
        },
      }));
      return res.data as { items: AttendanceRecord[] };
    },
  });

  const attendanceRecords = useMemo(() => data?.items ?? [], [data?.items]);
  const sessions = [...new Set(attendanceRecords.map((r) => r.session))];
  const pendingJustifications = attendanceRecords.filter(
    (r) => r.justification?.status === 'pending',
  );

  const updateJustification = useMutation({
    mutationFn: async (payload: {
      id: number;
      status: 'approved' | 'rejected';
      admin_comment?: string;
    }) => {
      return axios.patch(`${apiBase}/api/trainer/attendance/${payload.id}/justification`, payload);
    },
    // Optimistic update so the UI responds instantly
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['trainer-attendance'] });
      const previous = queryClient.getQueryData<{ items: AttendanceRecord[] }>([
        'trainer-attendance',
      ]);
      queryClient.setQueryData(['trainer-attendance'], {
        items: (previous?.items ?? []).map((record) =>
          record.id === payload.id
            ? {
                ...record,
                justification: {
                  ...(record.justification ?? {
                    reason: '',
                    submitted_at: new Date().toISOString(),
                  }),
                  status: payload.status,
                  admin_comment: payload.admin_comment ?? record.justification?.admin_comment,
                },
              }
            : record,
        ),
      });
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['trainer-attendance'], context.previous);
      }
    },
    onSuccess: () => {
      setSelectedRecord(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-attendance'] });
    },
  });

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const matchesSearch =
        record.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !filterStatus || record.status === filterStatus;
      const matchesSession = !filterSession || record.session === filterSession;
      return matchesSearch && matchesStatus && matchesSession;
    });
  }, [attendanceRecords, searchQuery, filterStatus, filterSession]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'late':
        return <Clock className="h-5 w-5 text-amber-400" />;
      case 'excused':
        return <Clock className="h-5 w-5 text-blue-400" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Présent';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Retard';
      case 'excused':
        return 'Excusé';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-600/20 text-emerald-300';
      case 'absent':
        return 'bg-red-600/20 text-red-300';
      case 'late':
        return 'bg-amber-600/20 text-amber-300';
      case 'excused':
        return 'bg-blue-600/20 text-blue-300';
      default:
        return 'bg-zinc-600/20 text-zinc-300';
    }
  };

  const getJustificationColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-600/20 text-emerald-300';
      case 'rejected':
        return 'bg-red-600/20 text-red-300';
      case 'pending':
        return 'bg-purple-600/20 text-purple-300';
      default:
        return 'bg-zinc-600/20 text-zinc-300';
    }
  };

  const getJustificationLabel = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'Justification acceptée';
      case 'rejected':
        return 'Justification refusée';
      case 'pending':
        return 'Justification en attente';
      default:
        return 'Aucune justification';
    }
  };

  const stats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter((r) => r.status === 'present').length,
    absent: attendanceRecords.filter((r) => r.status === 'absent').length,
    late: attendanceRecords.filter((r) => r.status === 'late').length,
    excused: attendanceRecords.filter((r) => r.status === 'excused').length,
    pending: pendingJustifications.length,
  };

  return (
    <RoleGuard allow={['trainer']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[
            { label: 'Tableau de bord formateur', href: '/trainer' },
            { label: 'Suivi des présences' },
          ]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Suivi des présences
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Consultez et gérez les présences des étudiants
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-blue-600/20 text-blue-300' },
            {
              label: 'Présents',
              value: stats.present,
              color: 'bg-emerald-600/20 text-emerald-300',
              icon: CheckCircle,
            },
            {
              label: 'Absents',
              value: stats.absent,
              color: 'bg-red-600/20 text-red-300',
              icon: XCircle,
            },
            {
              label: 'Retard',
              value: stats.late,
              color: 'bg-amber-600/20 text-amber-300',
              icon: Clock,
            },
            {
              label: 'Excusés',
              value: stats.excused,
              color: 'bg-blue-600/20 text-blue-300',
              icon: Clock,
            },
            {
              label: 'Justif. en attente',
              value: stats.pending,
              color: 'bg-purple-600/20 text-purple-300',
              icon: FileText,
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className={`rounded-lg border border-white/10 ${stat.color} p-4 dark:border-white/10 light:border-gray-200`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium opacity-75">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  {Icon && <Icon className="h-5 w-5 opacity-50" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white mb-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Chercher par nom ou email..."
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white placeholder-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500 light:border-gray-300 light:bg-white light:text-gray-900 light:placeholder-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <select
                aria-label="Filtrer par statut"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
                value={filterStatus || ''}
                onChange={(e) => setFilterStatus(e.target.value || null)}
              >
                <option value="">Tous les statuts</option>
                <option value="present">Présent</option>
                <option value="absent">Absent</option>
                <option value="late">Retard</option>
                <option value="excused">Excusé</option>
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <select
                aria-label="Filtrer par session"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
                value={filterSession || ''}
                onChange={(e) => setFilterSession(e.target.value || null)}
              >
                <option value="">Toutes les sessions</option>
                {sessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-600/30 transition">
              <Download className="h-4 w-4" />
              Exporter
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-purple-600/20 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-600/30 transition">
              <BarChart3 className="h-4 w-4" />
              Rapport
            </button>
          </div>
        </div>

        {/* Justification Review */}
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
                Justifications à examiner
              </h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                Absences/retards en attente d'approbation
              </p>
            </div>
            <span className="rounded-full bg-purple-600/20 px-3 py-1 text-xs font-medium text-purple-300">
              {pendingJustifications.length} en attente
            </span>
          </div>

          {pendingJustifications.length > 0 ? (
            <div className="divide-y divide-white/5 dark:divide-white/5 light:divide-gray-200">
              {pendingJustifications.map((record, idx) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-white dark:text-white light:text-gray-900">
                      {record.student}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                      {record.email} • {record.session} • {record.date}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        {getStatusLabel(record.status)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-600/20 px-3 py-1 text-purple-200">
                        <FileText className="h-3 w-3" />
                        En attente depuis{' '}
                        {new Date(
                          record.justification?.submitted_at ?? record.date,
                        ).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200 dark:text-zinc-200 light:text-gray-800">
                      {record.justification?.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-gray-50 light:hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </button>
                    <button
                      onClick={() =>
                        updateJustification.mutate({
                          id: record.id,
                          status: 'approved',
                          admin_comment: 'Justification acceptée',
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/30 transition"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Approuver
                    </button>
                    <button
                      onClick={() =>
                        updateJustification.mutate({
                          id: record.id,
                          status: 'rejected',
                          admin_comment: 'Pièce manquante',
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-600/30 transition"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Refuser
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-6 text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Aucune justification en attente. Les prochaines demandes apparaîtront ici.
            </div>
          )}
        </div>

        {/* Attendance Records */}
        <div className="rounded-xl border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
              Enregistrements ({filteredRecords.length})
            </h2>
          </div>

          <div className="divide-y divide-white/5 dark:divide-white/5 light:divide-gray-200 max-h-96 overflow-y-auto">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, idx) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(record.status)}
                    <div>
                      <p className="font-medium text-white dark:text-white light:text-gray-900">
                        {record.student}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        {record.email} • {record.session} • {record.date}
                      </p>
                      {record.justification && (
                        <p className="text-xs text-purple-200 dark:text-purple-200 light:text-purple-700 mt-1">
                          Justification: {record.justification.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        {getStatusLabel(record.status)}
                      </span>
                      {record.percentage !== undefined && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                          {record.percentage}%
                        </p>
                      )}
                      {record.justification && (
                        <span
                          className={`mt-2 inline-flex px-3 py-1 rounded-full text-xs font-medium ${getJustificationColor(record.justification.status)}`}
                        >
                          {getJustificationLabel(record.justification.status)}
                        </span>
                      )}
                    </div>
                    {record.justification && (
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="rounded border border-purple-500/30 bg-purple-600/20 px-3 py-1 text-sm text-purple-200 hover:bg-purple-600/30 transition"
                      >
                        Voir justificatif
                      </button>
                    )}
                    <button className="rounded border border-white/10 dark:border-white/10 light:border-gray-300 px-3 py-1 text-sm text-white dark:text-white light:text-gray-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-100 transition">
                      Éditer
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  Aucun enregistrement trouvé
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-xl border border-white/10 bg-white/10 p-6 dark:border-white/10 dark:bg-white/10 light:border-gray-300 light:bg-white"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  Détail justification
                </p>
                <h3 className="text-xl font-semibold text-white dark:text-white light:text-gray-900">
                  {selectedRecord.student}
                </h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  {selectedRecord.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                <Clock className="h-4 w-4" />
                <span>
                  {selectedRecord.session} • {selectedRecord.date}
                </span>
              </div>
              {selectedRecord.justification ? (
                <>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-gray-50">
                    <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900 mb-1">
                      Motif
                    </p>
                    <p className="text-sm text-zinc-200 dark:text-zinc-200 light:text-gray-800 whitespace-pre-line">
                      {selectedRecord.justification.reason}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Soumis le{' '}
                      {new Date(selectedRecord.justification.submitted_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  {selectedRecord.justification.admin_comment && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-gray-50">
                      <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900 mb-1">
                        Commentaire admin
                      </p>
                      <p className="text-sm text-zinc-200 dark:text-zinc-200 light:text-gray-800">
                        {selectedRecord.justification.admin_comment}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(selectedRecord.status)}`}
                    >
                      {getStatusLabel(selectedRecord.status)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${getJustificationColor(selectedRecord.justification.status)}`}
                    >
                      {getJustificationLabel(selectedRecord.justification.status)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  Aucune justification fournie.
                </p>
              )}
            </div>

            {selectedRecord.justification && selectedRecord.justification.status === 'pending' && (
              <div className="mt-6 grid gap-2 md:grid-cols-2">
                <button
                  onClick={() =>
                    updateJustification.mutate({
                      id: selectedRecord.id,
                      status: 'approved',
                      admin_comment: 'Approuvé depuis la fiche',
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/30 transition"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Approuver
                </button>
                <button
                  onClick={() =>
                    updateJustification.mutate({
                      id: selectedRecord.id,
                      status: 'rejected',
                      admin_comment: 'Refusé depuis la fiche',
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-600/30 transition"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Refuser
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </RoleGuard>
  );
}
