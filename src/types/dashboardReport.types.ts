/** Aircraft Fuel Consumption Report — API contracts (camelCase after normalization). */

export type FuelReportPeriod = "weekly" | "monthly" | "yearly";

export type AircraftFuelReportQueryParams = {
  period: FuelReportPeriod;
  year: number;
  month?: number;
  week?: number;
  aircraftId?: number;
};

export type ChartSeries = {
  key: string;
  name: string;
  chartType: "bar" | "line";
  unit: string;
  yAxis: "left" | "right";
  data: Array<number | null>;
};

export type PeriodTotals = {
  totalFlightHours: number;
  totalFuelGallons: number;
  totalOilQuarts: number;
  fuelBurnPerHour: number | null;
  atlRecordCount: number;
  incompleteRecordCount: number;
  invalidRecordCount: number;
};

export type AircraftFuelMetrics = {
  aircraftId: number;
  aircraftRegistration: string;
  totalFlightHours: number;
  leftFuelGallons: number;
  rightFuelGallons: number;
  totalFuelGallons: number;
  totalOilQuarts: number;
  fuelBurnPerHour: number | null;
  atlRecordCount: number;
  incompleteRecordCount: number;
  invalidRecordCount: number;
};

export type AircraftPeriodBreakdown = {
  periodKey: string;
  periodLabel: string;
  aircraft: AircraftFuelMetrics[];
  totals: PeriodTotals;
};

export type AircraftFuelReportFilters = {
  year: number;
  month: number | null;
  week: number | null;
  aircraftId: number | null;
  startDate: string;
  endDate: string;
};

export type AircraftFuelReportResponse = {
  period: FuelReportPeriod;
  filters: AircraftFuelReportFilters;
  categories: string[];
  series: ChartSeries[];
  aircraftBreakdown: AircraftPeriodBreakdown[];
  grandTotal: PeriodTotals;
};

/** Draft / applied filter form state (UI). */
export type FuelReportFilterState = {
  period: FuelReportPeriod;
  year: number;
  month: number;
  week: number;
  aircraftId: number | null;
};

export function formatReportNumber(
  value: number | null | undefined,
  maxDecimals = 2
): string {
  if (value == null || value === undefined) return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatReportInteger(value: number | null | undefined): string {
  if (value == null || value === undefined) return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return Math.round(n).toLocaleString("en-US");
}

/** ISO week number (1–53) for a local calendar date. */
export function getIsoWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

/** ISO week-year for a local calendar date (may differ near year boundaries). */
export function getIsoWeekYear(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/** Number of ISO weeks in a given ISO week-year (52 or 53). */
export function getIsoWeeksInYear(year: number): number {
  // 28 Dec is always in the last ISO week of its ISO year
  return getIsoWeek(new Date(year, 11, 28));
}

export function createDefaultFuelReportFilters(
  now = new Date()
): FuelReportFilterState {
  return {
    period: "yearly",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    week: getIsoWeek(now),
    aircraftId: null,
  };
}

/**
 * Build query params for GET aircraft-fuel-report.
 * Omits month unless monthly, week unless weekly, aircraftId when unset.
 */
export function buildFuelReportQueryParams(
  filters: FuelReportFilterState
): AircraftFuelReportQueryParams {
  const params: AircraftFuelReportQueryParams = {
    period: filters.period,
    year: filters.year,
  };
  if (filters.period === "monthly") {
    params.month = filters.month;
  }
  if (filters.period === "weekly") {
    params.week = filters.week;
  }
  if (filters.aircraftId != null && filters.aircraftId > 0) {
    params.aircraftId = filters.aircraftId;
  }
  return params;
}

export function chartTitleForPeriod(period: FuelReportPeriod): string {
  if (period === "weekly") return "Weekly Fuel Consumption / Hour";
  if (period === "monthly") return "Monthly Fuel Consumption / Hour";
  return "Yearly Fuel Consumption / Hour";
}
