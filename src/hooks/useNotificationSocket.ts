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
        queryClient.setQueryData([...unreadCountQueryKey, recipientKey], {
          unread_count: payload.data.unread_count,
        });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast(payload.data.title, {
          description: formatNotificationMessage(payload.data.message),
        });
      },
      onUnreadCountUpdated: (unreadCount) => {
        queryClient.setQueryData([...unreadCountQueryKey, recipientKey], {
          unread_count: unreadCount,
        });
      },
      onError: () => onSocketHealthy?.(false),
      onClose: () => onSocketHealthy?.(false),
    });

    return disconnect;
  }, [onSocketHealthy, queryClient, recipientKey, token]);
}
