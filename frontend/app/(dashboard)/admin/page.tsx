'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, Student, Trainer, Session, Notification } from '@/lib/api';
import Link from 'next/link';
import { Bell, FileDown, Users, BarChart3, UserPlus, TrendingUp, Activity, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import RoleGuard from '@/components/auth/RoleGuard';

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTrainers: number;
  totalSessions: number;
  totalNotifications: number;
}

export default function AdminDashboard() {
  const { user, isLoading } = useRequireAuth(['admin']);
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTrainers: 0,
    totalSessions: 0,
    totalNotifications: 0
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, trainersData, sessionsData, notificationsData] = await Promise.all([
        api.listStudents(),
        api.listTrainers(),
        api.listSessions(),
        api.getPendingNotifications()
      ]);

      setStudents(studentsData);
      setTrainers(trainersData);
      setSessions(sessionsData);
      setNotifications(notificationsData);

      setStats({
        totalUsers: studentsData.length + trainersData.length + 1,
        totalStudents: studentsData.length,
        totalTrainers: trainersData.length,
        totalSessions: sessionsData.length,
        totalNotifications: notificationsData.length
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
    return <div className="min-h-screen bg-transparent flex items-center justify-center"><p className="text-white">Chargement...</p></div>;
  }

  if (!user) return null;

  const statsCards = [
    { label: "Utilisateurs Actifs", value: stats.totalUsers.toString(), icon: Users, color: "bg-blue-600/20 text-blue-300" },
    { label: "Étudiants", value: stats.totalStudents.toString(), icon: GraduationCap, color: "bg-emerald-600/20 text-emerald-300" },
    { label: "Formateurs", value: stats.totalTrainers.toString(), icon: Users, color: "bg-purple-600/20 text-purple-300" },
    { label: "Sessions Créées", value: stats.totalSessions.toString(), icon: Activity, color: "bg-amber-600/20 text-amber-300" },
  ];

  return (
    <RoleGuard allow={["admin"]}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Administration" }]} />
        
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">Tableau de Bord Administration</h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Vue d'ensemble du système et des utilisateurs</p>
          </div>
          <Link href="/admin/analytics" className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-600/30 transition">
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
                    <p className="text-sm text-white/60 dark:text-white/60 light:text-gray-600">{stat.label}</p>
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
          <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">Actions Rapides</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/users" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition">
              <UserPlus className="h-5 w-5 text-blue-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">Créer Utilisateur</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">Admin, formateur, étudiant</p>
              </div>
            </Link>
            <Link href="/admin/students" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition">
              <GraduationCap className="h-5 w-5 text-emerald-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">Gérer Étudiants</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">CRUD & bulk actions</p>
              </div>
            </Link>
            <Link href="/admin/import" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition">
              <FileDown className="h-5 w-5 text-amber-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">Importer Données</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">CSV/Excel & validation</p>
              </div>
            </Link>
            <Link href="/admin/notifications" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition">
              <Bell className="h-5 w-5 text-red-300" />
              <div>
                <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">Notifications</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">{stats.totalNotifications} en attente</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Data Tables Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Students Summary */}
          <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-white dark:text-white light:text-gray-900">Étudiants Récents</h2>
              <Link href="/admin/students" className="text-xs text-blue-300 hover:text-blue-200">Voir tous →</Link>
            </div>
            <div className="divide-y divide-white/10 dark:divide-white/10 light:divide-gray-200">
              {students.slice(0, 5).map((student) => (
                <div key={student.id} className="px-6 py-3 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition">
                  <p className="font-medium text-white dark:text-white light:text-gray-900 text-sm">{student.first_name} {student.last_name}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">{student.class_name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trainers Summary */}
          <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-white dark:text-white light:text-gray-900">Formateurs Actifs</h2>
              <Link href="/admin/trainers" className="text-xs text-blue-300 hover:text-blue-200">Voir tous →</Link>
            </div>
            <div className="divide-y divide-white/10 dark:divide-white/10 light:divide-gray-200">
              {trainers.slice(0, 5).map((trainer) => (
                <div key={trainer.id} className="px-6 py-3 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition">
                  <p className="font-medium text-white dark:text-white light:text-gray-900 text-sm">{trainer.first_name} {trainer.last_name}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">{trainer.email}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions Summary */}
          <div className="rounded-lg border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden md:col-span-2">
            <div className="px-6 py-4 border-b border-white/10 dark:border-white/10 light:border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-white dark:text-white light:text-gray-900">Sessions Récentes</h2>
              <Link href="/admin/sessions" className="text-xs text-blue-300 hover:text-blue-200">Voir tous →</Link>
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
                    <tr key={session.id} className="hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-white dark:text-white light:text-gray-900">{session.subject}</td>
                      <td className="px-6 py-3 text-white/60 dark:text-white/60 light:text-gray-600">{session.class_name}</td>
                      <td className="px-6 py-3 text-white/60 dark:text-white/60 light:text-gray-600">{new Date(session.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-3 text-white/60 dark:text-white/60 light:text-gray-600">ID: {session.trainer_id}</td>
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
