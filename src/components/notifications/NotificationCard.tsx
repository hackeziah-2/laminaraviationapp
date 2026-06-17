import { Archive } from "lucide-react";
import type { Notification } from "../../types/notification";

function severityClasses(severity: Notification["severity"]) {
  switch (severity) {
    case "SUCCESS":
      return "border-green-200 bg-green-50/30 text-green-700";
    case "WARNING":
      return "border-amber-200 bg-amber-50/30 text-amber-700";
    case "CRITICAL":
      return "border-red-200 bg-red-50/30 text-red-700";
    default:
      return "border-blue-200 bg-blue-50/30 text-blue-700";
  }
}

type Props = {
  notification: Notification;
  onClick: () => void;
  onArchive: () => void;
  archivePending?: boolean;
};

export function NotificationCard({
  notification,
  onClick,
  onArchive,
  archivePending = false,
}: Props) {
  const isUnread = notification.status === "UNREAD";
  const severity = severityClasses(notification.severity);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left shadow-sm transition-all hover:shadow-md ${isUnread ? "ring-1 ring-rose-100/80" : ""} ${
        severity
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-700 ring-1 ring-black/5">
        {notification.sender_initials || "LM"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-gray-500">{notification.time_ago}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-600 ring-1 ring-black/5">
            {notification.module_name}
          </span>
          <div className="flex items-center gap-2">
            {isUnread && (
              <span className="inline-flex h-2 w-2 rounded-full bg-red-500" aria-label="Unread" />
            )}
            <button
              type="button"
              disabled={archivePending}
              onClick={(event) => {
                event.stopPropagation();
                onArchive();
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
