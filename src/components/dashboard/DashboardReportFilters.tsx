import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import {
  getAircraftListOrdered,
  getAllAircraftOrdered,
  type AircraftListItem,
} from "../../api/aircraftApi";
import {
  type FuelReportFilterState,
} from "../../types/dashboardReport.types";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60";

const SELECT_CLASS =
  "h-10 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60";

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

type DashboardReportFiltersProps = {
  value: FuelReportFilterState;
  onChange: (next: FuelReportFilterState) => void;
  /** Called when aircraft selection changes — applies immediately. */
  onAircraftFilterChange: (next: FuelReportFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
};

export function DashboardReportFilters({
  value,
  onChange,
  onAircraftFilterChange,
  onApply,
  onReset,
  loading = false,
}: DashboardReportFiltersProps) {
  const [aircraftOptions, setAircraftOptions] = useState<AircraftListItem[]>(
    []
  );
  const [aircraftLoading, setAircraftLoading] = useState(true);
  const [aircraftLoadError, setAircraftLoadError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setAircraftLoading(true);
    (async () => {
      try {
        let list = await getAircraftListOrdered();
        if (list.length === 0) {
          list = await getAllAircraftOrdered();
        }
        if (cancelled) return;
        setAircraftOptions(
          list.filter((a) => a.id > 0 && a.registration?.trim())
        );
        setAircraftLoadError(null);
      } catch {
        if (!cancelled) {
          setAircraftOptions([]);
          setAircraftLoadError("Could not load aircraft list");
        }
      } finally {
        if (!cancelled) setAircraftLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (partial: Partial<FuelReportFilterState>) => {
    onChange({ ...value, ...partial });
  };

  const applyAircraftSelection = (
    id: number | null,
    registration: string | null
  ) => {
    const next: FuelReportFilterState = {
      ...value,
      aircraftIds: id != null && id > 0 ? [id] : [],
      aircraftRegistrations:
        registration != null && registration.trim()
          ? [registration.trim()]
          : [],
    };
    onChange(next);
    onAircraftFilterChange(next);
  };

  const handleAircraftChange = (raw: string) => {
    if (!raw) {
      applyAircraftSelection(null, null);
      return;
    }
    const id = Number(raw);
    const ac = aircraftOptions.find((a) => a.id === id);
    if (!ac) {
      applyAircraftSelection(null, null);
      return;
    }
    applyAircraftSelection(ac.id, ac.registration);
  };

  const selectedValue =
    value.aircraftIds.length > 0 ? String(value.aircraftIds[0]) : "";

  const rangeInvalid =
    Boolean(value.startMonth && value.endMonth) &&
    value.startMonth > value.endMonth;

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-label="Report filters"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Updating…
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fuel-start-month"
            className="text-xs font-medium text-gray-600"
          >
            Start month
          </label>
          <input
            id="fuel-start-month"
            type="month"
            value={value.startMonth}
            onChange={(e) => patch({ startMonth: e.target.value })}
            className={INPUT_CLASS}
          />
          <p className="text-[11px] text-gray-400">Leave blank for earliest</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fuel-end-month"
            className="text-xs font-medium text-gray-600"
          >
            End month
          </label>
          <input
            id="fuel-end-month"
            type="month"
            value={value.endMonth}
            onChange={(e) => patch({ endMonth: e.target.value })}
            className={INPUT_CLASS}
            aria-invalid={rangeInvalid}
          />
          {rangeInvalid ? (
            <p className="text-xs text-red-600">
              Start month must be on or before end month.
            </p>
          ) : (
            <p className="text-[11px] text-gray-400">Leave blank for latest</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fuel-aircraft"
            className="text-xs font-medium text-gray-600"
          >
            Aircraft Registration
          </label>
          <select
            id="fuel-aircraft"
            value={selectedValue}
            onChange={(e) => handleAircraftChange(e.target.value)}
            disabled={aircraftLoading}
            className={SELECT_CLASS}
            style={{
              backgroundImage: SELECT_CHEVRON,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
            }}
            aria-describedby={
              aircraftLoadError ? "fuel-aircraft-error" : undefined
            }
          >
            <option value="">All Aircraft</option>
            {aircraftOptions.map((ac) => (
              <option key={ac.id} value={String(ac.id)}>
                {ac.registration}
              </option>
            ))}
          </select>
          {aircraftLoading ? (
            <p className="text-[11px] text-gray-400">Loading aircraft…</p>
          ) : aircraftLoadError ? (
            <p id="fuel-aircraft-error" className="text-xs text-amber-600">
              {aircraftLoadError}
            </p>
          ) : aircraftOptions.length === 0 ? (
            <p className="text-xs text-amber-600">No aircraft available</p>
          ) : (
            <p className="text-[11px] text-gray-400">
              Select an aircraft to filter the report
            </p>
          )}
        </div>

        <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-end">
          <button
            type="button"
            onClick={onApply}
            disabled={loading || rangeInvalid}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            Apply Filter
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
