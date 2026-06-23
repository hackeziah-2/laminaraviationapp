import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "../services/notificationApi";

export const unreadCountQueryKey = ["notifications", "unread-count"] as const;

export function useUnreadCount(token: string | null, pollMs?: number) {
  const recipientKey = token ?? "anonymous";
  return useQuery({
    queryKey: [...unreadCountQueryKey, recipientKey],
    queryFn: async () => {
      // #region agent log
      fetch("http://127.0.0.1:7356/ingest/06a46138-4048-4848-9c8e-520fa90eebbe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "489cc5" },
        body: JSON.stringify({
          sessionId: "489cc5",
          location: "useUnreadCount.ts:queryFn",
          message: "fetchUnreadCount invoked",
          data: { hasToken: Boolean(token) },
          timestamp: Date.now(),
          hypothesisId: "B",
        }),
      }).catch(() => {});
      // #endregion
      if (!token) return { unread_count: 0 };
      const result = await fetchUnreadCount(token);
      // #region agent log
      fetch("http://127.0.0.1:7356/ingest/06a46138-4048-4848-9c8e-520fa90eebbe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "489cc5" },
        body: JSON.stringify({
          sessionId: "489cc5",
          location: "useUnreadCount.ts:queryFn:result",
          message: "fetchUnreadCount result",
          data: { unread_count: result.unread_count },
          timestamp: Date.now(),
          hypothesisId: "B",
        }),
      }).catch(() => {});
      // #endregion
      return result;
    },
    enabled: Boolean(token),
    refetchInterval: pollMs,
  });
}
