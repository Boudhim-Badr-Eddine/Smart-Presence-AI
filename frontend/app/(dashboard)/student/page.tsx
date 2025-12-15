"use client";
export const dynamic = 'force-dynamic';

import RoleGuard from "@/components/auth/RoleGuard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Calendar, BookOpen, TrendingUp, AlertCircle, Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useEffect } from "react";
import OnboardingWalkthrough from "@/components/common/OnboardingWalkthrough";
import { getApiBase } from "@/lib/config";
import { getWebSocketManager } from "@/lib/websocket";
import OnboardingTour from "@/components/OnboardingTour";

type StudentStats = {
  total_classes: number;
  attendance_rate: number;
  absences: number;
  justified_absences: number;
  next_session?: string;
};

type AttendanceRecord = {
  id: number;
  date: string;
  subject: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  justified: boolean;
};

type UpcomingSession = {
  id: number;
  subject: string;
  date: string;
  time: string;
  classroom: string;
  trainer_name: string;
};

export default function StudentPage() {
  const apiBase = getApiBase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsubStats = ws.subscribe("student_stats_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["student-stats"] });
    });
    const unsubAttend = ws.subscribe("student_attendance_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
    });
    const unsubSessions = ws.subscribe("student_sessions_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["student-upcoming-sessions"] });
    });
    return () => { unsubStats(); unsubAttend(); unsubSessions(); };
  }, [queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["student-stats"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/stats`).catch(() => ({
        data: { 
          total_classes: 6, 
          attendance_rate: 88.5, 
          absences: 3, 
          justified_absences: 1,
          next_session: "Demain 10:00" 
        },
      }));
      return res.data as StudentStats;
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["student-attendance"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/attendance`).catch(() => ({
        data: [
          { id: 1, date: '2025-01-12', subject: 'Dev Web', status: 'present', justified: false },
          { id: 2, date: '2025-01-11', subject: 'Database', status: 'absent', justified: true },
          { id: 3, date: '2025-01-10', subject: 'Dev Web', status: 'present', justified: false },
          { id: 4, date: '2025-01-09', subject: 'Security', status: 'late', justified: false },
          { id: 5, date: '2025-01-08', subject: 'Dev Web', status: 'present', justified: false },
        ],
      }));
      return res.data as AttendanceRecord[];
    },
  });

  const { data: upcomingSessions } = useQuery({
    queryKey: ["student-upcoming-sessions"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/upcoming-sessions`).catch(() => ({
        data: [
          { id: 1, subject: 'Développement Web I', date: '2025-01-15', time: '09:00', classroom: 'A101', trainer_name: 'M. Alaoui' },
          { id: 2, subject: 'Base de Données', date: '2025-01-16', time: '14:00', classroom: 'B202', trainer_name: 'Mme Bennani' },
          { id: 3, subject: 'Développement Web II', date: '2025-01-17', time: '09:00', classroom: 'A101', trainer_name: 'M. Alaoui' },
        ],
      }));
      return res.data as UpcomingSession[];
    },
  });

  const statusCounts = useMemo(() => {
    if (!attendance) return { present: 0, absent: 0, late: 0, excused: 0 };
    return {
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      excused: attendance.filter(a => a.status === 'excused').length,
    };
  }, [attendance]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'late': return <Clock className="h-4 w-4 text-amber-400" />;
      case 'excused': return <CheckCircle className="h-4 w-4 text-blue-400" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'present': return 'Présent';
      case 'absent': return 'Absent';
      case 'late': return 'Retard';
      case 'excused': return 'Excusé';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'present': return 'bg-emerald-600/20 text-emerald-300';
      case 'absent': return 'bg-red-600/20 text-red-300';
      case 'late': return 'bg-amber-600/20 text-amber-300';
      case 'excused': return 'bg-blue-600/20 text-blue-300';
      default: return 'bg-zinc-600/20 text-zinc-300';
    }
  };

  const cards = [
    { icon: BookOpen, label: "Classes", value: stats?.total_classes ?? 0, color: "bg-blue-600/20 text-blue-300" },
    { icon: TrendingUp, label: "Taux de présence", value: `${(stats?.attendance_rate ?? 0).toFixed(1)}%`, color: "bg-emerald-600/20 text-emerald-300" },
    { icon: AlertCircle, label: "Absences", value: stats?.absences ?? 0, color: "bg-red-600/20 text-red-300" },
    { icon: CheckCircle, label: "Justifiées", value: stats?.justified_absences ?? 0, color: "bg-blue-600/20 text-blue-300" },
  ];

  return (
    <RoleGuard allow={["student"]}>
      <div className="mx-auto max-w-7xl p-6">
        <OnboardingWalkthrough />
        <Breadcrumbs items={[{ label: "Mon espace étudiant" }]} />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">Mon tableau de bord</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Suivi de votre présence et de vos classes.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className={`rounded-lg border border-white/10 ${card.color} p-4 dark:border-white/10 light:border-gray-200 light:bg-gray-50`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium opacity-75">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <Icon className="h-5 w-5 opacity-50" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Sessions */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">Prochains cours</h2>
              <Link href="/student/schedule" className="text-xs text-amber-400 hover:text-amber-300">
                Voir plus →
              </Link>
            </div>
            {upcomingSessions && upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start justify-between rounded-lg border border-white/10 bg-white/2 p-3 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white dark:text-white light:text-gray-900 truncate">{session.subject}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        {session.date} • {session.time}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500 mt-1">
                        {session.classroom} • {session.trainer_name}
                      </p>
                    </div>
                    <Calendar className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Aucun cours prévu</p>
            )}
          </div>

          {/* Recent Attendance */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">Historique de présence</h2>
              <Link href="/student/attendance" className="text-xs text-amber-400 hover:text-amber-300">
                Voir plus →
              </Link>
            </div>
            {attendance && attendance.length > 0 ? (
              <div className="space-y-2">
                {attendance.slice(0, 4).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/2 p-3 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getStatusIcon(record.status)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white dark:text-white light:text-gray-900 truncate">{record.subject}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">{record.date}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(record.status)}`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Aucun enregistrement</p>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mt-6">
          <Link
            href="/student/justification"
            className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white dark:text-white light:text-gray-900">Justifier une absence</h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                  Soumettez une justification pour vos absences
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </div>
          </Link>

          <Link
            href="/student/feedback"
            className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white dark:text-white light:text-gray-900">Partager un feedback</h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                  Soumettez vos suggestions et suivez les réponses
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </div>
          </Link>

          <Link
            href="/student/notifications"
            className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white dark:text-white light:text-gray-900">Notifications & alertes</h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                  Consultez vos alertes et ajustez vos préférences
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </div>
          </Link>

          <Link
            href="/student/profile"
            className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white dark:text-white light:text-gray-900">Mon profil</h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                  Mettez à jour vos informations et préférences
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </div>
          </Link>

          <Link
            href="/student/calendar"
            className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white dark:text-white light:text-gray-900">Calendrier unifié</h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                  Retrouvez vos cours, examens et rappels
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </div>
          </Link>

          <Link
            href="/student/schedule"
            className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white dark:text-white light:text-gray-900">Mon emploi du temps</h3>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                  Consultez vos cours et vos horaires
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </div>
          </Link>
        </div>
      </div>
    </RoleGuard>
  );
}
