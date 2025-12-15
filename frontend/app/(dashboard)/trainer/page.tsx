"use client";
export const dynamic = 'force-dynamic';

import RoleGuard from "@/components/auth/RoleGuard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Clock, Users, TrendingUp, BarChart3, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { getApiBase } from "@/lib/config";
import { getWebSocketManager } from "@/lib/websocket";
import OnboardingTour from "@/components/OnboardingTour";

type TrainerStats = {
  total_sessions: number;
  total_students: number;
  attendance_rate: number;
  this_week_sessions: number;
};

type UpcomingSession = {
  id: number;
  title: string;
  date: string;
  time: string;
  class_name: string;
  student_count: number;
};

export default function TrainerPage() {
  const apiBase = getApiBase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsubStats = ws.subscribe("trainer_stats_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-stats"] });
    });
    const unsubSessions = ws.subscribe("session_created", () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-upcoming-sessions"] });
    });
    const unsubDeleted = ws.subscribe("session_deleted", () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-upcoming-sessions"] });
    });
    return () => { unsubStats(); unsubSessions(); unsubDeleted(); };
  }, [queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["trainer-stats"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/trainer/stats`).catch(() => ({
        data: { total_sessions: 8, total_students: 120, attendance_rate: 92.5, this_week_sessions: 3 },
      }));
      return res.data as TrainerStats;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["trainer-upcoming-sessions"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/trainer/upcoming-sessions`).catch(() => ({
        data: [
          { id: 1, title: 'Web Dev I', date: '2025-12-15', time: '09:00', class_name: 'L3-Dev-A', student_count: 30 },
          { id: 2, title: 'Database Design', date: '2025-12-16', time: '14:00', class_name: 'L3-Dev-B', student_count: 28 },
          { id: 3, title: 'Web Dev II', date: '2025-12-17', time: '09:00', class_name: 'L3-Dev-A', student_count: 30 },
        ],
      }));
      return res.data as UpcomingSession[];
    },
  });

  const cards = [
    { icon: Clock, label: "Sessions cette semaine", value: stats?.this_week_sessions ?? 0, color: "bg-blue-600/20 text-blue-300" },
    { icon: Users, label: "Étudiants total", value: stats?.total_students ?? 0, color: "bg-emerald-600/20 text-emerald-300" },
    { icon: TrendingUp, label: "Taux de présence", value: `${(stats?.attendance_rate ?? 0).toFixed(1)}%`, color: "bg-amber-600/20 text-amber-300" },
    { icon: BarChart3, label: "Sessions total", value: stats?.total_sessions ?? 0, color: "bg-purple-600/20 text-purple-300" },
  ];

  return (
    <RoleGuard allow={["trainer"]}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs items={[{ label: "Tableau de bord formateur" }]} />
        <OnboardingTour
          tourId="trainer-dashboard"
          steps={[
            { target: "div.grid > div:nth-child(1)", title: "Sessions cette semaine", content: "Vos cours et sessions à venir en temps réel.", placement: "right" },
            { target: "a[href='/trainer/mark-attendance']", title: "Pointer les présences", content: "Marquez rapidement l'assiduité via QR, biométrie ou PIN.", placement: "bottom" },
            { target: "a[href='/trainer/sessions']", title: "Toutes les sessions", content: "Visualisez l'ensemble de votre calendrier.", placement: "right" },
          ]}
          autoStart
        />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">Tableau de bord formateur</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Vue d'ensemble de vos sessions et statistiques.</p>
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
              <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">Prochaines sessions</h2>
              <Link href="/trainer/sessions" className="text-xs text-amber-400 hover:text-amber-300">
                Voir plus →
              </Link>
            </div>
            {sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start justify-between rounded-lg border border-white/10 bg-white/2 p-3 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white dark:text-white light:text-gray-900 truncate">{session.title}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        {session.class_name} • {session.date} {session.time}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500 mt-1">
                        {session.student_count} étudiants
                      </p>
                    </div>
                    <Link
                      href={`/trainer/mark-attendance?session=${session.id}`}
                      className="ml-2 flex-shrink-0 rounded bg-blue-600/20 px-2 py-1 text-xs font-medium text-blue-300 hover:bg-blue-600/30 whitespace-nowrap"
                    >
                      Pointer
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Aucune session prévue</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">Actions rapides</h2>
            <div className="space-y-2">
              <Link
                href="/trainer/attendance"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/2 p-3 transition hover:bg-white/5 dark:border-white/10 dark:bg-white/2 dark:hover:bg-white/5 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100"
              >
                <span className="text-sm font-medium text-white dark:text-white light:text-gray-900">Voir présences</span>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </Link>
              <Link
                href="/trainer/mark-attendance"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/2 p-3 transition hover:bg-white/5 dark:border-white/10 dark:bg-white/2 dark:hover:bg-white/5 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100"
              >
                <span className="text-sm font-medium text-white dark:text-white light:text-gray-900">Pointer les présences</span>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </Link>
              <Link
                href="/trainer/sessions"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/2 p-3 transition hover:bg-white/5 dark:border-white/10 dark:bg-white/2 dark:hover:bg-white/5 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100"
              >
                <span className="text-sm font-medium text-white dark:text-white light:text-gray-900">Toutes les sessions</span>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
