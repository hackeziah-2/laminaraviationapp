export type NotificationType = "SYSTEM" | "APPROVAL" | "REMINDER" | "ALERT" | "INFO";

export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export type NotificationListStatus = "all" | "unread" | "read";

export interface Notification {
  id: number;
  uuid: string;
  sender_initials: string;
  title: string;
  message: string;
  module_name: string;
  type: NotificationType;
  severity: NotificationSeverity;
  status: NotificationStatus;
  reference_id: number | null;
  reference_type: string | null;
  aircraft_id?: number | string | null;
  atl_batch?: number | string | null;
  sequence_no?: string | number | null;
  metadata: NotificationMetadata | null;
  /** Backend may send `notification_metadata` instead of `metadata`. */
  notification_metadata?: NotificationMetadata | null;
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
  time_ago: string;
}

export interface NotificationMetadata {
  old_status?: string;
  new_status?: string;
  sequence_no?: string;
  atl_batch?: string | number;
  atl_batch_fk?: string | number;
  aircraft_id?: string | number;
  url?: string;
  aircraft_fk?: number;
  [key: string]: unknown;
}

export interface NotificationPagedResponse {
  items: Notification[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export type WebSocketNotificationEvent =
  | {
      event: "new_notification";
      data: {
        id: number;
        uuid: string;
        title: string;
        message: string;
        module_name: string;
        type: NotificationType;
        severity: NotificationSeverity;
        status: NotificationStatus;
        reference_id: number | null;
        reference_type: string | null;
        time_ago: string;
        unread_count: number;
      };
    }
  | {
      event: "unread_count_updated";
      data: { unread_count: number };
    };
