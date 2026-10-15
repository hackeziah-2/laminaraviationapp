import { describe, expect, it } from "vitest";
import {
  FLEET_DASHBOARD_PAGE_SIZE,
  buildMagnetoRows,
  formatTachHours,
  joinFleetDashboardAircraft,
  paginateFleetAircraft,
  remainingBeforeReplacement,
  remainingHoursClass,
} from "./fleetMagnetoRows";

describe("buildMagnetoRows", () => {
  it("keeps LH and RH magnetos from Description as separate rows", () => {
    const rows = buildMagnetoRows([
      {
        description: "RH MAGNETO",
        methodOfCompliance: "Replacement",
        partNo: "4370",
        serialNo: "9110276",
        nextDueTach: 9328.9,
      },
      {
        description: "LH MAGNETO",
        methodOfCompliance: "Replacement",
        partNo: "4371",
        serialNo: "K-K06099",
        nextDueTach: 9328.9,
      },
      { description: "OIL FILTER", partNo: "999", serialNo: "X" },
    ]);

    expect(rows.map((row) => row.label)).toEqual(["LH MAGNETO", "RH MAGNETO"]);
    expect(rows[0]).toMatchObject({
      partNumber: "4371",
      serialNumber: "K-K06099",
      dueForReplacement: 9328.9,
      dueForOh: null,
    });
    expect(rows[1].partNumber).toBe("4370");
  });

  it("uses a single MAGNETO row when the description has no side", () => {
    const rows = buildMagnetoRows([
      {
        description: "Magneto",
        methodOfCompliance: "Replacement",
        partNo: "10-682555-14",
        serialNo: "G259710G",
        nextDueTach: 5389.1,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("MAGNETO");
    expect(rows[0].dueForReplacement).toBe(5389.1);
    expect(rows[0].dueForOh).toBeNull();
  });

  it("merges overhaul and replacement records onto one magneto row", () => {
    const rows = buildMagnetoRows([
      {
        description: "RH MAGNETO OVERHAUL",
        methodOfCompliance: "Overhaul",
        partNo: "4371",
        serialNo: "OH-SN",
        nextDueTach: 2000,
        limitHours: 1500,
      },
      {
        description: "RH Magneto",
        methodOfCompliance: "Replacement",
        partNo: "4371",
        serialNo: "6031787",
        nextDueTach: 500,
        limitHours: 500,
        remainingTach: 9.8,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      label: "RH MAGNETO",
      dueForOh: 2000,
      dueForReplacement: 500,
      partNumber: "4371",
      serialNumber: "6031787",
      limitHours: 500,
      remainingTach: 9.8,
    });
  });
});

describe("remainingBeforeReplacement", () => {
  it("subtracts end-of-day tach from the replacement due tach", () => {
    expect(remainingBeforeReplacement(9328.9, 8878.7, null)).toBe(450.2);
    expect(remainingBeforeReplacement(500, 490.2, 1)).toBe(9.8);
  });

  it("falls back to the component remaining tach when end-of-day tach is missing", () => {
    expect(remainingBeforeReplacement(500, null, 9.8)).toBe(9.8);
  });
});

describe("formatTachHours and remaining color", () => {
  it("keeps one decimal and drops a trailing zero", () => {
    expect(formatTachHours(450.2)).toBe("450.2");
    expect(formatTachHours(5019)).toBe("5019");
    expect(formatTachHours(null)).toBe("");
  });

  it("highlights low remaining hours", () => {
    expect(remainingHoursClass(9.8, 500)).toContain("bg-orange-400");
    expect(remainingHoursClass(9.8, null)).toContain("bg-orange-400");
    expect(remainingHoursClass(450.2, 2000)).toContain("bg-green-200");
    expect(remainingHoursClass(450.2, null)).toBe("");
  });
});

describe("joinFleetDashboardAircraft", () => {
  const aircraft = [
    { id: 2, registration: "RP-C14", displayOrder: 2 },
    { id: 1, registration: "RP-C12", displayOrder: 1 },
  ];
  const daily = [
    {
      aircraftId: 1,
      registration: "RP-C12",
      status: "Operational",
      tachEod: 8878.7,
    },
    {
      aircraftId: 2,
      registration: "RP-C14",
      status: "AOG",
      tachEod: 2261.8,
    },
  ];

  it("joins status and end-of-day tach in display order", () => {
    const rows = joinFleetDashboardAircraft(aircraft, daily, "all");
    expect(rows.map((row) => row.registration)).toEqual(["RP-C12", "RP-C14"]);
    expect(rows[0]).toMatchObject({ status: "Operational", tachEod: 8878.7 });
  });

  it("filters by the operational status shown in the table", () => {
    const rows = joinFleetDashboardAircraft(aircraft, daily, "AOG");
    expect(rows).toHaveLength(1);
    expect(rows[0].registration).toBe("RP-C14");
  });

  it("treats legacy Running as Operational", () => {
    const rows = joinFleetDashboardAircraft(
      [{ id: 3, registration: "RP-C20" }],
      [{ registration: "rp-c20", status: "Running", tachEod: 10 }],
      "Operational"
    );
    expect(rows[0].status).toBe("Operational");
    expect(rows[0].tachEod).toBe(10);
  });
});

describe("paginateFleetAircraft", () => {
  it("pages 20 aircraft at a time", () => {
    const items = Array.from({ length: 45 }, (_, index) => index + 1);
    const first = paginateFleetAircraft(items, 1);
    const last = paginateFleetAircraft(items, 3);
    expect(FLEET_DASHBOARD_PAGE_SIZE).toBe(20);
    expect(first.pageItems).toHaveLength(20);
    expect(first.totalPages).toBe(3);
    expect(last.pageItems).toEqual([41, 42, 43, 44, 45]);
    expect(paginateFleetAircraft(items, 9).page).toBe(3);
  });
});
