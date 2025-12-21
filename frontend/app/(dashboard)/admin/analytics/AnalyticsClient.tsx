'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Users, Calendar, BarChart3, Filter } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type AttendanceData = {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
};

type ClassStats = {
  class_name: string;
  attendance_rate: number;
  total_students: number;
  avg_absences: number;
};

export default function AnalyticsClient() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const { data: attendance = [] } = useQuery({
    queryKey: ['admin-analytics-attendance', dateRange],
    queryFn: async () => {
      return apiClient<AttendanceData[]>('/api/admin/analytics/attendance', {
        method: 'GET',
        params: { range: dateRange },
      });
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-analytics-classes'],
    queryFn: async () => {
      return apiClient<ClassStats[]>('/api/admin/analytics/classes', { method: 'GET' });
    },
  });

  const avgAttendanceRate = useMemo(() => {
    if (attendance.length === 0) return 0;
    const totalPresent = attendance.reduce((sum, d) => sum + d.present, 0);
    const totalStudents = attendance.reduce((sum, d) => sum + d.total, 0);
    return ((totalPresent / totalStudents) * 100).toFixed(1);
  }, [attendance]);

  const totalAbsences = useMemo(() => {
    return attendance.reduce((sum, d) => sum + d.absent, 0);
  }, [attendance]);

  const trend = useMemo(() => {
    if (attendance.length < 2) return 0;
    const recent =
      attendance.slice(-3).reduce((sum, d) => sum + (d.present / d.total) * 100, 0) / 3;
    const previous =
      attendance.slice(0, -3).reduce((sum, d) => sum + (d.present / d.total) * 100, 0) /
      (attendance.length - 3);
    return ((recent - previous) / previous) * 100;
  }, [attendance]);

  const maxValue = Math.max(...attendance.map((d) => d.total));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Période:
          </span>
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 light:bg-gray-100 light:text-gray-600 light:hover:bg-gray-200'
              }`}
            >
              {range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          aria-label="Classe"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
        >
          <option value="all">Toutes les classes</option>
          {classes.map((cls) => (
            <option key={cls.class_name} value={cls.class_name}>
              {cls.class_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                Taux de présence
              </p>
              <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900 mt-1">
                {avgAttendanceRate}%
              </p>
            </div>
            {trend > 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="mt-2 flex items-center gap-1">
            <span className={`text-xs ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500">
              vs période précédente
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                Total absences
              </p>
              <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900 mt-1">
                {totalAbsences}
              </p>
            </div>
            <Users className="h-5 w-5 text-red-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                Classes actives
              </p>
              <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900 mt-1">
                {classes.length}
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                Étudiants
              </p>
              <p className="text-2xl font-bold text-white dark:text-white light:text-gray-900 mt-1">
                {classes.reduce((sum, c) => sum + c.total_students, 0)}
              </p>
            </div>
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Tendance de présence
        </h2>
        <div className="space-y-2">
          {attendance.map((day, idx) => {
            const presentPercent = (day.present / day.total) * 100;
            const absentPercent = (day.absent / day.total) * 100;
            const latePercent = (day.late / day.total) * 100;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                    {day.date}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                    {day.present}/{day.total}
                  </span>
                </div>
                <div className="flex h-6 rounded-lg overflow-hidden bg-white/5 dark:bg-white/5 light:bg-gray-200">
                  <div className="w-full space-y-1 py-1 px-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                      <span>Présent</span>
                      <span>{presentPercent.toFixed(0)}%</span>
                    </div>
                    <progress
                      className="w-full h-2 accent-emerald-600"
                      value={Number.isFinite(presentPercent) ? presentPercent : 0}
                      max={100}
                    />

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                      <span>Retard</span>
                      <span>{latePercent.toFixed(0)}%</span>
                    </div>
                    <progress
                      className="w-full h-2 accent-amber-600"
                      value={Number.isFinite(latePercent) ? latePercent : 0}
                      max={100}
                    />

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                      <span>Absent</span>
                      <span>{absentPercent.toFixed(0)}%</span>
                    </div>
                    <progress
                      className="w-full h-2 accent-red-600"
                      value={Number.isFinite(absentPercent) ? absentPercent : 0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-600"></div>
            <span className="text-zinc-400 dark:text-zinc-400 light:text-gray-600">Présent</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-600"></div>
            <span className="text-zinc-400 dark:text-zinc-400 light:text-gray-600">Retard</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-600"></div>
            <span className="text-zinc-400 dark:text-zinc-400 light:text-gray-600">Absent</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Performance par classe
        </h2>
        <div className="space-y-4">
          {classes.map((cls) => (
            <div key={cls.class_name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white dark:text-white light:text-gray-900">
                    {cls.class_name}
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                    {cls.total_students} étudiants • Avg {cls.avg_absences} absences
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    cls.attendance_rate >= 90
                      ? 'bg-emerald-600/20 text-emerald-300'
                      : cls.attendance_rate >= 80
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'bg-red-600/20 text-red-300'
                  }`}
                >
                  {cls.attendance_rate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 dark:bg-white/5 light:bg-gray-200 overflow-hidden">
                <progress
                  className={`w-full h-2 ${
                    cls.attendance_rate >= 90
                      ? 'accent-emerald-600'
                      : cls.attendance_rate >= 80
                        ? 'accent-blue-600'
                        : 'accent-red-600'
                  }`}
                  value={cls.attendance_rate}
                  max={100}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
