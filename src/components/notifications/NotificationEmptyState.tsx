import { Bell } from "lucide-react";

type Props = {
  tabLabel: string;
};

export function NotificationEmptyState({ tabLabel }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
        <Bell className="h-5 w-5 text-gray-400" />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-700">No notifications</p>
      <p className="mt-1 text-xs text-gray-500">
        No {tabLabel.toLowerCase()} notifications to show.
      </p>
    </div>
  );
}
