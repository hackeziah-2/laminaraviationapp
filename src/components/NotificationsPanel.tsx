import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Check, Trash2 } from "lucide-react";
import { useNotifications } from "../context/NotificationsContext";

type NotificationTab = "all" | "unread" | "read";

/** High enough to sit above sidebar (z-50), modals, and Swal; avoid 32-bit edge cases in some engines */
const Z_LAYER = 100_000;

function getPortalContainer(): HTMLElement {
  return document.getElementById("notifications-root") ?? document.body;
}

export function NotificationsPanel() {
  const {
    isOpen,
    close,
    notifications,
    unreadCount,
    markAllRead,
    clearAll,
    markAsRead,
    resetToSample,
  } = useNotifications();

  const [tab, setTab] = useState<NotificationTab>("all");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setTab("all");
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (tab === "unread") return notifications.filter((n) => !n.read);
    if (tab === "read") return notifications.filter((n) => n.read);
    return notifications;
  }, [notifications, tab]);

  const totalCount = notifications.length;
  const readCount = notifications.filter((n) => n.read).length;

  const tabCounts = {
    all: totalCount,
    unread: unreadCount,
    read: readCount,
  } as const;

  if (!isOpen || typeof document === "undefined") return null;

  const rootStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: Z_LAYER,
    pointerEvents: "auto",
    overscrollBehavior: "contain",
  };

  const backdropStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    pointerEvents: "auto",
  };

  /**
   * Panel must start at top: 0 so no gap shows the dark backdrop.
   * Safe area + breathing room live in paddingTop (white fills the strip).
   */
  const panelStyle: CSSProperties = {
    position: "absolute",
    zIndex: 2,
    top: 0,
    right: 0,
    bottom: 0,
    width: "min(420px, 100vw)",
    maxWidth: "100vw",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    boxShadow: "-12px 0 40px rgba(15, 23, 42, 0.12)",
    pointerEvents: "auto",
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
    paddingRight: "env(safe-area-inset-right, 0px)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  };

  const overlay = (
    <div style={rootStyle} aria-hidden={false}>
      <div style={backdropStyle} onClick={close} className="backdrop-blur-[2px]" />

      <aside
        style={panelStyle}
        className="rounded-tl-2xl rounded-bl-2xl border-l border-gray-100 sm:rounded-tl-3xl sm:rounded-bl-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — extra top padding + vertical center of bell / title block / close */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/80 px-5 pb-5 pt-2 sm:px-6 sm:pb-5 sm:pt-2">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 shadow-sm ring-1 ring-rose-100/80">
              <Bell className="h-5 w-5 text-rose-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2
                id="notifications-panel-title"
                className="text-base font-semibold tracking-tight text-gray-900"
              >
                Notifications
              </h2>
              <p className="mt-1 text-sm leading-snug text-gray-500">
                {unreadCount} unread
                {unreadCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close notifications"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Tabs — match header horizontal inset */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-1 sm:px-6">
          <div className="flex gap-0.5 sm:gap-1">
            {(
              [
                { id: "all" as const, label: "All" },
                { id: "unread" as const, label: "Unread" },
                { id: "read" as const, label: "Read" },
              ] as const
            ).map(({ id, label }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative flex-1 px-1.5 pb-3 pt-3.5 text-center text-xs transition-colors sm:px-2 sm:pb-3.5 sm:pt-4 sm:text-sm ${
                    active
                      ? "font-semibold text-gray-900"
                      : "font-medium text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {label}{" "}
                  <span
                    className={`tabular-nums ${active ? "text-gray-500" : "text-gray-400"}`}
                  >
                    ({tabCounts[id]})
                  </span>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-gray-900 sm:left-4 sm:right-4" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50/50">
          {filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 shadow-inner ring-1 ring-gray-200/80">
                <Bell className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="mt-6 text-center text-base font-semibold text-gray-700">
                {totalCount === 0
                  ? "No notifications yet"
                  : tab === "unread"
                    ? "No unread notifications"
                    : tab === "read"
                      ? "No read notifications"
                      : "Nothing to show"}
              </p>
              <p className="mt-2 max-w-[260px] text-center text-sm leading-relaxed text-gray-500">
                {totalCount === 0
                  ? "When you have notifications, they will appear here."
                  : "Try another tab or check back later."}
              </p>
              {totalCount === 0 && (
                <button
                  type="button"
                  onClick={resetToSample}
                  className="mt-6 text-sm font-medium text-rose-600 underline-offset-4 hover:underline"
                >
                  Restore sample notifications
                </button>
              )}
            </div>
          ) : (
            <ul className="flex list-none flex-col gap-4 px-5 py-5 sm:gap-4 sm:px-6 sm:py-6">
              {filtered.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read) markAsRead(n.id);
                    }}
                    className={`flex w-full items-start gap-4 rounded-xl border px-4 py-4 text-left shadow-sm transition-colors sm:gap-4 sm:px-5 sm:py-5 ${
                      !n.read
                        ? "border-gray-200 bg-white ring-1 ring-rose-100/70 hover:border-gray-300 hover:ring-rose-100"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-black/[0.06] ${n.avatarClassName}`}
                    >
                      {n.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <p
                          className={`min-w-0 text-sm leading-snug text-gray-900 ${
                            !n.read ? "font-semibold" : "font-medium text-gray-700"
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 pt-0.5 text-xs tabular-nums text-gray-400">
                          {n.time}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                        {n.message}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={markAllRead}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4 shrink-0" />
              Mark All Read
            </button>
            <button
              type="button"
              disabled={totalCount === 0}
              onClick={clearAll}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Clear All
            </button>
          </div>
        </div>
      </aside>
    </div>
  );

  return createPortal(overlay, getPortalContainer());
}
