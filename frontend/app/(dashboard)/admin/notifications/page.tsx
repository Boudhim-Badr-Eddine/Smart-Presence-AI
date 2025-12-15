"use client";

export const dynamic = 'force-dynamic';

import RoleGuard from "@/components/auth/RoleGuard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Check, Trash2, Bell, AlertCircle, Info, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useApiQuery } from "@/lib/api-client";
import { getApiBase } from "@/lib/config";
import { getWebSocketManager } from "@/lib/websocket";
import OnboardingTour from "@/components/OnboardingTour";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
};

export default function AdminNotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();

  const apiBase = getApiBase();
  const authHeaders = useMemo(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("spa_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const notificationsQuery = useApiQuery<{ items: Notification[] }>(
    ["notifications", filter],
    `/api/notifications?unread_only=${filter === "unread"}`,
    { method: "GET", headers: authHeaders }
  );
  const { data, isLoading } = (notificationsQuery as any);

  const markReadMutation = useMutation({
    mutationFn: (id: number) =>
      axios.patch(`${apiBase}/api/notifications/${id}`, { read: true }, { headers: authHeaders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      axios.delete(`${apiBase}/api/notifications/${id}`, { headers: authHeaders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // WebSocket real-time updates
  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsubCreate = ws.subscribe("notification_created", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    const unsubUpdate = ws.subscribe("notification_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    const unsubDelete = ws.subscribe("notification_deleted", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    return () => { unsubCreate(); unsubUpdate(); unsubDelete(); };
  }, [queryClient]);

  const bulkMarkRead = async () => {
    const unreadIds = data?.items.filter((n: Notification) => !n.read).map((n: Notification) => n.id) ?? [];
    await Promise.all(unreadIds.map((id: number) => markReadMutation.mutateAsync(id)));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-300" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-300" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-300" />;
      default:
        return <Info className="h-5 w-5 text-blue-300" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-emerald-700/20 text-emerald-300 border-emerald-600/20";
      case "warning":
        return "bg-amber-700/20 text-amber-300 border-amber-600/20";
      case "error":
        return "bg-red-700/20 text-red-300 border-red-600/20";
      default:
        return "bg-blue-700/20 text-blue-300 border-blue-600/20";
    }
  };

  return (
    <RoleGuard allow={["admin"]}>
      <div className="mx-auto max-w-5xl p-6">
        <Breadcrumbs items={[{ label: "Administration", href: "/admin" }, { label: "Notifications" }]} />
        
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">Notifications</h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Gérez toutes vos notifications système</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={bulkMarkRead}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
            >
              Marquer tout comme lu
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {["all", "unread"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as "all" | "unread")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {f === "all" ? "Tous" : "Non lus"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-zinc-400">Chargement...</div>
        ) : data?.items && data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((notification: Notification, idx: number) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-lg border p-4 transition ${
                  notification.read
                    ? "border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-gray-50"
                    : `border ${getTypeColor(notification.type)}`
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white dark:text-white light:text-gray-900">{notification.title}</h3>
                    <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-500 mt-2">
                      {new Date(notification.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markReadMutation.mutate(notification.id)}
                        className="rounded p-2 hover:bg-white/10 transition"
                        title="Marquer comme lu"
                      >
                        <Check className="h-4 w-4 text-zinc-400 hover:text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(notification.id)}
                      className="rounded p-2 hover:bg-red-500/10 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
            <p className="text-zinc-400">Aucune notification</p>
          </div>
        )}

        {/* Onboarding tour */}
        <OnboardingTour
          tourId="notifications"
          steps={[
            {
              target: "button:contains('Marquer tout comme lu')",
              title: "Actions en masse",
              content: "Marquez toutes les notifications non lues en un clic.",
              placement: "left",
            },
            {
              target: "button:has(svg.lucide-check)",
              title: "Marquer comme lu",
              content: "Chaque carte propose des actions rapides.",
              placement: "right",
            },
            {
              target: "button:has(svg.lucide-trash-2)",
              title: "Supprimer",
              content: "Retirez les notifications obsolètes pour garder l'inbox propre.",
              placement: "right",
            },
          ]}
          autoStart
        />
      </div>
    </RoleGuard>
  );
}
