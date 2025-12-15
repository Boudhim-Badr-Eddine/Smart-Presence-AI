"use client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiBase } from "./config";

type NotificationEvent = {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read: boolean;
};

export function useRealtimeNotifications(userId: number | undefined) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId) return;

    const apiBase = getApiBase();
    const token = localStorage.getItem("spa_access_token");
    
    // SSE endpoint - append auth as query param (or use custom headers if supported)
    const url = `${apiBase}/api/notifications/stream?token=${token}`;
    
    const es = new EventSource(url);
    eventSourceRef.current = es;

    const maybeNotify = (notification: NotificationEvent) => {
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          tag: `notif-${notification.id}`,
        });
      }
    };

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    es.onmessage = (event) => {
      try {
        const notification: NotificationEvent = JSON.parse(event.data);
        
        // Merge new notification into existing cache
        queryClient.setQueryData<{ items: NotificationEvent[] } | NotificationEvent[]>(
          ["student-notifications"],
          (old) => {
            if (!old) return { items: [notification] };
            const items = Array.isArray(old) ? old : old.items || [];
            return { items: [notification, ...items] };
          }
        );

        // Also invalidate to refetch counts if needed
        queryClient.invalidateQueries({ queryKey: ["student-notifications"] });

        // Browser push toast
        maybeNotify(notification);
      } catch (err) {
        console.error("Failed to parse SSE notification:", err);
      }
    };

    es.onerror = () => {
      console.warn("SSE connection error, will auto-reconnect");
      es.close();
    };

    return () => {
      es.close();
    };
  }, [userId, queryClient]);
}
