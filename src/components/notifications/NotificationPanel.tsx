import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationCard } from "./NotificationCard";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { NotificationTabs } from "./NotificationTabs";
import { useNotificationMutations, useNotificationsQuery } from "../../hooks/useNotifications";
import type { Notification, NotificationListStatus } from "../../types/notification";
import { getNotificationRoute } from "../../services/notificationApi";
import {
  getNotificationDrawerStyle,
  getNotificationOverlayStyle,
  NOTIFICATION_CONTENT_PADDING_CLASS,
  NOTIFICATION_DRAWER_PADDING_CLASS,
} from "../../constants/notificationCenterLayout";
import { useOptionalAppLayout } from "../../context/AppLayoutContext";
import { useIsLgUp } from "../../hooks/useIsLgUp";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
};

function getPortalContainer(): HTMLElement {
  return document.getElementById("notifications-root") ?? document.body;
}

export function NotificationPanel({ isOpen, onClose, token }: Props) {
  const [tab, setTab] = useState<NotificationListStatus>("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { sidebarCollapsed } = useOptionalAppLayout();
  const isLgUp = useIsLgUp();

  const overlayStyle = useMemo(
    () => getNotificationOverlayStyle(sidebarCollapsed, isLgUp),
    [isLgUp, sidebarCollapsed]
  );

  const drawerStyle = useMemo(
    () => getNotificationDrawerStyle(sidebarCollapsed, isLgUp),
    [isLgUp, sidebarCollapsed]
  );

  const { data, isLoading } = useNotificationsQuery(token, tab, page, 20);
  const { markRead, markAllRead, clearAll, archiveOne } = useNotificationMutations(token);
  const unreadCount = data?.unread_count ?? 0;
  const tabCounts: Record<NotificationListStatus, number> = {
    all: data?.total ?? 0,
    unread: unreadCount,
    read: Math.max(0, (data?.total ?? 0) - unreadCount),
  };

  useEffect(() => {
    if (!isOpen) {
      setTab("all");
      setPage(1);
    }
  }, [isOpen]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const handleClickNotification = async (notification: Notification) => {
    const route = getNotificationRoute(notification);
    if (route) {
      navigate(route);
      onClose();
    }
    if (notification.status === "UNREAD") {
      await markRead.mutateAsync(notification.id);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const headerClass = `w-full min-w-0 ${NOTIFICATION_DRAWER_PADDING_CLASS}`;

  return createPortal(
    <>
      <div
        className="notification-panel-overlay fixed top-0 z-[60] h-screen overflow-hidden bg-black/40 backdrop-blur-[2px] transition-[left,width] duration-300"
        style={overlayStyle}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="notification-panel fixed top-0 z-[61] flex h-screen min-h-0 flex-col overflow-hidden border-l border-gray-200 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.12)] transition-[width,max-width] duration-300"
        style={drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-panel-title"
      >
        <header className={`${headerClass} shrink-0 border-b border-gray-200 py-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Bell className="h-4 w-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <h2
                  id="notifications-panel-title"
                  className="notification-title truncate text-sm font-semibold text-gray-900"
                >
                  Notifications
                </h2>
                <p className="truncate text-xs text-gray-500">
                  {unreadCount} unread{unreadCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className={`${headerClass} shrink-0 border-b border-gray-200`}>
          <NotificationTabs tab={tab} onTabChange={setTab} counts={tabCounts} />
        </div>

        <div className="notification-content min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50">
          <div className={`${NOTIFICATION_CONTENT_PADDING_CLASS} w-full min-w-0`}>
            {isLoading ? (
              <p className="py-8 text-center text-sm text-gray-500">Loading notifications...</p>
            ) : (data?.items.length ?? 0) === 0 ? (
              <NotificationEmptyState tabLabel={tab} />
            ) : (
              <ul className="w-full min-w-0 space-y-2">
                {data?.items.map((notification) => (
                  <li key={notification.id} className="w-full min-w-0">
                    <NotificationCard
                      notification={notification}
                      onClick={() => void handleClickNotification(notification)}
                      onArchive={() => archiveOne.mutate(notification.id)}
                      archivePending={archiveOne.isPending}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer
          className={`${headerClass} shrink-0 border-t border-gray-200 bg-white py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]`}
        >
          <div className="flex w-full min-w-0 gap-2">
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4 shrink-0" />
              <span className="truncate">Mark all read</span>
            </button>
            <button
              type="button"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Clear all</span>
            </button>
          </div>

          {(data?.total_pages ?? 1) > 1 && (
            <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 text-xs text-gray-600">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex shrink-0 items-center gap-1 rounded border border-gray-200 px-2 py-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="truncate tabular-nums">
                Page {data?.page ?? 1} of {data?.total_pages ?? 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data?.total_pages ?? p, p + 1))}
                disabled={page >= (data?.total_pages ?? 1)}
                className="inline-flex shrink-0 items-center gap-1 rounded border border-gray-200 px-2 py-1 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </footer>
      </aside>
    </>,
    getPortalContainer()
  );
}
