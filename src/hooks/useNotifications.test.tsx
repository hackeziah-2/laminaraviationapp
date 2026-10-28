import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification, NotificationPagedResponse } from "../types/notification";
import { notificationsQueryKey, useNotificationMutations } from "./useNotifications";
import { unreadCountQueryKey } from "./useUnreadCount";
import {
  clearAllNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "../services/notificationApi";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../services/notificationApi", () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue({ id: 1, status: "READ" }),
  markNotificationUnread: vi.fn().mockResolvedValue({ id: 2, status: "UNREAD" }),
  markAllNotificationsRead: vi.fn().mockResolvedValue({ updated_count: 1 }),
  clearAllNotifications: vi.fn().mockResolvedValue({ deleted_count: 2 }),
  deleteNotification: vi.fn().mockResolvedValue({
    message: "Notification deleted.",
    deleted_count: 1,
    unread_count: 1,
    total: 1,
    read_count: 1,
  }),
  archiveNotification: vi.fn(),
}));

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

const token = "header.payload.sig";

function inboxPage(): NotificationPagedResponse {
  return {
    items: [
      notification({ id: 1, status: "UNREAD" }),
      notification({ id: 2, status: "READ", title: "Already read", read_at: "2026-10-27T00:00:00Z" }),
    ],
    page: 1,
    limit: 20,
    total: 2,
    total_pages: 1,
    unread_count: 1,
    inbox_total: 2,
  };
}

describe("useNotificationMutations", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(notificationsQueryKey(token, "all", 1, 20), inboxPage());
    queryClient.setQueryData([...unreadCountQueryKey, token], { unread_count: 1 });
    vi.clearAllMocks();
  });

  function renderMutations() {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return renderHook(() => useNotificationMutations(token), { wrapper });
  }

  it("marks the selected notification read and refreshes the unread count", async () => {
    const { result } = renderMutations();

    await act(async () => {
      await result.current.markRead.mutateAsync(1);
    });

    expect(markNotificationRead).toHaveBeenCalledWith(token, 1);
    const list = queryClient.getQueryData<NotificationPagedResponse>(
      notificationsQueryKey(token, "all", 1, 20)
    );
    expect(list?.items.find((item) => item.id === 1)?.status).toBe("READ");
    expect(list?.total).toBe(2);
    expect(queryClient.getQueryData([...unreadCountQueryKey, token])).toEqual({ unread_count: 0 });
  });

  it("marks the selected notification unread", async () => {
    const { result } = renderMutations();

    await act(async () => {
      await result.current.markUnread.mutateAsync(2);
    });

    expect(markNotificationUnread).toHaveBeenCalledWith(token, 2);
    const list = queryClient.getQueryData<NotificationPagedResponse>(
      notificationsQueryKey(token, "all", 1, 20)
    );
    expect(list?.items.find((item) => item.id === 2)?.status).toBe("UNREAD");
    expect(list?.total).toBe(2);
    expect(queryClient.getQueryData([...unreadCountQueryKey, token])).toEqual({ unread_count: 2 });
  });

  it("marks every notification read and keeps them in the inbox", async () => {
    const { result } = renderMutations();

    await act(async () => {
      await result.current.markAllRead.mutateAsync();
    });

    expect(markAllNotificationsRead).toHaveBeenCalledWith(token);
    expect(clearAllNotifications).not.toHaveBeenCalled();
    const list = queryClient.getQueryData<NotificationPagedResponse>(
      notificationsQueryKey(token, "all", 1, 20)
    );
    expect(list?.items).toHaveLength(2);
    expect(list?.items.every((item) => item.status === "READ")).toBe(true);
    expect(list?.inbox_total).toBe(2);
    expect(queryClient.getQueryData([...unreadCountQueryKey, token])).toEqual({ unread_count: 0 });
  });

  it("clears every notification from the inbox", async () => {
    const { result } = renderMutations();

    await act(async () => {
      await result.current.clearAll.mutateAsync();
    });

    expect(clearAllNotifications).toHaveBeenCalledWith(token);
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("All notifications deleted.");
    const list = queryClient.getQueryData<NotificationPagedResponse>(
      notificationsQueryKey(token, "all", 1, 20)
    );
    expect(list?.items).toEqual([]);
    expect(list?.total).toBe(0);
    expect(list?.inbox_total).toBe(0);
    expect(queryClient.getQueryData([...unreadCountQueryKey, token])).toEqual({ unread_count: 0 });
  });

  it("deletes one notification and refreshes the remaining counts", async () => {
    const { result } = renderMutations();

    await act(async () => {
      await result.current.deleteOne.mutateAsync(1);
    });

    expect(deleteNotification).toHaveBeenCalledWith(token, 1);
    expect(toast.success).toHaveBeenCalledWith("Notification deleted.");
    const list = queryClient.getQueryData<NotificationPagedResponse>(
      notificationsQueryKey(token, "all", 1, 20)
    );
    expect(list?.items.map((item) => item.id)).toEqual([2]);
    expect(list?.total).toBe(1);
    expect(list?.inbox_total).toBe(1);
    expect(queryClient.getQueryData([...unreadCountQueryKey, token])).toEqual({
      unread_count: 1,
      total: 1,
      read_count: 1,
    });
  });
});
