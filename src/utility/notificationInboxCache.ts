import type {
  Notification,
  NotificationListStatus,
  NotificationPagedResponse,
  NotificationStatus,
} from "../types/notification";

export type InboxCacheAction =
  | { type: "mark-read"; id: number }
  | { type: "mark-unread"; id: number }
  | { type: "archive-one"; id: number }
  | { type: "delete-one"; id: number }
  | { type: "mark-all-read" }
  | { type: "clear-all" };

export function isNotificationPage(value: unknown): value is NotificationPagedResponse {
  if (!value || typeof value !== "object") return false;
  const page = value as NotificationPagedResponse;
  return (
    Array.isArray(page.items) &&
    typeof page.unread_count === "number" &&
    typeof page.total === "number"
  );
}

function isUnreadCountResponse(value: unknown): value is { unread_count: number } {
  if (!value || typeof value !== "object") return false;
  const record = value as { unread_count?: unknown; items?: unknown };
  return typeof record.unread_count === "number" && !("items" in record);
}

function listStatusFromQueryKey(
  queryKey: readonly unknown[]
): NotificationListStatus | null {
  const status = queryKey[2];
  if (status === "all" || status === "unread" || status === "read") return status;
  return null;
}

function pageCount(total: number, limit: number): number {
  if (total <= 0) return 0;
  return Math.ceil(total / Math.max(1, limit));
}

function inboxTotalOf(page: NotificationPagedResponse): number {
  if (typeof page.inbox_total === "number") return page.inbox_total;
  return page.unread_count + (page.read_count ?? 0);
}

function readCountOf(page: NotificationPagedResponse): number {
  if (typeof page.read_count === "number") return page.read_count;
  return Math.max(0, inboxTotalOf(page) - page.unread_count);
}

function withReadState(
  notification: Notification,
  status: Extract<NotificationStatus, "READ" | "UNREAD">
): Notification {
  if (status === "READ") {
    return {
      ...notification,
      status,
      read_at: notification.read_at ?? new Date().toISOString(),
    };
  }
  return {
    ...notification,
    status,
    read_at: null,
  };
}

function applyOne(
  page: NotificationPagedResponse,
  listStatus: NotificationListStatus,
  action: Extract<InboxCacheAction, { type: "mark-read" | "mark-unread" | "archive-one" | "delete-one" }>
): NotificationPagedResponse {
  const current = page.items.find((item) => item.id === action.id);
  if (!current || current.status === "ARCHIVED") return page;
  if (action.type === "archive-one" || action.type === "delete-one") {
    const unreadDelta = current.status === "UNREAD" ? -1 : 0;
    const readDelta = current.status === "READ" ? -1 : 0;
    const items = page.items.filter((item) => item.id !== action.id);
    const total = Math.max(0, page.total - 1);
    return {
      ...page,
      items,
      total,
      total_pages: pageCount(total, page.limit),
      unread_count: Math.max(0, page.unread_count + unreadDelta),
      read_count: Math.max(0, readCountOf(page) + readDelta),
      inbox_total: Math.max(0, inboxTotalOf(page) - 1),
    };
  }

  const nextStatus = action.type === "mark-read" ? "READ" : "UNREAD";
  if (current.status === nextStatus) return page;

  const leavesFilteredTab =
    (listStatus === "unread" && nextStatus !== "UNREAD") ||
    (listStatus === "read" && nextStatus !== "READ");
  const unreadDelta = nextStatus === "READ" ? -1 : 1;
  const readDelta = nextStatus === "READ" ? 1 : -1;
  const items = leavesFilteredTab
    ? page.items.filter((item) => item.id !== action.id)
    : page.items.map((item) =>
        item.id === action.id ? withReadState(item, nextStatus) : item
      );
  const total = leavesFilteredTab ? Math.max(0, page.total - 1) : page.total;

  return {
    ...page,
    items,
    total,
    total_pages: pageCount(total, page.limit),
    unread_count: Math.max(0, page.unread_count + unreadDelta),
    read_count: Math.max(0, readCountOf(page) + readDelta),
    inbox_total: inboxTotalOf(page),
  };
}

export function applyInboxActionToPage(
  page: NotificationPagedResponse,
  listStatus: NotificationListStatus,
  action: InboxCacheAction
): NotificationPagedResponse {
  if (action.type === "clear-all") {
    return {
      ...page,
      items: [],
      total: 0,
      total_pages: 0,
      unread_count: 0,
      read_count: 0,
      inbox_total: 0,
    };
  }

  if (action.type === "mark-all-read") {
    const inboxTotal = inboxTotalOf(page);
    if (listStatus === "unread") {
      return {
        ...page,
        items: [],
        total: 0,
        total_pages: 0,
        unread_count: 0,
        read_count: inboxTotal,
        inbox_total: inboxTotal,
      };
    }
    return {
      ...page,
      unread_count: 0,
      read_count: inboxTotal,
      inbox_total: inboxTotal,
      total: listStatus === "read" ? inboxTotal : page.total,
      items: page.items.map((item) =>
        item.status === "UNREAD" ? withReadState(item, "READ") : item
      ),
    };
  }

  return applyOne(page, listStatus, action);
}

export function applyInboxActionToUnreadCount(
  unreadCount: number,
  action: InboxCacheAction,
  previousStatus?: NotificationStatus
): number {
  if (action.type === "clear-all" || action.type === "mark-all-read") return 0;
  if (action.type === "mark-read" && previousStatus === "UNREAD") {
    return Math.max(0, unreadCount - 1);
  }
  if (
    (action.type === "archive-one" || action.type === "delete-one") &&
    previousStatus === "UNREAD"
  ) {
    return Math.max(0, unreadCount - 1);
  }
  if (action.type === "mark-unread" && previousStatus === "READ") {
    return unreadCount + 1;
  }
  return unreadCount;
}

export function findCachedNotificationStatus(
  entries: Array<[readonly unknown[], unknown]>,
  action: InboxCacheAction
): NotificationStatus | undefined {
  if (
    action.type !== "mark-read" &&
    action.type !== "mark-unread" &&
    action.type !== "archive-one" &&
    action.type !== "delete-one"
  ) {
    return undefined;
  }
  for (const [, data] of entries) {
    if (!isNotificationPage(data)) continue;
    const match = data.items.find((item) => item.id === action.id);
    if (match) return match.status;
  }
  return undefined;
}

export function patchNotificationQueryData(
  queryKey: readonly unknown[],
  data: unknown,
  action: InboxCacheAction,
  previousStatus?: NotificationStatus
): unknown {
  if (isUnreadCountResponse(data)) {
    return {
      unread_count: applyInboxActionToUnreadCount(
        data.unread_count,
        action,
        previousStatus
      ),
    };
  }
  if (!isNotificationPage(data)) return data;
  const listStatus = listStatusFromQueryKey(queryKey);
  if (!listStatus) return data;
  return applyInboxActionToPage(data, listStatus, action);
}
