'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  FileDown,
  Users,
  UserPlus,
  TrendingUp,
  Activity,
  GraduationCap,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import RoleGuard from '@/components/auth/RoleGuard';
import { apiClient } from '@/lib/api-client';
import SessionRequestsPanel from '@/components/SessionRequestsPanel';

type AdminStudent = {
  id: number;
  name: string;
  class_name: string;
};

type AdminTrainer = {
  id: number;
  name: string;
  email: string;
};

type AdminSession = {
  id: number;
  title: string;
  class_name: string;
  trainer_id?: number | null;
  trainer_name?: string | null;
  date: string;
  start_time: string;
  end_time: string;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  total_pages: number;
  page: number;
  page_size: number;
};

type Notification = {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
  title?: string;
  type?: string;
};

type NotificationListOut = {
  notifications: Notification[];
  unread_count: number;
};

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTrainers: number;
  totalSessions: number;
  totalNotifications: number;
}

function toSafeInt(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toSafeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default function AdminDashboard() {
  const { user, isLoading } = useRequireAuth(['admin']);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTrainers: 0,
    totalSessions: 0,
    totalNotifications: 0,
  });
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [trainers, setTrainers] = useState<AdminTrainer[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, trainersRes, sessionsRes, notificationsRes] = await Promise.all([
        apiClient<PaginatedResponse<AdminStudent>>(
          '/api/admin/students?page=1&page_size=5',
          {
            method: 'GET',
            useCache: false,
          },
        ),
        apiClient<PaginatedResponse<AdminTrainer>>(
          '/api/admin/trainers?page=1&page_size=5',
          {
            method: 'GET',
            useCache: false,
          },
        ),
        apiClient<PaginatedResponse<AdminSession>>('/api/admin/sessions?page=1&page_size=5', {
          method: 'GET',
          useCache: false,
        }),
        apiClient<NotificationListOut>('/api/notifications/me?limit=20&unread_only=true', {
          method: 'GET',
          useCache: false,
        }),
      ]);

      const studentsTotal = toSafeInt((studentsRes as any)?.total);
      const trainersTotal = toSafeInt((trainersRes as any)?.total);
      const sessionsTotal = toSafeInt((sessionsRes as any)?.total);
      const unreadCount = toSafeInt((notificationsRes as any)?.unread_count);

      setStudents(toSafeArray<AdminStudent>((studentsRes as any)?.items));
      setTrainers(toSafeArray<AdminTrainer>((trainersRes as any)?.items));
      setSessions(toSafeArray<AdminSession>((sessionsRes as any)?.items));
      setNotifications(toSafeArray<Notification>((notificationsRes as any)?.notifications));

      setStats({
        totalUsers: studentsTotal + trainersTotal + 1,
        totalStudents: studentsTotal,
        totalTrainers: trainersTotal,
        totalSessions: sessionsTotal,
        totalNotifications: unreadCount,
      });

      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <p className="text-white">Chargement...</p>
      </div>
    );
  }

  if (!user) return null;

  const statsCards = [
    {
      label: 'Utilisateurs Actifs',
      value: String(stats.totalUsers ?? 0),
      icon: Users,
      color: 'bg-blue-600/20 text-blue-300',
    },
    {
      label: 'Étudiants',
      value: String(stats.totalStudents ?? 0),
      icon: GraduationCap,
      color: 'bg-emerald-600/20 text-emerald-300',
    },
    {
      label: 'Formateurs',
      value: String(stats.totalTrainers ?? 0),
      icon: Users,
      color: 'bg-purple-600/20 text-purple-300',
    },
    {
      label: 'Sessions Créées',
      value: String(stats.totalSessions ?? 0),
      icon: Activity,
      color: 'bg-amber-600/20 text-amber-300',
    },
  ];

  return (
    <RoleGuard allow={['admin']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs items={[{ label: 'Dashboard' }, { label: 'Administration' }]} />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
              Tableau de Bord Administration
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Vue d'ensemble du système et des utilisateurs
            </p>
          </div>
          <Link
            href="/admin/analytics"
            className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-600/30 transition"
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-red-300 text-sm border border-red-500/20">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {statsCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-lg border border-white/10 ${stat.color} p-6 dark:border-white/10 light:border-gray-200 light:bg-gray-50`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/60 dark:text-white/60 light:text-gray-600">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className="h-6 w-6 opacity-50" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
            Actions Rapides
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition"
            >
              <UserPlus className="h-5 w-5 text-blue-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                  Créer Utilisateur
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  Admin, formateur, étudiant
                </p>
              </div>
            </Link>
            <Link
              href="/admin/students"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition"
            >
              <GraduationCap className="h-5 w-5 text-emerald-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                  Gérer Étudiants
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  CRUD & bulk actions
                </p>
              </div>
            </Link>
            <Link
              href="/admin/import"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition"
            >
              <FileDown className="h-5 w-5 text-amber-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                  Importer Données
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  CSV/Excel & validation
                </p>
              </div>
            </Link>
            <Link
              href="/admin/notifications"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition"
            >
              <Bell className="h-5 w-5 text-red-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                  Notifications
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  {stats.totalNotifications} en attente
                </p>
              </div>
            </Link>
            <Link
              href="#send-message"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition"
            >
              <Bell className="h-5 w-5 text-amber-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                  Envoyer Note de Service
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  Message officiel avec pièce jointe
                </p>
              </div>
            </Link>
          </div>
        </div>
        {/* Service Note Form */}
        <div id="send-message" className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Note de Service / Message Officiel</h2>
          {/** Lazy import to keep this file simpler would be ideal, inline import for now */}
          {require('@/components/admin/ServiceNoteForm').default && (
            (() => {
              const ServiceNoteForm = require('@/components/admin/ServiceNoteForm').default;
              return <ServiceNoteForm />;
            })()
          )}
        </div>

        {/* Data Tables Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Session Requests Panel */}
          <div className="md:col-span-2">
            <SessionRequestsPanel />
          </div>

          {/* Students Summary */}
          <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-white dark:text-white light:text-gray-900">
                Étudiants Récents
              </h2>
              <Link href="/admin/students" className="text-xs text-blue-300 hover:text-blue-200">
                Voir tous →
              </Link>
            </div>
            <div className="divide-y divide-white/10 dark:divide-white/10 light:divide-gray-200">
              {students.slice(0, 5).map((student) => (
                <div
                  key={student.id}
                  className="px-6 py-3 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition"
                >
                  <p className="font-medium text-white dark:text-white light:text-gray-900 text-sm">
                    {student.name}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                    {student.class_name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Trainers Summary */}
          <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-white dark:text-white light:text-gray-900">
                Formateurs Actifs
              </h2>
              <Link href="/admin/trainers" className="text-xs text-blue-300 hover:text-blue-200">
                Voir tous →
              </Link>
            </div>
            <div className="divide-y divide-white/10 dark:divide-white/10 light:divide-gray-200">
              {trainers.slice(0, 5).map((trainer) => (
                <div
                  key={trainer.id}
                  className="px-6 py-3 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition"
                >
                  <p className="font-medium text-white dark:text-white light:text-gray-900 text-sm">
                    {trainer.name}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                    {trainer.email}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions Summary */}
          <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden md:col-span-2">
            <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-white dark:text-white light:text-gray-900">
                Sessions Récentes
              </h2>
              <Link href="/admin/sessions" className="text-xs text-blue-300 hover:text-blue-200">
                Voir tous →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 dark:bg-white/5 light:bg-gray-50 text-white/60 dark:text-white/60 light:text-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left">Sujet</th>
                    <th className="px-6 py-3 text-left">Classe</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Formateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 dark:divide-white/5 light:divide-gray-200">
                  {sessions.slice(0, 5).map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-3 font-medium text-white dark:text-white light:text-gray-900">
                        {session.title}
                      </td>
                      <td className="px-6 py-3 text-white/60 dark:text-white/60 light:text-gray-600">
                        {session.class_name}
                      </td>
                      <td className="px-6 py-3 text-white/60 dark:text-white/60 light:text-gray-600">
                        {new Date(session.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3 text-white/60 dark:text-white/60 light:text-gray-600">
                        {session.trainer_name || (session.trainer_id ? `ID: ${session.trainer_id}` : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
