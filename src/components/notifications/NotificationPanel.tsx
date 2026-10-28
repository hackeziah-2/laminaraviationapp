import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, ChevronLeft, ChevronRight, Mail, MailOpen, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NotificationCard } from "./NotificationCard";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { NotificationTabs } from "./NotificationTabs";
import { useNotificationMutations, useNotificationsQuery } from "../../hooks/useNotifications";
import { useUnreadCount } from "../../hooks/useUnreadCount";
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
import { useOverlayEscape } from "../../hooks/useOverlayEscape";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
};

function getPortalContainer(): HTMLElement {
  return document.getElementById("notifications-root") ?? document.body;
}

function notificationStatus(status: string | undefined) {
  return status?.trim().toUpperCase() ?? "";
}

type InboxCounts = {
  all: number;
  unread: number;
  read: number;
};

export function NotificationPanel({ isOpen, onClose, token }: Props) {
  const [tab, setTab] = useState<NotificationListStatus>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [counts, setCounts] = useState<InboxCounts>({ all: 0, unread: 0, read: 0 });
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
  const unreadQuery = useUnreadCount(token);
  const { markRead, markUnread, markAllRead, clearAll, deleteOne } = useNotificationMutations(token);
  const selected = data?.items.find((item) => item.id === selectedId) ?? null;
  const selectedStatus = notificationStatus(selected?.status);
  const isUpdating =
    markRead.isPending ||
    markUnread.isPending ||
    markAllRead.isPending ||
    clearAll.isPending ||
    deleteOne.isPending;
  const tabCounts: Record<NotificationListStatus, number> = counts;

  useEffect(() => {
    if (!data) return;
    const unread = unreadQuery.data?.unread_count ?? data.unread_count ?? 0;
    setCounts((current) => {
      const all =
        typeof unreadQuery.data?.total === "number"
          ? unreadQuery.data.total
          : typeof data.inbox_total === "number"
            ? data.inbox_total
            : tab === "all"
              ? data.total
              : current.all;
      const read =
        typeof unreadQuery.data?.read_count === "number"
          ? unreadQuery.data.read_count
          : typeof data.read_count === "number"
            ? data.read_count
            : Math.max(0, all - unread);
      if (current.all === all && current.unread === unread && current.read === read) {
        return current;
      }
      return { all, unread, read };
    });
  }, [data, tab, unreadQuery.data]);

  useEffect(() => {
    if (!isOpen) {
      setTab("all");
      setPage(1);
      setSelectedId(null);
      setConfirmClear(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(1, data.total_pages || 1);
    if (page > lastPage) setPage(lastPage);
  }, [data, page]);

  useEffect(() => {
    if (selectedId == null || !data) return;
    if (!data.items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [data, selectedId]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useOverlayEscape({
    enabled: isOpen,
    onClose,
  });

  const handleOpenNotification = (notification: Notification) => {
    const route = getNotificationRoute(notification);
    if (!route) {
      toast.error("This notification has no page to open.");
      return;
    }
    navigate(route);
    onClose();
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
                  {isUpdating
                    ? "Updating..."
                    : `${counts.unread} unread${counts.unread === 1 ? "" : "s"}`}
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
                      selected={notification.id === selectedId}
                      onClick={() => {
                        setConfirmClear(false);
                        setSelectedId(notification.id);
                      }}
                      onOpen={() => handleOpenNotification(notification)}
                      onDelete={() => deleteOne.mutate(notification.id)}
                      deletePending={
                        deleteOne.isPending && deleteOne.variables === notification.id
                      }
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
          <p className="mb-2 truncate text-xs text-gray-600">
            {selected ? `Selected: ${selected.title}` : "Select a notification to change its status."}
          </p>
          <div className="grid w-full min-w-0 grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (!selected) return;
                setConfirmClear(false);
                markRead.mutate(selected.id);
              }}
              disabled={!selected || selectedStatus !== "UNREAD" || markRead.isPending}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MailOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">Mark as read</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selected) return;
                setConfirmClear(false);
                markUnread.mutate(selected.id);
              }}
              disabled={!selected || selectedStatus !== "READ" || markUnread.isPending}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">Mark as unread</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmClear(false);
                markAllRead.mutate();
              }}
              disabled={markAllRead.isPending || counts.unread === 0}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4 shrink-0" />
              <span className="truncate">Mark all as read</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                setSelectedId(null);
                setPage(1);
                clearAll.mutate(undefined, {
                  onSuccess: () => setConfirmClear(false),
                });
              }}
              disabled={clearAll.isPending || counts.all === 0}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                confirmClear
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border-red-200 text-red-700 hover:bg-red-50"
              }`}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{confirmClear ? "Delete all" : "Clear all"}</span>
            </button>
          </div>
          {confirmClear && (
            <div className="mt-2 flex items-start justify-between gap-2">
              <p className="text-xs leading-snug text-red-700">
                Clear all permanently deletes every notification in your inbox.
              </p>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="shrink-0 text-xs font-medium text-gray-600 underline"
              >
                Cancel
              </button>
            </div>
          )}
          <p className="mt-2 text-[11px] leading-snug text-gray-500">
            Mark all as read keeps notifications in your inbox. Clear all permanently deletes them.
          </p>

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
