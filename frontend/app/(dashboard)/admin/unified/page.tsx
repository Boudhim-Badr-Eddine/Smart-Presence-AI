"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Mail,
  Activity,
} from "lucide-react";
import { useRequireAuth } from "@/lib/auth-context";
import { OnboardingBanner } from "@/components/common/OnboardingBanner";
import { apiClient } from "@/lib/api-client";

interface DashboardStats {
  totalStudents: number;
  totalSessions: number;
  todayAttendance: number;
  activeAlerts: number;
  averageAttendanceRate: number;
  recentMessages: number;
}

interface Alert {
  id: number;
  title: string;
  severity: string;
  created_at: string;
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

export default function UnifiedDashboard() {
  const { user, isLoading } = useRequireAuth(['admin']);
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalSessions: 0,
    todayAttendance: 0,
    activeAlerts: 0,
    averageAttendanceRate: 0,
    recentMessages: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const data = await apiClient<any>('/api/admin/dashboard/stats', {
        method: 'GET',
        useCache: false,
      });

      setStats({
        totalStudents: Number(data?.students ?? 0) || 0,
        totalSessions: Number(data?.sessions ?? 0) || 0,
        todayAttendance: Number(data?.attendance_rate ?? 0) || 0,
        activeAlerts: Number(data?.alerts ?? 0) || 0,
        averageAttendanceRate: Number(data?.attendance_rate ?? 0) || 0,
        recentMessages: 0,
      });

      // Fetch alerts

      const alertsData = await apiClient<any>('/api/admin/dashboard/alerts?limit=5', {
        method: 'GET',
        useCache: false,
      });
      const mappedAlerts: Alert[] = Array.isArray(alertsData)
        ? alertsData.map((a: any) => ({
            id: Number(a?.id ?? 0) || 0,
            title:
              a?.type === 'absence'
                ? `Absence - ${a?.student?.email ?? 'Unknown'}`
                : String(a?.type ?? 'Alert'),
            severity: a?.severity ?? 'medium',
            created_at: a?.timestamp ?? new Date().toISOString(),
          }))
        : [];
      setAlerts(mappedAlerts);

      // Fetch recent activities (from audit logs)

      const activitiesData = await apiClient<any>('/api/admin/dashboard/activities/recent?limit=10', {
        method: 'GET',
        useCache: false,
      });
      const mappedActivities: RecentActivity[] = Array.isArray(activitiesData)
        ? activitiesData.map((x: any) => ({
            id: Number(x?.id ?? 0) || 0,
            type: x?.action ?? 'activity',
            description: `${x?.action ?? 'Action'} • ${x?.resource?.type ?? 'resource'}`,
            timestamp: x?.timestamp ?? new Date().toISOString(),
          }))
        : [];
      setActivities(mappedActivities);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <OnboardingBanner />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Unified Dashboard</h1>
          <p className="text-slate-400">
            Complete overview of attendance, alerts, analytics, and system activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users className="h-6 w-6" />}
            title="Total Students"
            value={stats.totalStudents}
            color="blue"
          />
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            title="Sessions"
            value={stats.totalSessions}
            color="green"
          />
          <StatCard
            icon={<Activity className="h-6 w-6" />}
            title="Today's Attendance"
            value={stats.todayAttendance}
            color="purple"
          />
          <StatCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Active Alerts"
            value={stats.activeAlerts}
            color="red"
          />
        </div>

        {/* Attendance Rate */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Attendance Rate</h2>
            </div>
            <span className="text-3xl font-bold text-amber-400">
              {stats.averageAttendanceRate.toFixed(1)}%
            </span>
          </div>
          <progress
            value={stats.averageAttendanceRate}
            max={100}
            className="h-4 w-full overflow-hidden rounded-full bg-slate-700 [&::-webkit-progress-bar]:bg-slate-700 [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-amber-500 [&::-webkit-progress-value]:to-orange-500 [&::-moz-progress-bar]:bg-gradient-to-r [&::-moz-progress-bar]:from-amber-500 [&::-moz-progress-bar]:to-orange-500"
            aria-label="Attendance rate"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Active Alerts */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Active Alerts
            </h2>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-slate-400">No active alerts</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg bg-slate-700/50 border border-slate-600"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">{alert.title}</p>
                        <p className="text-sm text-slate-400 mt-1">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          alert.severity === 'critical'
                            ? 'bg-red-500/20 text-red-300'
                            : alert.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Recent Activity
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-slate-400">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-3 rounded-lg bg-slate-700/30 border border-slate-600"
                  >
                    <p className="text-sm text-white">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            icon={<BarChart3 className="h-5 w-5" />}
            title="View Analytics"
            onClick={() => router.push('/admin/analytics')}
          />
          <QuickAction
            icon={<Mail className="h-5 w-5" />}
            title="Send Message"
            onClick={() => router.push('/admin/messages/compose')}
          />
          <QuickAction
            icon={<Calendar className="h-5 w-5" />}
            title="Create Session"
            onClick={() => router.push('/admin/sessions/new')}
          />
        </div>
      </div>
    </div>
  );
}

const STAT_CARD_COLORS = {
  blue: "from-blue-500 to-blue-600",
  green: "from-green-500 to-green-600",
  purple: "from-purple-500 to-purple-600",
  red: "from-red-500 to-red-600",
} as const;

type StatCardColor = keyof typeof STAT_CARD_COLORS;

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  color?: StatCardColor;
}

function StatCard({ icon, title, value, color = "blue" }: StatCardProps) {

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div
        className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${STAT_CARD_COLORS[color]} mb-4`}
      >
        {icon}
      </div>
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

interface QuickActionProps {
  icon: ReactNode;
  title: string;
  onClick: () => void;
}

function QuickAction({ icon, title, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-700 transition-all hover:scale-105"
    >
      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">{icon}</div>
      <span className="text-white font-medium">{title}</span>
    </button>
  );
}
