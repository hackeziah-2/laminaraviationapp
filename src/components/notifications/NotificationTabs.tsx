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
    <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-1 sm:px-6">
      <div className="flex gap-0.5 sm:gap-1">
        {tabs.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative flex-1 px-2 pb-3 pt-3 text-sm ${
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
                <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-gray-900" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
