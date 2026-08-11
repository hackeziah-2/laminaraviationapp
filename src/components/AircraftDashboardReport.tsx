import { useCallback, useMemo, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import {
  useAircraftFuelReport,
  useYoyFlyingHoursReport,
} from "../hooks/useAircraftFuelReport";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import {
  aircraftBreadcrumbLabel,
  buildFuelReportQueryParams,
  createDefaultFuelReportFilters,
  resolveFuelUnit,
  yoyYearsFromMonthRange,
  type FuelReportFilterState,
} from "../types/dashboardReport.types";
import { AircraftBreakdownTable } from "./dashboard/AircraftBreakdownTable";
import { AircraftFuelChart } from "./dashboard/AircraftFuelChart";
import { DashboardReportFilters } from "./dashboard/DashboardReportFilters";
import { DashboardSummaryCards } from "./dashboard/DashboardSummaryCards";
import { FuelConsumptionSummaryTable } from "./dashboard/FuelConsumptionSummaryTable";
import { YoyFlyingHoursSection } from "./dashboard/YoyFlyingHoursSection";

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

  /** YoY years follow the month filter; with no bounds, prefer main-report meta range. */
  const yoyYears = useMemo(() => {
    const hasMonthFilter =
      Boolean(appliedFilters.startMonth?.trim()) ||
      Boolean(appliedFilters.endMonth?.trim());
    if (hasMonthFilter) {
      return yoyYearsFromMonthRange(
        appliedFilters.startMonth,
        appliedFilters.endMonth
      );
    }
    const metaStart = data?.meta?.range?.start ?? "";
    const metaEnd = data?.meta?.range?.end ?? "";
    if (metaStart.trim() || metaEnd.trim()) {
      return yoyYearsFromMonthRange(metaStart, metaEnd);
    }
    return yoyYearsFromMonthRange("", "");
  }, [
    appliedFilters.startMonth,
    appliedFilters.endMonth,
    data?.meta?.range?.start,
    data?.meta?.range?.end,
  ]);

  const yoyQueryParams = useMemo(
    () =>
      buildFuelReportQueryParams(
        {
          // Full calendar years for YoY — month slice is encoded in `years`.
          startMonth: "",
          endMonth: "",
          aircraftIds: appliedFilters.aircraftIds,
          aircraftRegistrations: appliedFilters.aircraftRegistrations,
        },
        { years: yoyYears }
      ),
    [appliedFilters.aircraftIds, appliedFilters.aircraftRegistrations, yoyYears]
  );

  const {
    data: yoyData,
    isLoading: yoyLoading,
    isError: yoyIsError,
    error: yoyError,
    refetch: refetchYoy,
  } = useYoyFlyingHoursReport(yoyQueryParams);

  const rangeStart =
    data?.meta?.range?.start ?? yoyData?.meta?.range?.start ?? null;
  const rangeEnd =
    data?.meta?.range?.end ?? yoyData?.meta?.range?.end ?? null;

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
  const yoyErrorMessage = yoyIsError
    ? formatApiErrorMessage(yoyError, "Failed to load YoY flying hours")
    : null;

  const showReport = data != null || showSkeletons || isError;
  const breadcrumb = aircraftBreadcrumbLabel(
    appliedFilters.aircraftRegistrations
  );
  const rangeLabel = useMemo(() => {
    const start = appliedFilters.startMonth || rangeStart || null;
    const end = appliedFilters.endMonth || rangeEnd || null;
    if (start && end) return `${start} → ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return "All available months";
  }, [
    appliedFilters.startMonth,
    appliedFilters.endMonth,
    rangeStart,
    rangeEnd,
  ]);

  const fuelUnit = resolveFuelUnit(
    yoyData?.meta?.fuelUnit ?? data?.meta?.fuelUnit
  );

  const yoySection = yoyData?.yoyFlyingHours ?? data?.yoyFlyingHours ?? null;

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
                fuelUnit={fuelUnit}
              />
              <AircraftFuelChart
                data={data ?? null}
                loading={showSkeletons}
                fuelUnit={fuelUnit}
              />
            </div>
          </div>

          <AircraftBreakdownTable
            monthly={data?.monthly ?? []}
            loading={showSkeletons}
            fuelUnit={fuelUnit}
          />
        </>
      )}

      <YoyFlyingHoursSection
        data={yoySection}
        dataQualityFlags={
          yoyData?.dataQualityFlags ?? data?.dataQualityFlags ?? []
        }
        loading={yoyLoading && !yoyData && !data?.yoyFlyingHours}
        errorMessage={yoyErrorMessage}
        onRetry={() => void refetchYoy()}
      />

      {data && applying && (
        <p className="sr-only" aria-live="polite">
          Updating report…
        </p>
      )}
    </div>
  );
}
