import { useNotifications } from "../context/NotificationsContext";
import { NotificationPanel as NotificationPanelContent } from "./notifications/NotificationPanel";

export function NotificationsPanel() {
  const { isOpen, close, token } = useNotifications();
  return <NotificationPanelContent isOpen={isOpen} onClose={close} token={token} />;
}
