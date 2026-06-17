import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationCard } from "./NotificationCard";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { NotificationTabs } from "./NotificationTabs";
import { useNotificationMutations, useNotificationsQuery } from "../../hooks/useNotifications";
import type { Notification, NotificationListStatus } from "../../types/notification";
import { getNotificationRoute } from "../../services/notificationApi";

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

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        className="relative right-0 top-0 z-10 flex h-full w-[min(420px,100vw)] flex-col border-l border-gray-100 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-panel-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 ring-1 ring-rose-100">
              <Bell className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 id="notifications-panel-title" className="text-base font-semibold text-gray-900">
                Notifications
              </h2>
              <p className="text-xs text-gray-500">
                {unreadCount} unread{unreadCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close notifications"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <NotificationTabs tab={tab} onTabChange={setTab} counts={tabCounts} />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50/50 px-5 py-5 sm:px-6">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading notifications...</p>
          ) : (data?.items.length ?? 0) === 0 ? (
            <NotificationEmptyState tabLabel={tab} />
          ) : (
            <ul className="space-y-3">
              {data?.items.map((notification) => (
                <li key={notification.id}>
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

        <div className="border-t border-gray-100 bg-white px-6 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          </div>
          {(data?.total_pages ?? 1) > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span>
                Page {data?.page ?? 1} of {data?.total_pages ?? 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data?.total_pages ?? p, p + 1))}
                disabled={page >= (data?.total_pages ?? 1)}
                className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>,
    getPortalContainer()
  );
}
