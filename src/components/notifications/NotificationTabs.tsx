import type { NotificationListStatus } from "../../types/notification";

type Props = {
  tab: NotificationListStatus;
  onTabChange: (tab: NotificationListStatus) => void;
  counts: Record<NotificationListStatus, number>;
};

const tabs: Array<{ id: NotificationListStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

export function NotificationTabs({ tab, onTabChange, counts }: Props) {
  return (
    <div className="overflow-hidden border-b border-gray-200/80 pt-1">
      <div className="flex min-w-0 gap-1">
        {tabs.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative min-w-0 flex-1 truncate px-1.5 pb-3 pt-2.5 text-sm transition-colors ${
                active
                  ? "font-semibold text-gray-900"
                  : "font-medium text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}{" "}
              <span className={`tabular-nums ${active ? "text-gray-500" : "text-gray-400"}`}>
                ({counts[id]})
              </span>
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gray-900" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
