import { Trash2 } from "lucide-react";
import type { Notification } from "../../types/notification";
import { formatNotificationMessage } from "../../utility/notificationMessage";

type Props = {
  notification: Notification;
  selected?: boolean;
  onClick: () => void;
  onOpen?: () => void;
  onDelete: () => void;
  deletePending?: boolean;
};

export function NotificationCard({
  notification,
  selected = false,
  onClick,
  onOpen,
  onDelete,
  deletePending = false,
}: Props) {
  const isUnread = notification.status === "UNREAD";
  const displayMessage = formatNotificationMessage(notification.message);

  return (
    <div
      tabIndex={0}
      data-selected={selected ? "true" : "false"}
      data-read-state={isUnread ? "unread" : "read"}
      data-severity={notification.severity}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="notification-card box-border flex w-full max-w-full min-w-0 items-start gap-3 overflow-hidden rounded-lg border px-4 py-3 text-left"
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
          className="notification-title truncate text-sm"
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
          {onOpen && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
              className="inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Open notification"
            >
              Open
            </button>
          )}
          <button
            type="button"
            disabled={deletePending}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
