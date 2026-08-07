import { useCallback, useMemo, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useAircraftFuelReport } from "../hooks/useAircraftFuelReport";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import {
  aircraftBreadcrumbLabel,
  buildFuelReportQueryParams,
  createDefaultFuelReportFilters,
  type FuelReportFilterState,
} from "../types/dashboardReport.types";
import { AircraftBreakdownTable } from "./dashboard/AircraftBreakdownTable";
import { AircraftFuelChart } from "./dashboard/AircraftFuelChart";
import { DashboardReportFilters } from "./dashboard/DashboardReportFilters";
import { DashboardSummaryCards } from "./dashboard/DashboardSummaryCards";
import { FuelConsumptionSummaryTable } from "./dashboard/FuelConsumptionSummaryTable";

export function AircraftDashboardReport() {
  const defaults = useMemo(() => createDefaultFuelReportFilters(), []);
  const [draftFilters, setDraftFilters] =
    useState<FuelReportFilterState>(defaults);
  const [appliedFilters, setAppliedFilters] =
    useState<FuelReportFilterState>(defaults);

  const queryParams = useMemo(
    () => buildFuelReportQueryParams(appliedFilters),
    [appliedFilters]
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useAircraftFuelReport(queryParams);

  const initialLoading = isLoading && !data;
  const applying = isFetching;
  const showSkeletons = initialLoading;

  const applyFilters = useCallback((next: FuelReportFilterState) => {
    setAppliedFilters({
      startMonth: next.startMonth,
      endMonth: next.endMonth,
      aircraftIds: [...next.aircraftIds],
      aircraftRegistrations: [...next.aircraftRegistrations],
    });
  }, []);

  const handleApply = useCallback(() => {
    applyFilters(draftFilters);
  }, [applyFilters, draftFilters]);

  const handleAircraftFilterChange = useCallback(
    (next: FuelReportFilterState) => {
      // Aircraft selection applies immediately (month range still uses Apply).
      applyFilters(next);
    },
    [applyFilters]
  );

  const handleReset = useCallback(() => {
    const next = createDefaultFuelReportFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
  }, []);

  const errorMessage = isError
    ? formatApiErrorMessage(error, "Failed to load aircraft fuel report")
    : null;

  const showReport = data != null || showSkeletons;
  const breadcrumb = aircraftBreadcrumbLabel(
    appliedFilters.aircraftRegistrations
  );
  const rangeLabel = useMemo(() => {
    const start =
      appliedFilters.startMonth || data?.meta?.range?.start || null;
    const end = appliedFilters.endMonth || data?.meta?.range?.end || null;
    if (start && end) return `${start} → ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return "All available months";
  }, [
    appliedFilters.startMonth,
    appliedFilters.endMonth,
    data?.meta?.range?.start,
    data?.meta?.range?.end,
  ]);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-5 pb-8 sm:gap-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex flex-wrap items-center gap-1 text-xs text-gray-500 sm:text-sm"
        >
          <span>Fuel Report</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-medium text-gray-800">{breadcrumb}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="tabular-nums text-gray-600">{rangeLabel}</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Aircraft Fuel Consumption Report
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
          Monthly utilization, fuel consumption, and fuel burn per flight hour
          from approved or completed ATL Logbook records.
        </p>
      </header>

      <DashboardReportFilters
        value={draftFilters}
        onChange={setDraftFilters}
        onAircraftFilterChange={handleAircraftFilterChange}
        onApply={handleApply}
        onReset={handleReset}
        loading={applying}
      />

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="min-w-0 flex-1 break-words">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </div>
      )}

      {showReport && (
        <>
          <div className="flex flex-col gap-5 sm:gap-6">
            <DashboardSummaryCards
              summary={data?.summary ?? null}
              dataQualityFlags={data?.dataQualityFlags ?? []}
              loading={showSkeletons}
              errorMessage={errorMessage}
              filterKey={JSON.stringify(queryParams)}
            />

            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,34%)_minmax(0,66%)] lg:gap-5">
              <FuelConsumptionSummaryTable
                data={data ?? null}
                loading={showSkeletons}
              />
              <AircraftFuelChart data={data ?? null} loading={showSkeletons} />
            </div>
          </div>

          <AircraftBreakdownTable
            monthly={data?.monthly ?? []}
            loading={showSkeletons}
          />
        </>
      )}

      {data && applying && (
        <p className="sr-only" aria-live="polite">
          Updating report…
        </p>
      )}
    </div>
  );
}
