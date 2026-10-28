import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectNotificationSocket } from "../services/notificationApi";
import { formatNotificationMessage } from "../utility/notificationMessage";
import { unreadCountQueryKey } from "./useUnreadCount";

export function useNotificationSocket(
  token: string | null,
  handlers: {
    onSocketHealthy?: (healthy: boolean) => void;
  } = {}
) {
  const queryClient = useQueryClient();
  const onSocketHealthy = handlers.onSocketHealthy;
  const recipientKey = token ?? "anonymous";

  useEffect(() => {
    if (!token) return;

    const disconnect = connectNotificationSocket(token, {
      onOpen: () => onSocketHealthy?.(true),
      onNewNotification: (payload) => {
        queryClient.setQueryData([...unreadCountQueryKey, recipientKey], (current) => ({
          ...(typeof current === "object" && current ? current : {}),
          unread_count: payload.data.unread_count,
        }));
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast(payload.data.title, {
          description: formatNotificationMessage(payload.data.message),
        });
      },
      onUnreadCountUpdated: (counts) => {
        queryClient.setQueryData([...unreadCountQueryKey, recipientKey], (current) => ({
          ...(typeof current === "object" && current ? current : {}),
          unread_count: counts.unread_count,
          ...(typeof counts.total === "number" ? { total: counts.total } : {}),
          ...(typeof counts.read_count === "number" ? { read_count: counts.read_count } : {}),
        }));
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
      onError: () => onSocketHealthy?.(false),
      onClose: () => onSocketHealthy?.(false),
    });

    return disconnect;
  }, [onSocketHealthy, queryClient, recipientKey, token]);
}
