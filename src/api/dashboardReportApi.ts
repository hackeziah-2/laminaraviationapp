import apiClient from "./index";
import { toCamelDeep } from "../utility/utils";
import type {
  AircraftFuelReportQueryParams,
  AircraftFuelReportResponse,
} from "../types/dashboardReport.types";

const FUEL_REPORT_PATH = "dashboard/aircraft-fuel-report";

/**
 * Build axios params: snake_case keys; omit unused period fields and aircraft_id.
 */
export function toFuelReportApiParams(
  params: AircraftFuelReportQueryParams
): Record<string, string | number> {
  const out: Record<string, string | number> = {
    period: params.period,
    year: params.year,
  };
  if (params.period === "monthly" && params.month != null) {
    out.month = params.month;
  }
  if (params.period === "weekly" && params.week != null) {
    out.week = params.week;
  }
  if (params.aircraftId != null && params.aircraftId > 0) {
    out.aircraft_id = params.aircraftId;
  }
  return out;
}

/**
 * GET /api/v1/dashboard/aircraft-fuel-report
 */
export async function getAircraftFuelReport(
  params: AircraftFuelReportQueryParams
): Promise<AircraftFuelReportResponse> {
  const response = await apiClient.get(FUEL_REPORT_PATH, {
    params: toFuelReportApiParams(params),
  });
  const data = response.data ?? {};
  return toCamelDeep(data) as AircraftFuelReportResponse;
}
