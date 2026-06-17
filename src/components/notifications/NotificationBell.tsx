import { Bell } from "lucide-react";

type Props = {
  unreadCount: number;
  isOpen: boolean;
  onClick: () => void;
  className?: string;
};

export function NotificationBell({ unreadCount, isOpen, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={
        unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"
      }
      aria-expanded={isOpen}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <Bell className="h-5 w-5 shrink-0" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 z-10 flex min-h-[1.125rem] min-w-[1.125rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-red-600 bg-white px-1 text-[11px] font-bold leading-none text-red-600 shadow-md ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </span>
    </button>
  );
}
