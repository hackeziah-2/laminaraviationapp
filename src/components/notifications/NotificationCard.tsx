import { Archive } from "lucide-react";
import type { Notification } from "../../types/notification";
import { formatNotificationMessage } from "../../utility/notificationMessage";

function severityAccent(severity: Notification["severity"]) {
  switch (severity) {
    case "SUCCESS":
      return "border-l-emerald-500";
    case "WARNING":
      return "border-l-amber-500";
    case "CRITICAL":
      return "border-l-red-500";
    default:
      return "border-l-blue-500";
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
  const displayMessage = formatNotificationMessage(notification.message);
  const accent = severityAccent(notification.severity);

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
      className={`notification-card box-border flex w-full max-w-full min-w-0 items-start gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50/80 ${
        isUnread ? `border-l-[3px] ${accent} bg-blue-50/30` : "border-l-[3px] border-l-transparent"
      }`}
    >
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700">
        {notification.sender_initials || "LM"}
        {isUnread && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-blue-500"
            aria-label="Unread"
          />
        )}
      </div>

      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <p
          className={`notification-title truncate text-sm ${
            isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-800"
          }`}
          title={notification.title}
        >
          {notification.title}
        </p>

        <p className="notification-message mt-0.5 truncate text-xs text-gray-600" title={notification.message}>
          {displayMessage}
        </p>

        <div className="mt-2 flex min-w-0 items-center justify-end gap-2 overflow-hidden">
          <span className="shrink-0 whitespace-nowrap text-xs text-gray-500">
            {notification.time_ago}
          </span>
          <button
            type="button"
            disabled={archivePending}
            onClick={(event) => {
              event.stopPropagation();
              onArchive();
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Archive className="h-3.5 w-3.5 shrink-0" />
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
