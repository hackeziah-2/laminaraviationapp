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
      if (!token) {
        return { items: [], page: 1, limit, total: 0, total_pages: 1, unread_count: 0 };
      }
      return fetchNotifications(token, { status, page, limit });
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
