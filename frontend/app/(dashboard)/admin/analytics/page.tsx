'use client';

export const dynamic = 'force-dynamic';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Calendar, BarChart3, Download, PieChart } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/api-client';
import { getWebSocketManager } from '@/lib/websocket';
import OnboardingTour from '@/components/OnboardingTour';

type AnalyticsData = {
  total_students: number;
  total_sessions: number;
  average_attendance_rate: number;
  attendance_trend: Array<{ month: string; rate: number }>;
  class_statistics: Array<{ class_name: string; attendance_rate: number; student_count: number }>;
  top_absences: Array<{ student_name: string; absences: number }>;
};

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState('month');
  const queryClient = useQueryClient();
  const analyticsQuery = useApiQuery<AnalyticsData>(
    ['admin-analytics', dateRange],
    `/api/analytics?range=${dateRange}`,
    { method: 'GET' },
  );
  const analytics = (analyticsQuery as any).data as AnalyticsData | undefined;

  // Real-time updates invalidate cache when analytics change server-side
  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsub = ws.subscribe('analytics_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    });
    return () => unsub();
  }, [queryClient]);

  const stats = useMemo(
    () => [
      {
        label: 'Étudiants Actifs',
        value: analytics?.total_students ?? 0,
        icon: Users,
        color: 'bg-blue-600/20 text-blue-300',
      },
      {
        label: 'Sessions Créées',
        value: analytics?.total_sessions ?? 0,
        icon: Calendar,
        color: 'bg-emerald-600/20 text-emerald-300',
      },
      {
        label: 'Taux Moyen',
        value: `${(analytics?.average_attendance_rate ?? 0).toFixed(1)}%`,
        icon: TrendingUp,
        color: 'bg-amber-600/20 text-amber-300',
      },
    ],
    [analytics],
  );

  const handleExportCSV = () => {
    const csv = [
      ['Classe', 'Taux de Présence', "Nombre d'Étudiants"].join(','),
      ...(analytics?.class_statistics.map((c) =>
        [c.class_name, `${c.attendance_rate}%`, c.student_count].join(','),
      ) || []),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${Date.now()}.csv`;
    link.click();
  };

  return (
    <RoleGuard allow={['admin']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Administration', href: '/admin' }, { label: 'Analytiques' }]}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
              Analytiques & Rapports
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Vue d'ensemble des statistiques de présence et de performance
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-600/30 transition"
            data-tour-id="analytics-export"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
        </div>

        <OnboardingTour
          tourId="analytics"
          steps={[
            {
              target: "[data-tour-id='analytics-export']",
              title: 'Exporter',
              content: 'Téléchargez un CSV des statistiques par classe.',
              placement: 'left',
            },
            {
              target: "[data-tour-id='analytics-range']",
              title: 'Période',
              content: "Choisissez l'horizon (semaine, mois, trimestre, année).",
              placement: 'bottom',
            },
            {
              target: 'div.grid > div:nth-child(1)',
              title: 'Indicateurs clés',
              content: 'Suivez étudiants, sessions et taux moyen.',
              placement: 'right',
            },
          ]}
          autoStart
        />

        {/* Date Range Filter */}
        <div className="mb-6 flex gap-2">
          {['week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
              data-tour-id={range === 'month' ? 'analytics-range' : undefined}
            >
              {range === 'week'
                ? 'Semaine'
                : range === 'month'
                  ? 'Mois'
                  : range === 'quarter'
                    ? 'Trimestre'
                    : 'Année'}
            </button>
          ))}
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {stats.map((stat, idx) => {
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

        {/* Main Analytics Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Attendance Trend */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendance de Présence
            </h2>
            {analytics?.attendance_trend && (
              <div className="space-y-3">
                {analytics.attendance_trend.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white dark:text-white light:text-gray-900">
                        {item.month}
                      </span>
                      <span className="text-sm font-medium text-emerald-300">
                        {item.rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <progress
                        className="h-2 w-full accent-emerald-400 bg-white/10 rounded-full"
                        value={Math.min(Math.max(item.rate, 0), 100)}
                        max={100}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Class Statistics */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques par Classe
            </h2>
            {analytics?.class_statistics && (
              <div className="space-y-3">
                {analytics.class_statistics.map((cls, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/10 bg-white/2 p-3 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                        {cls.class_name}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        {cls.student_count} étudiants
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <progress
                        className="h-2 w-full accent-blue-400 bg-white/10 rounded-full"
                        value={Math.min(Math.max(cls.attendance_rate, 0), 100)}
                        max={100}
                      />
                    </div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                      {cls.attendance_rate.toFixed(1)}% présence
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Absences */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white md:col-span-2">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Étudiants avec le plus d'absences
            </h2>
            {analytics?.top_absences && (
              <div className="grid gap-3 md:grid-cols-3">
                {analytics.top_absences.map((student, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/10 bg-white/2 p-4 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white dark:text-white light:text-gray-900">
                          {student.student_name}
                        </p>
                        <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                          {student.absences} absences
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20">
                        <span className="text-sm font-semibold text-red-300">{idx + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional Features */}
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <button className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-white light:hover:bg-gray-50 transition">
            <PieChart className="h-5 w-5 mb-2 text-blue-300" />
            <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
              Répartition
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
              Par classe ou statut
            </p>
          </button>

          <button className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-white light:hover:bg-gray-50 transition">
            <BarChart3 className="h-5 w-5 mb-2 text-emerald-300" />
            <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
              Tendances
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
              Sur plusieurs mois
            </p>
          </button>

          <button className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-white light:hover:bg-gray-50 transition">
            <Download className="h-5 w-5 mb-2 text-amber-300" />
            <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
              Exporter
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
              PDF, Excel, CSV
            </p>
          </button>
        </div>
      </div>
    </RoleGuard>
  );
}
