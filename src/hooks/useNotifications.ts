import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveNotification,
  clearAllNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationApi";
import type { NotificationListStatus } from "../types/notification";
import { unreadCountQueryKey } from "./useUnreadCount";

export const notificationsQueryKey = (
  recipientKey: string,
  status: NotificationListStatus,
  page: number,
  limit: number
) => ["notifications", recipientKey, status, page, limit] as const;

export function useNotificationsQuery(
  token: string | null,
  status: NotificationListStatus,
  page: number,
  limit = 20
) {
  const recipientKey = token ?? "anonymous";
  return useQuery({
    queryKey: notificationsQueryKey(recipientKey, status, page, limit),
    queryFn: async () => {
      // #region agent log
      fetch("http://127.0.0.1:7356/ingest/06a46138-4048-4848-9c8e-520fa90eebbe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "489cc5" },
        body: JSON.stringify({
          sessionId: "489cc5",
          location: "useNotifications.ts:queryFn",
          message: "fetchNotifications invoked",
          data: { status, page, limit, hasToken: Boolean(token) },
          timestamp: Date.now(),
          hypothesisId: "D",
        }),
      }).catch(() => {});
      // #endregion
      if (!token) {
        return { items: [], page: 1, limit, total: 0, total_pages: 1, unread_count: 0 };
      }
      const result = await fetchNotifications(token, { status, page, limit });
      // #region agent log
      fetch("http://127.0.0.1:7356/ingest/06a46138-4048-4848-9c8e-520fa90eebbe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "489cc5" },
        body: JSON.stringify({
          sessionId: "489cc5",
          location: "useNotifications.ts:queryFn:result",
          message: "fetchNotifications result",
          data: {
            status,
            itemCount: result.items.length,
            total: result.total,
            unread_count: result.unread_count,
          },
          timestamp: Date.now(),
          hypothesisId: "D",
        }),
      }).catch(() => {});
      // #endregion
      return result;
    },
    enabled: Boolean(token),
  });
}

export function useNotificationMutations(token: string | null) {
  const queryClient = useQueryClient();

  const invalidateNotifications = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey }),
    ]);
  };

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      if (!token) throw new Error("No token");
      return markNotificationRead(token, id);
    },
    onSuccess: invalidateNotifications,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token");
      return markAllNotificationsRead(token);
    },
    onSuccess: invalidateNotifications,
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token");
      return clearAllNotifications(token);
    },
    onSuccess: invalidateNotifications,
  });

  const archiveOne = useMutation({
    mutationFn: async (id: number) => {
      if (!token) throw new Error("No token");
      return archiveNotification(token, id);
    },
    onSuccess: invalidateNotifications,
  });

  return { markRead, markAllRead, clearAll, archiveOne };
}
