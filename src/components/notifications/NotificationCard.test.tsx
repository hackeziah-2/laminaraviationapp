// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationCard } from "./NotificationCard";
import type { Notification } from "../../types/notification";

afterEach(() => {
  cleanup();
});

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    uuid: "uuid-1",
    sender_initials: "KL",
    title: "Fleet Daily Update Updated",
    message:
      "Fleet Daily Update was updated for aircraft RP-C5891, RP-C6309, RP-C6476, RP-C6525, RP-C6602, RP-C7049, RP-C7096, RP-C8561, RP-C9012, RP-C9380",
    module_name: "daily-update",
    type: "INFO",
    severity: "INFO",
    status: "READ",
    reference_id: null,
    reference_type: null,
    metadata: null,
    created_at: "2026-06-17T00:00:00Z",
    read_at: "2026-06-17T00:00:00Z",
    archived_at: null,
    time_ago: "6 min ago",
    ...overrides,
  };
}

describe("NotificationCard", () => {
  it("renders full-width card with truncated title and message", () => {
    const { container } = render(
      <NotificationCard
        notification={buildNotification({
          title:
            "Fleet Daily Update Updated With An Extremely Long Title That Should Not Overflow",
        })}
        onClick={vi.fn()}
        onArchive={vi.fn()}
      />
    );

    const card = container.firstChild as HTMLElement;
    const title = screen.getByText(/Fleet Daily Update Updated With An Extremely Long Title/);
    const message = screen.getByText(
      /Fleet Daily Update updated for RP-C5891, RP-C6309, RP-C6476 and 7 more aircraft\./
    );

    expect(card.className).toContain("w-full");
    expect(card.className).toContain("overflow-hidden");
    expect(title.className).toContain("truncate");
    expect(message.className).toContain("truncate");
    expect(screen.getByText("6 min ago")).toBeInTheDocument();
  });

  it("keeps timestamp separate from content and does not render the full aircraft list", () => {
    render(
      <NotificationCard
        notification={buildNotification()}
        onClick={vi.fn()}
        onArchive={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "Fleet Daily Update updated for RP-C5891, RP-C6309, RP-C6476 and 7 more aircraft."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/RP-C9380/)).not.toBeInTheDocument();
    expect(screen.getByText("6 min ago").className).toContain("shrink-0");
    expect(screen.getByText("Archive").className).toContain("shrink-0");
  });

  it("renders twenty-plus aircraft notifications in compact form without layout overflow", () => {
    const registrations = Array.from(
      { length: 22 },
      (_, index) => `RP-C${String(6000 + index).padStart(4, "0")}`
    );
    const message = `Fleet Daily Update was updated for aircraft ${registrations.join(", ")}`;

    const { container } = render(
      <NotificationCard
        notification={buildNotification({ message })}
        onClick={vi.fn()}
        onArchive={vi.fn()}
      />
    );

    const card = container.firstChild as HTMLElement;

    expect(
      screen.getByText(
        "Fleet Daily Update updated for RP-C6000, RP-C6001, RP-C6002 and 19 more aircraft."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/RP-C6021/)).not.toBeInTheDocument();
    const contentArea = card.querySelector(".min-w-0.flex-1");
    expect(contentArea?.className).toContain("overflow-hidden");
    expect(card.className).toContain("overflow-hidden");
  });
});
