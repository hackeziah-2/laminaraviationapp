import apiClient from "./index";
import {
  normalizeAircraftFuelReport,
  type AircraftFuelReportQueryParams,
  type AircraftFuelReportResponse,
} from "../types/dashboardReport.types";

const FUEL_REPORT_PATH = "dashboard/aircraft-fuel-report";

/**
 * Build axios params: snake_case keys; omit unused optional fields.
 * Sends both `aircraft` (tails) and `aircraft_id` (PKs) when provided.
 */
export function toFuelReportApiParams(
  params: AircraftFuelReportQueryParams
): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.startMonth?.trim()) {
    out.start_month = params.startMonth.trim();
  }
  if (params.endMonth?.trim()) {
    out.end_month = params.endMonth.trim();
  }
  if (params.aircraft?.trim()) {
    out.aircraft = params.aircraft
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean)
      .join(",");
  }
  if (params.aircraftId?.trim()) {
    out.aircraft_id = params.aircraftId
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .join(",");
  }
  if (params.years?.trim()) {
    out.years = params.years
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .join(",");
  }
  if (params.monthYear?.trim()) {
    out.month_year = params.monthYear.trim();
  }
  return out;
}

/**
 * GET /api/v1/dashboard/aircraft-fuel-report
 * Monthly ATL Logbook rollup: meta / summary / monthly[] / data_quality_flags[]
 */
export async function getAircraftFuelReport(
  params: AircraftFuelReportQueryParams
): Promise<AircraftFuelReportResponse> {
  const response = await apiClient.get(FUEL_REPORT_PATH, {
    params: toFuelReportApiParams(params),
  });
  const payload = response.data?.data ?? response.data ?? {};
  return normalizeAircraftFuelReport(payload);
}
