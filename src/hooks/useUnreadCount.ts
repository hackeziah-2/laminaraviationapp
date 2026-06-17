import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "../services/notificationApi";

export const unreadCountQueryKey = ["notifications", "unread-count"] as const;

export function useUnreadCount(token: string | null, pollMs?: number) {
  const recipientKey = token ?? "anonymous";
  return useQuery({
    queryKey: [...unreadCountQueryKey, recipientKey],
    queryFn: async () => {
      if (!token) return { unread_count: 0 };
      return fetchUnreadCount(token);
    },
    enabled: Boolean(token),
    refetchInterval: pollMs,
  });
}
