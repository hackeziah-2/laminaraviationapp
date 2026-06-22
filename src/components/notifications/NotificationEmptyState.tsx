import { Bell } from "lucide-react";

type Props = {
  tabLabel: string;
};

export function NotificationEmptyState({ tabLabel }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
        <Bell className="h-8 w-8 text-gray-400" />
      </div>
      <div>
        <p className="mt-5 text-base font-semibold text-gray-700">No notifications</p>
        <p className="mt-2 text-sm text-gray-500">
          No {tabLabel.toLowerCase()} notifications to show.
        </p>
      </div>
    </div>
  );
}
