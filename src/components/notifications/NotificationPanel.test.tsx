import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification, NotificationPagedResponse } from "../../types/notification";
import { NotificationPanel } from "./NotificationPanel";
import {
  clearAllNotifications,
  deleteNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "../../services/notificationApi";

vi.mock("../../services/notificationApi", () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue({ id: 1, status: "READ" }),
  markNotificationUnread: vi.fn().mockResolvedValue({ id: 2, status: "UNREAD" }),
  markAllNotificationsRead: vi.fn().mockResolvedValue({ updated_count: 1 }),
  clearAllNotifications: vi.fn().mockResolvedValue({ deleted_count: 2 }),
  deleteNotification: vi.fn().mockResolvedValue({
    message: "Notification deleted.",
    deleted_count: 1,
    unread_count: 0,
    total: 1,
    read_count: 1,
  }),
  archiveNotification: vi.fn(),
  getNotificationRoute: vi.fn(() => "/dashboard"),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
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

const inbox: NotificationPagedResponse = {
  items: [
    notification({ id: 11, status: "UNREAD", title: "Unread alert" }),
    notification({
      id: 12,
      status: "READ",
      title: "Read alert",
      read_at: "2026-10-27T00:00:00Z",
    }),
  ],
  page: 1,
  limit: 20,
  total: 2,
  total_pages: 1,
  unread_count: 1,
  read_count: 1,
  inbox_total: 2,
};

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<NotificationPanel isOpen onClose={vi.fn()} token="token" />, { wrapper });
}

describe("NotificationPanel inbox actions", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.mocked(fetchNotifications).mockResolvedValue(inbox);
    vi.mocked(fetchUnreadCount).mockResolvedValue({ unread_count: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("marks the selected notification read or unread and refreshes from the inbox APIs", async () => {
    renderPanel();
    expect(await screen.findByRole("button", { name: "All (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unread (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mark as unread" })).toBeDisabled();

    fireEvent.click(screen.getByText("Unread alert"));
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Mark as unread" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    await waitFor(() => {
      expect(markNotificationRead).toHaveBeenCalledWith("token", 11);
    });
    await waitFor(() => {
      expect(fetchNotifications).toHaveBeenCalled();
      expect(fetchUnreadCount).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText("Read alert"));
    fireEvent.click(screen.getByRole("button", { name: "Mark as unread" }));

    await waitFor(() => {
      expect(markNotificationUnread).toHaveBeenCalledWith("token", 12);
    });
  });

  it("keeps notifications when marking all read and removes them only when clear all is confirmed", async () => {
    renderPanel();
    expect(await screen.findByText("Unread alert")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Mark all as read keeps notifications in your inbox. Clear all permanently deletes them."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => {
      expect(markAllNotificationsRead).toHaveBeenCalledWith("token");
    });
    expect(clearAllNotifications).not.toHaveBeenCalled();
    expect(screen.getByText("Unread alert")).toBeInTheDocument();
    expect(screen.getByText("Read alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(clearAllNotifications).not.toHaveBeenCalled();
    expect(
      screen.getByText("Clear all permanently deletes every notification in your inbox.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete all" }));
    await waitFor(() => {
      expect(clearAllNotifications).toHaveBeenCalledWith("token");
    });
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it("opens and deletes one notification without changing the other inbox actions", async () => {
    renderPanel();
    expect(await screen.findByText("Unread alert")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Open notification" })[0]);
    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(deleteNotification).not.toHaveBeenCalled();
    expect(clearAllNotifications).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await waitFor(() => {
      expect(deleteNotification).toHaveBeenCalledWith("token", 11);
    });
    expect(clearAllNotifications).not.toHaveBeenCalled();
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Notification deleted.");
  });

  it("shows an error and keeps the notification when marking it read fails", async () => {
    vi.mocked(markNotificationRead).mockRejectedValueOnce(
      new Error("Failed to mark notification as read")
    );
    renderPanel();
    expect(await screen.findByText("Unread alert")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Unread alert"));
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to mark notification as read");
    });
    expect(screen.getByText("Unread alert")).toBeInTheDocument();
    expect(clearAllNotifications).not.toHaveBeenCalled();
    expect(deleteNotification).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
