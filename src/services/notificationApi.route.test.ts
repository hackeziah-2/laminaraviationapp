import { describe, expect, it } from "vitest";
import { getNotificationRoute } from "./notificationApi";
import type { Notification } from "../types/notification";

function buildNotification(
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: 1,
    uuid: "uuid-1",
    sender_initials: "KL",
    title: "ATL Updated",
    message: "ATL entry updated",
    module_name: "atl",
    type: "INFO",
    severity: "INFO",
    status: "UNREAD",
    reference_id: null,
    reference_type: null,
    metadata: null,
    created_at: "2026-06-22T00:00:00Z",
    read_at: null,
    archived_at: null,
    time_ago: "1 min ago",
    ...overrides,
  };
}

describe("getNotificationRoute technical-logbook", () => {
  it("builds direct search route from notification ATL fields", () => {
    expect(
      getNotificationRoute(
        buildNotification({
          sequence_no: "ATL-99",
          aircraft_id: 12,
          atl_batch: 5,
        })
      )
    ).toBe(
      "/technical-logbook?sequence_no=ATL-99&aircraft_id=12&atl_batch_fk=5"
    );
  });

  it("merges metadata URL with notification fields when URL is incomplete", () => {
    expect(
      getNotificationRoute(
        buildNotification({
          metadata: {
            url: "/technical-logbook",
            sequence_no: "ATL-44",
            aircraft_id: 3,
            atl_batch_fk: 2,
          },
        })
      )
    ).toBe(
      "/technical-logbook?sequence_no=ATL-44&aircraft_id=3&atl_batch_fk=2"
    );
  });

  it("routes logbook module notifications with ATL metadata to filtered logbook", () => {
    expect(
      getNotificationRoute(
        buildNotification({
          module_name: "logbook",
          metadata: {
            sequence_no: "ATL-7",
            aircraft_id: 1,
            atl_batch_fk: 9,
          },
        })
      )
    ).toBe(
      "/technical-logbook?sequence_no=ATL-7&aircraft_id=1&atl_batch_fk=9"
    );
  });

  it("routes ATL reference notifications to technical-logbook instead of legacy /atl", () => {
    expect(
      getNotificationRoute(
        buildNotification({
          reference_type: "ATL",
          reference_id: 15,
          sequence_no: "ATL-15",
          aircraft_id: 4,
        })
      )
    ).toBe(
      "/technical-logbook?sequence_no=ATL-15&aircraft_id=4&atl_batch_fk=15"
    );
  });
});
