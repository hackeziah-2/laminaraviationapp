import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: { get: vi.fn() },
}));

import apiClient from "./index";
import {
  AIRCRAFT_FLEET_DASHBOARD_PATH,
  getAircraftFleetDashboard,
  normalizeAircraftFleetDashboard,
} from "./aircraftFleetDashboardApi";

const payload = {
  items: [
    {
      aircraft_ident: "RP-C603",
      status: "Operational",
      eod_tach: "490.2",
      components: [
        {
          magneto: "LH MAGNETO",
          due_for_replacement_tach: "390.0",
          remaining_hours: "12.5",
          part_number: "4370",
          serial_number: "6031786",
        },
      ],
    },
    {
      aircraft_ident: "RP-C111",
      status: null,
      eod_tach: null,
      components: [],
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
  pages: 1,
};

describe("normalizeAircraftFleetDashboard", () => {
  it("maps the report payload to camelCase rows", () => {
    expect(normalizeAircraftFleetDashboard(payload)).toEqual({
      items: [
        {
          aircraftIdent: "RP-C603",
          status: "Operational",
          eodTach: "490.2",
          components: [
            {
              magneto: "LH MAGNETO",
              dueForReplacementTach: "390.0",
              remainingHours: "12.5",
              partNumber: "4370",
              serialNumber: "6031786",
            },
          ],
        },
        {
          aircraftIdent: "RP-C111",
          status: null,
          eodTach: null,
          components: [],
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
      pages: 1,
    });
  });
});

describe("getAircraftFleetDashboard", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });
  });

  it("GETs the fleet dashboard report with page, search, and status", async () => {
    const result = await getAircraftFleetDashboard({
      page: 2,
      pageSize: 20,
      search: " c603 ",
      status: "AOG",
    });

    expect(apiClient.get).toHaveBeenCalledWith(AIRCRAFT_FLEET_DASHBOARD_PATH, {
      params: {
        page: 2,
        page_size: 20,
        search: "c603",
        status: "AOG",
      },
    });
    expect(result.items[0].aircraftIdent).toBe("RP-C603");
  });

  it("omits an all-aircraft status filter", async () => {
    await getAircraftFleetDashboard({ status: "all", search: "  " });

    expect(apiClient.get).toHaveBeenCalledWith(AIRCRAFT_FLEET_DASHBOARD_PATH, {
      params: { page: 1, page_size: 20 },
    });
  });
});
