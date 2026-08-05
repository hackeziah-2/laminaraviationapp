import { useQuery } from "@tanstack/react-query";
import { getAircraftFuelReport } from "../api/dashboardReportApi";
import type { AircraftFuelReportQueryParams } from "../types/dashboardReport.types";

export const aircraftFuelReportQueryKeys = {
  all: ["aircraft-fuel-report"] as const,
  report: (params: AircraftFuelReportQueryParams) =>
    [...aircraftFuelReportQueryKeys.all, "report", params] as const,
};

export function useAircraftFuelReport(
  params: AircraftFuelReportQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aircraftFuelReportQueryKeys.report(params),
    queryFn: () => getAircraftFuelReport(params),
    enabled: options?.enabled ?? true,
    placeholderData: (previous) => previous,
  });
}
