import { useQuery } from "@tanstack/react-query";
import { getAircraftFuelReport } from "../api/dashboardReportApi";
import type { AircraftFuelReportQueryParams } from "../types/dashboardReport.types";

export const aircraftFuelReportQueryKeys = {
  all: ["aircraft-fuel-report"] as const,
  report: (params: AircraftFuelReportQueryParams) =>
    [...aircraftFuelReportQueryKeys.all, "report", params] as const,
  yoy: (params: AircraftFuelReportQueryParams) =>
    [...aircraftFuelReportQueryKeys.all, "yoy", params] as const,
};

export function useAircraftFuelReport(
  params: AircraftFuelReportQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aircraftFuelReportQueryKeys.report(params),
    queryFn: () => getAircraftFuelReport(params),
    enabled: options?.enabled ?? true,
    // Don't keep previous filtered/unfiltered data when the query key changes —
    // that made aircraft filters look like they did nothing.
    placeholderData: undefined,
  });
}

/** Independent YoY flying-hours section fetch (same endpoint, years-focused). */
export function useYoyFlyingHoursReport(
  params: AircraftFuelReportQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aircraftFuelReportQueryKeys.yoy(params),
    queryFn: () => getAircraftFuelReport(params),
    enabled: options?.enabled ?? true,
    placeholderData: undefined,
  });
}
