import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clearAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "../services/notificationApi";
import type { NotificationListStatus } from "../types/notification";
import { unreadCountQueryKey } from "./useUnreadCount";
import {
  findCachedNotificationStatus,
  patchNotificationQueryData,
  type InboxCacheAction,
} from "../utility/notificationInboxCache";

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
        return {
          items: [],
          page: 1,
          limit,
          total: 0,
          total_pages: 1,
          unread_count: 0,
          read_count: 0,
          inbox_total: 0,
        };
      }
      return fetchNotifications(token, { status, page, limit });
    },
    enabled: Boolean(token),
  });
}

async function refreshNotificationQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

function useInboxMutation<TVariables>(
  token: string | null,
  request: (token: string, variables: TVariables) => Promise<unknown>,
  toAction: (variables: TVariables) => InboxCacheAction,
  successMessage: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (!token) throw new Error("You need to be signed in to update notifications.");
      return request(token, variables);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueriesData({ queryKey: ["notifications"] });
      const action = toAction(variables);
      const previousStatus = findCachedNotificationStatus(previous, action);
      for (const [key, data] of previous) {
        queryClient.setQueryData(
          key,
          patchNotificationQueryData(key, data, action, previousStatus)
        );
      }
      return { previous };
    },
    onSuccess: async (result) => {
      const message = actionMessage(result, successMessage);
      applyReturnedCounts(queryClient, token, result);
      toast.success(message);
      try {
        await refreshNotificationQueries(queryClient);
      } catch {
        toast.error("The change was saved, but the notification list could not be refreshed.");
      }
    },
    onError: (error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(error instanceof Error ? error.message : "Could not update notifications");
    },
  });
}

export function useNotificationMutations(token: string | null) {
  const markRead = useInboxMutation(
    token,
    (authToken, id: number) => markNotificationRead(authToken, id),
    (id) => ({ type: "mark-read", id }),
    "Notification marked as read."
  );

  const markUnread = useInboxMutation(
    token,
    (authToken, id: number) => markNotificationUnread(authToken, id),
    (id) => ({ type: "mark-unread", id }),
    "Notification marked as unread."
  );

  const markAllRead = useInboxMutation(
    token,
    (authToken) => markAllNotificationsRead(authToken),
    () => ({ type: "mark-all-read" }),
    "All notifications marked as read."
  );

  const clearAll = useInboxMutation(
    token,
    (authToken) => clearAllNotifications(authToken),
    () => ({ type: "clear-all" }),
    "All notifications deleted."
  );

  const deleteOne = useInboxMutation(
    token,
    (authToken, id: number) => deleteNotification(authToken, id),
    (id) => ({ type: "delete-one", id }),
    "Notification deleted."
  );

  return { markRead, markUnread, markAllRead, clearAll, deleteOne };
}

function actionMessage(result: unknown, fallback: string): string {
  if (!result || typeof result !== "object") return fallback;
  const body = result as { notice?: unknown; title?: unknown; message?: unknown };
  if (typeof body.notice === "string" && body.notice.trim()) return body.notice;
  if (!("title" in body) && typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }
  return fallback;
}

function applyReturnedCounts(queryClient: QueryClient, token: string | null, result: unknown) {
  if (!token || !result || typeof result !== "object") return;
  const body = result as {
    unread_count?: unknown;
    total?: unknown;
    read_count?: unknown;
  };
  if (typeof body.unread_count !== "number") return;
  queryClient.setQueryData([...unreadCountQueryKey, token], {
    unread_count: body.unread_count,
    ...(typeof body.total === "number" ? { total: body.total } : {}),
    ...(typeof body.read_count === "number" ? { read_count: body.read_count } : {}),
  });
}
