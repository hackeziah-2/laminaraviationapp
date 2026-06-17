import { describe, expect, it } from "vitest";
import {
  formatNotificationMessage,
  formatNotificationMessageCountOnly,
} from "./notificationMessage";

const TEN_AIRCRAFT_MESSAGE =
  "Fleet Daily Update was updated for aircraft RP-C5891, RP-C6309, RP-C6476, RP-C6525, RP-C6602, RP-C7049, RP-C7096, RP-C8561, RP-C9012, RP-C9380";

function buildAircraftMessage(count: number): string {
  const registrations = Array.from(
    { length: count },
    (_, index) => `RP-C${String(5000 + index).padStart(4, "0")}`
  );
  return `Fleet Daily Update was updated for aircraft ${registrations.join(", ")}`;
}

describe("formatNotificationMessage", () => {
  it("returns the original message when there are three or fewer aircraft", () => {
    const shortMessage =
      "Fleet Daily Update was updated for aircraft RP-C5891, RP-C6309, RP-C6476";
    expect(formatNotificationMessage(shortMessage)).toBe(shortMessage);
  });

  it("compacts ten aircraft registrations into a readable summary", () => {
    expect(formatNotificationMessage(TEN_AIRCRAFT_MESSAGE)).toBe(
      "Fleet Daily Update updated for RP-C5891, RP-C6309, RP-C6476 and 7 more aircraft."
    );
  });

  it("compacts twenty-five aircraft registrations without layout-breaking text", () => {
    const message = buildAircraftMessage(25);
    const formatted = formatNotificationMessage(message);

    expect(formatted).toBe(
      "Fleet Daily Update updated for RP-C5000, RP-C5001, RP-C5002 and 22 more aircraft."
    );
    expect(formatted.length).toBeLessThan(message.length);
    expect(formatted).not.toContain("RP-C5024");
  });

  it("returns the original message when no aircraft registrations are found", () => {
    const message = "System maintenance completed successfully.";
    expect(formatNotificationMessage(message)).toBe(message);
  });
});

describe("formatNotificationMessageCountOnly", () => {
  it("returns a count-only summary for large aircraft lists", () => {
    expect(formatNotificationMessageCountOnly(TEN_AIRCRAFT_MESSAGE)).toBe(
      "Fleet Daily Update updated for 10 aircraft."
    );
  });
});
