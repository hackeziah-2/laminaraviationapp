import { useCallback, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAircraftFuelReport } from "../hooks/useAircraftFuelReport";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import {
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

  const { data, isLoading, isFetching, isError, error, refetch, isSuccess } =
    useAircraftFuelReport(queryParams);

  const initialLoading = isLoading && !data;
  const applying = isFetching;
  const showSkeletons = initialLoading;

  const handleApply = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const handleReset = useCallback(() => {
    const next = createDefaultFuelReportFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
  }, []);

  // Do not tie emptiness to isFetching — that remounted the chart mid-refetch
  // and could crash Recharts on all-null burn series during Apply.
  const isEmpty =
    isSuccess &&
    data != null &&
    (data.grandTotal?.atlRecordCount ?? 0) === 0;

  const errorMessage = isError
    ? formatApiErrorMessage(error, "Failed to load aircraft fuel report")
    : null;

  const showReport = data != null || showSkeletons;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-5 pb-8 sm:gap-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Aircraft Fuel Consumption Report
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
          Aircraft utilization, fuel consumption, and average fuel burn per
          flight hour based on approved or completed ATL records.
        </p>
      </header>

      <DashboardReportFilters
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApply}
        onReset={handleReset}
        loading={applying}
      />

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p>{errorMessage}</p>
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

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-600 shadow-sm">
          No ATL fuel consumption data was found for the selected filters.
        </div>
      )}

      {/* Always render report chrome when we have (or are loading) data so empty
          category zeros remain visible per API contract. */}
      {showReport && (
        <>
          <DashboardSummaryCards
            grandTotal={data?.grandTotal ?? null}
            loading={showSkeletons}
          />

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,32%)_minmax(0,68%)] lg:gap-5">
            <FuelConsumptionSummaryTable
              data={data ?? null}
              loading={showSkeletons}
            />
            <AircraftFuelChart
              data={data ?? null}
              period={appliedFilters.period}
              loading={showSkeletons}
            />
          </div>

          <AircraftBreakdownTable
            breakdown={data?.aircraftBreakdown ?? []}
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
