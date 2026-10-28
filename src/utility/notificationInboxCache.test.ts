import { describe, expect, it } from "vitest";
import type { Notification, NotificationPagedResponse } from "../types/notification";
import {
  applyInboxActionToPage,
  applyInboxActionToUnreadCount,
  patchNotificationQueryData,
} from "./notificationInboxCache";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    uuid: "uuid-1",
    sender_initials: "KL",
    title: "Inspection due",
    message: "Review the aircraft",
    module_name: "maintenance",
    type: "INFO",
    severity: "INFO",
    status: "UNREAD",
    reference_id: null,
    reference_type: null,
    metadata: null,
    created_at: "2026-10-27T00:00:00Z",
    read_at: null,
    archived_at: null,
    time_ago: "1 min ago",
    ...overrides,
  };
}

function page(items: Notification[], unreadCount = 1): NotificationPagedResponse {
  return {
    items,
    page: 1,
    limit: 20,
    total: items.length,
    total_pages: 1,
    unread_count: unreadCount,
    inbox_total: items.length,
  };
}

describe("notification inbox cache", () => {
  it("marks one notification read and drops it from the unread list", () => {
    const source = page([
      notification({ id: 4, status: "UNREAD" }),
      notification({ id: 5, status: "READ", read_at: "2026-10-27T00:00:00Z" }),
    ], 1);
    const unreadSource = page([notification({ id: 4, status: "UNREAD" })], 1);

    const all = applyInboxActionToPage(source, "all", { type: "mark-read", id: 4 });
    const unread = applyInboxActionToPage(unreadSource, "unread", { type: "mark-read", id: 4 });

    expect(all.items.map((item) => item.status)).toEqual(["READ", "READ"]);
    expect(all.items.every((item) => item.status !== "ARCHIVED" && item.archived_at == null)).toBe(true);
    expect(all.total).toBe(2);
    expect(all.unread_count).toBe(0);
    expect(all.read_count).toBe(2);
    expect(all.inbox_total).toBe(2);
    expect(unread.items).toEqual([]);
    expect(unread.total).toBe(0);
    expect(unread.inbox_total).toBe(1);
    expect(unread.read_count).toBe(1);
    expect(applyInboxActionToUnreadCount(3, { type: "mark-read", id: 4 }, "UNREAD")).toBe(2);
  });

  it("marks one notification unread and keeps it in the inbox", () => {
    const source = page([
      notification({ id: 8, status: "READ", read_at: "2026-10-27T00:00:00Z" }),
    ], 0);

    const updated = applyInboxActionToPage(source, "all", { type: "mark-unread", id: 8 });
    const readTab = applyInboxActionToPage(source, "read", { type: "mark-unread", id: 8 });

    expect(updated.items[0]?.status).toBe("UNREAD");
    expect(updated.items[0]?.read_at).toBeNull();
    expect(updated.total).toBe(1);
    expect(updated.unread_count).toBe(1);
    expect(readTab.items).toEqual([]);
    expect(applyInboxActionToUnreadCount(0, { type: "mark-unread", id: 8 }, "READ")).toBe(1);
  });

  it("marks every inbox notification read without removing them", () => {
    const source = page([
      notification({ id: 1, status: "UNREAD" }),
      notification({ id: 2, status: "READ", read_at: "2026-10-27T00:00:00Z" }),
    ], 1);

    const updated = applyInboxActionToPage(source, "all", { type: "mark-all-read" });

    expect(updated.items).toHaveLength(2);
    expect(updated.items.every((item) => item.status === "READ" && item.archived_at == null)).toBe(true);
    expect(updated.total).toBe(2);
    expect(updated.inbox_total).toBe(2);
    expect(updated.read_count).toBe(2);
    expect(updated.unread_count).toBe(0);
    expect(applyInboxActionToUnreadCount(4, { type: "mark-all-read" })).toBe(0);
  });

  it("clears the inbox instead of only marking notifications read", () => {
    const source = page([
      notification({ id: 1, status: "UNREAD" }),
      notification({ id: 2, status: "READ", read_at: "2026-10-27T00:00:00Z" }),
    ], 1);

    const cleared = applyInboxActionToPage(source, "all", { type: "clear-all" });

    expect(cleared.items).toEqual([]);
    expect(cleared.total).toBe(0);
    expect(cleared.inbox_total).toBe(0);
    expect(cleared.read_count).toBe(0);
    expect(cleared.unread_count).toBe(0);
    expect(applyInboxActionToUnreadCount(4, { type: "clear-all" })).toBe(0);
  });

  it("patches the unread count query and the list query for the signed-in cache key", () => {
    const listKey = ["notifications", "token", "all", 1, 20] as const;
    const countKey = ["notifications", "unread-count", "token"] as const;
    const list = page([notification({ id: 9, status: "UNREAD" })], 1);

    const nextList = patchNotificationQueryData(listKey, list, { type: "mark-read", id: 9 }, "UNREAD");
    const nextCount = patchNotificationQueryData(
      countKey,
      { unread_count: 1 },
      { type: "mark-read", id: 9 },
      "UNREAD"
    );

    expect(nextList).toMatchObject({ unread_count: 0, total: 1, items: [{ id: 9, status: "READ" }] });
    expect(nextCount).toEqual({ unread_count: 0 });
  });
});
