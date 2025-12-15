"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Bell, CheckCircle, XCircle, Trash2, Settings, Filter, AlertCircle, MessageSquare, CalendarClock } from "lucide-react";
import { useRealtimeNotifications } from "@/lib/useRealtimeNotifications";
import { useAuth } from "@/lib/auth-context";
import { getApiBase } from "@/lib/config";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: "system" | "justification" | "schedule" | "message";
  created_at: string;
  read: boolean;
};

type Preferences = {
  system: boolean;
  justification: boolean;
  schedule: boolean;
  message: boolean;
  email: boolean;
  push: boolean;
};

export default function NotificationsClient() {
  const apiBase = getApiBase();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [preferences, setPreferences] = useState<Preferences>({
    system: true,
    justification: true,
    schedule: true,
    message: true,
    email: true,
    push: false,
  });
  const [showPreferences, setShowPreferences] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["student-notifications"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/notifications`).catch(() => ({
        data: [
          { id: 1, title: "Nouvelle session ajoutée", message: "Développement Web - Demain à 09:00", type: "schedule", created_at: "2025-01-14T10:30:00Z", read: false },
          { id: 2, title: "Justification approuvée", message: "Votre justification pour le 11/01 a été approuvée", type: "justification", created_at: "2025-01-13T15:20:00Z", read: true },
        ],
      }));
      return res.data as NotificationItem[];
    },
  });

  useRealtimeNotifications(user?.id);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => axios.patch(`${apiBase}/api/student/notifications/${id}/read`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["student-notifications"] });
      const previous = queryClient.getQueryData<NotificationItem[]>(["student-notifications"]);
      queryClient.setQueryData<NotificationItem[]>(["student-notifications"], (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["student-notifications"], context.previous);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => axios.delete(`${apiBase}/api/student/notifications/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["student-notifications"] });
      const previous = queryClient.getQueryData<NotificationItem[]>(["student-notifications"]);
      queryClient.setQueryData<NotificationItem[]>(["student-notifications"], (old) =>
        old?.filter((n) => n.id !== id)
      );
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["student-notifications"], context.previous);
      }
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Preferences) => axios.put(`${apiBase}/api/student/notification-preferences`, data),
  });

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate(preferences);
    setShowPreferences(false);
  };

  const filtered = useMemo(() => {
    return filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "system":
        return <Bell className="h-4 w-4 text-blue-400" />;
      case "justification":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "schedule":
        return <CalendarClock className="h-4 w-4 text-amber-400" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "system":
        return "bg-blue-600/20 text-blue-300 border-blue-600/30";
      case "justification":
        return "bg-emerald-600/20 text-emerald-300 border-emerald-600/30";
      case "schedule":
        return "bg-amber-600/20 text-amber-300 border-amber-600/30";
      case "message":
        return "bg-purple-600/20 text-purple-300 border-purple-600/30";
      default:
        return "bg-zinc-600/20 text-zinc-300 border-zinc-600/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 light:bg-gray-100 light:text-gray-600 light:hover:bg-gray-200"
            }`}
          >
            Toutes ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === "unread"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 light:bg-gray-100 light:text-gray-600 light:hover:bg-gray-200"
            }`}
          >
            Non lues ({unreadCount})
          </button>
        </div>

        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 light:border-gray-300 light:bg-gray-50 light:text-gray-700 light:hover:bg-gray-100"
        >
          <Settings className="h-4 w-4" />
          Préférences
        </button>
      </div>

      {showPreferences && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
            Préférences de notifications
          </h3>
          <div className="space-y-3">
            {Object.entries(preferences).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700 capitalize">
                  {key === "system"
                    ? "Notifications système"
                    : key === "justification"
                    ? "Justifications"
                    : key === "schedule"
                    ? "Emploi du temps"
                    : key === "message"
                    ? "Messages"
                    : key === "email"
                    ? "Notifications par email"
                    : "Notifications push"}
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={updatePreferencesMutation.isPending}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {updatePreferencesMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <Bell className="h-12 w-12 mx-auto text-zinc-400 dark:text-zinc-400 light:text-gray-400 mb-2" />
            <p className="text-zinc-400 dark:text-zinc-400 light:text-gray-600">Aucune notification</p>
          </div>
        ) : (
          filtered.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-xl border p-4 ${
                notification.read
                  ? "border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
                  : "border-blue-600/30 bg-blue-600/10"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                      {notification.type}
                    </span>
                    {!notification.read && (
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-medium">Nouveau</span>
                    )}
                  </div>
                  <h3 className="font-medium text-white dark:text-white light:text-gray-900 mb-1">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500">
                    {new Date(notification.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      className="p-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition"
                      title="Marquer comme lue"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(notification.id)}
                    className="p-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
