import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNotificationSocket } from "../hooks/useNotificationSocket";
import { useUnreadCount } from "../hooks/useUnreadCount";

type NotificationsContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  unreadCount: number;
  token: string | null;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSocketHealthy, setIsSocketHealthy] = useState(true);
  const token = localStorage.getItem("access_token");

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  useNotificationSocket(token, { onSocketHealthy: setIsSocketHealthy });
  const { data, status: unreadQueryStatus, fetchStatus, isError, error } = useUnreadCount(
    token,
    isSocketHealthy ? undefined : 45000
  );

  const unreadCount = data?.unread_count ?? 0;

  // #region agent log
  fetch("http://127.0.0.1:7356/ingest/06a46138-4048-4848-9c8e-520fa90eebbe", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "489cc5" },
    body: JSON.stringify({
      sessionId: "489cc5",
      location: "NotificationsContext.tsx:render",
      message: "unread count query state",
      data: {
        hasToken: Boolean(token),
        tokenLen: token?.length ?? 0,
        isSocketHealthy,
        unreadCount,
        unreadQueryStatus,
        fetchStatus,
        isError,
        errorMsg: isError ? String(error) : null,
      },
      timestamp: Date.now(),
      runId: "post-fix",
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      unreadCount,
      token,
    }),
    [close, isOpen, open, token, unreadCount]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
