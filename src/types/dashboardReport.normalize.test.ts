import { describe, expect, it } from "vitest";
import {
  buildFuelReportQueryParams,
  createDefaultFuelReportFilters,
  defaultYoyYears,
  normalizeAircraftFuelReport,
  parseYearFromMonthYear,
  yoyYearsFromMonthRange,
} from "../types/dashboardReport.types";
import { toFuelReportApiParams } from "../api/dashboardReportApi";

describe("aircraft fuel report — YoY / month breakdown normalize", () => {
  it("normalizes yoy_flying_hours and aircraft_month_breakdown from snake_case", () => {
    const report = normalizeAircraftFuelReport({
      meta: {
        source: "ATL Logbook",
        range: { start: "2025-01", end: "2026-07" },
        generated_at: "2026-08-11T00:00:00+08:00",
        fuel_unit: "gallons",
      },
      summary: {
        total_hours: 10,
        total_fuel_gal: 100,
        avg_fuel_burn_per_hour: 10,
        total_oil_usage_qrts: 1,
        total_landings: 2,
      },
      monthly: [],
      data_quality_flags: [
        {
          code: "large_yoy_variance",
          message: "July YoY flying hours ratio 5.24x",
          origin_date: "2025-07-01",
        },
        {
          code: "fuel_burn_outlier",
          message: "RP-C20 fuel_burn_per_hour=5 is 4x vs peer median",
          aircraft_tail: "RP-C20",
          origin_date: "2025-04-01",
        },
      ],
      yoy_flying_hours: {
        years: [2025, 2026],
        months: [
          {
            month: "July",
            values: { "2025": 152, "2026": 796 },
            flag: "large_yoy_variance",
          },
        ],
        average_fh: { "2025": 474, "2026": 565 },
        grand_total: { "2025": 5685, "2026": 3953 },
      },
      aircraft_month_breakdown: {
        month_year: "Apr-25",
        aircraft: [
          {
            tail_number: "RP-C20",
            hours: 91,
            fuel: 409,
            fuel_burn_per_hour: 5,
            flag: "fuel_burn_outlier",
          },
          {
            tail_number: "RP-C12",
            hours: 0,
            fuel: 10,
            fuel_burn_per_hour: null,
            flag: null,
          },
        ],
      },
    });

    expect(report.meta.fuelUnit).toBe("gallons");
    expect(report.yoyFlyingHours.years).toEqual([2025, 2026]);
    expect(report.yoyFlyingHours.months[0]).toMatchObject({
      month: "July",
      flag: "large_yoy_variance",
      values: { "2025": 152, "2026": 796 },
    });
    expect(report.yoyFlyingHours.averageFh["2025"]).toBe(474);
    expect(report.yoyFlyingHours.grandTotal["2026"]).toBe(3953);
    expect(report.aircraftMonthBreakdown.monthYear).toBe("Apr-25");
    expect(report.aircraftMonthBreakdown.aircraft[0]).toMatchObject({
      tailNumber: "RP-C20",
      fuelBurnPerHour: 5,
      flag: "fuel_burn_outlier",
    });
    expect(report.aircraftMonthBreakdown.aircraft[1].fuelBurnPerHour).toBeNull();
    expect(report.dataQualityFlags.map((f) => f.code)).toEqual([
      "large_yoy_variance",
      "fuel_burn_outlier",
    ]);
  });

  it("maps years and month_year into API query params", () => {
    const params = buildFuelReportQueryParams(createDefaultFuelReportFilters(), {
      years: [2025, 2026],
      monthYear: "2025-04",
    });
    expect(params.years).toBe("2025,2026");
    expect(params.monthYear).toBe("2025-04");
    expect(toFuelReportApiParams(params)).toEqual({
      years: "2025,2026",
      month_year: "2025-04",
    });
  });

  it("derives YoY years from month range and defaults to last 4 years", () => {
    expect(parseYearFromMonthYear("2023-01")).toBe(2023);
    expect(parseYearFromMonthYear("bad")).toBeNull();
    expect(yoyYearsFromMonthRange("2023-01", "2026-12")).toEqual([
      2023, 2024, 2025, 2026,
    ]);
    expect(yoyYearsFromMonthRange("2024-06", "")).toEqual([2024]);
    expect(yoyYearsFromMonthRange("", "2025-03")).toEqual([2025]);
    expect(defaultYoyYears(new Date("2026-08-11T12:00:00Z"))).toEqual([
      2023, 2024, 2025, 2026,
    ]);
    expect(yoyYearsFromMonthRange("", "", new Date("2026-08-11T12:00:00Z"))).toEqual([
      2023, 2024, 2025, 2026,
    ]);
  });

  it("returns empty YoY / breakdown structures when sections are missing", () => {
    const report = normalizeAircraftFuelReport({
      meta: { range: {}, generated_at: "" },
      summary: {},
      monthly: [],
    });
    expect(report.meta.fuelUnit).toBe("gallons");
    expect(report.yoyFlyingHours).toEqual({
      years: [],
      months: [],
      averageFh: {},
      grandTotal: {},
    });
    expect(report.aircraftMonthBreakdown).toEqual({
      monthYear: null,
      aircraft: [],
    });
  });
});
