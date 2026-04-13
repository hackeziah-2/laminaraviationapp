import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatarInitials: string;
  avatarClassName: string;
};

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "Maintenance reminder",
    message: "Aircraft N12345 — inspection window opens in 48 hours.",
    time: "2 min ago",
    read: false,
    avatarInitials: "MQ",
    avatarClassName: "bg-sky-100 text-sky-800",
  },
  {
    id: "2",
    title: "Logbook entry approved",
    message: "Your technical log entry for N67890 was signed off.",
    time: "1 hour ago",
    read: false,
    avatarInitials: "AK",
    avatarClassName: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "3",
    title: "Fleet report ready",
    message: "Monthly utilization summary is available to download.",
    time: "Yesterday",
    read: true,
    avatarInitials: "SY",
    avatarClassName: "bg-violet-100 text-violet-800",
  },
];

type NotificationsContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
  markAsRead: (id: string) => void;
  resetToSample: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    () => [...SAMPLE_NOTIFICATIONS]
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /** Restore demo notifications after "Clear all" (optional recovery) */
  const resetToSample = useCallback(() => {
    setNotifications([...SAMPLE_NOTIFICATIONS]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      notifications,
      unreadCount,
      markAllRead,
      clearAll,
      markAsRead,
      resetToSample,
    }),
    [
      isOpen,
      open,
      close,
      notifications,
      unreadCount,
      markAllRead,
      clearAll,
      markAsRead,
      resetToSample,
    ]
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
