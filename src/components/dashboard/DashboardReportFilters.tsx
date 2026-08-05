import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  getAircraftListOrdered,
  type AircraftListItem,
} from "../../api/aircraftApi";
import {
  createDefaultFuelReportFilters,
  getIsoWeeksInYear,
  type FuelReportFilterState,
  type FuelReportPeriod,
} from "../../types/dashboardReport.types";

const SELECT_CLASS =
  "w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60";

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

type DashboardReportFiltersProps = {
  value: FuelReportFilterState;
  onChange: (next: FuelReportFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
};

function yearOptions(centerYear: number): number[] {
  const years: number[] = [];
  for (let y = centerYear + 2; y >= centerYear - 10; y -= 1) {
    years.push(y);
  }
  return years;
}

export function DashboardReportFilters({
  value,
  onChange,
  onApply,
  onReset,
  loading = false,
}: DashboardReportFiltersProps) {
  const [aircraftOptions, setAircraftOptions] = useState<AircraftListItem[]>(
    []
  );
  const [aircraftLoadError, setAircraftLoadError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    getAircraftListOrdered()
      .then((list) => {
        if (!cancelled) {
          setAircraftOptions(list);
          setAircraftLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAircraftLoadError("Could not load aircraft list");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => yearOptions(new Date().getFullYear()), []);
  const weekCount = getIsoWeeksInYear(value.year);
  const weeks = useMemo(
    () => Array.from({ length: weekCount }, (_, i) => i + 1),
    [weekCount]
  );

  const patch = (partial: Partial<FuelReportFilterState>) => {
    onChange({ ...value, ...partial });
  };

  const handlePeriodChange = (period: FuelReportPeriod) => {
    const defaults = createDefaultFuelReportFilters();
    const next: FuelReportFilterState = {
      ...value,
      period,
    };
    if (period === "monthly") {
      next.month = value.month || defaults.month;
    }
    if (period === "weekly") {
      const maxWeek = getIsoWeeksInYear(next.year);
      next.week = Math.min(value.week || defaults.week, maxWeek);
    }
    onChange(next);
  };

  const handleYearChange = (year: number) => {
    const maxWeek = getIsoWeeksInYear(year);
    onChange({
      ...value,
      year,
      week: Math.min(value.week, maxWeek),
    });
  };

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-label="Report filters"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fuel-period" className="text-xs font-medium text-gray-600">
            Period
          </label>
          <select
            id="fuel-period"
            value={value.period}
            onChange={(e) =>
              handlePeriodChange(e.target.value as FuelReportPeriod)
            }
            disabled={loading}
            className={SELECT_CLASS}
            style={{ backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
          >
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fuel-year" className="text-xs font-medium text-gray-600">
            Year
          </label>
          <select
            id="fuel-year"
            value={value.year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            disabled={loading}
            className={SELECT_CLASS}
            style={{ backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {value.period === "monthly" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fuel-month" className="text-xs font-medium text-gray-600">
              Month
            </label>
            <select
              id="fuel-month"
              value={value.month}
              onChange={(e) => patch({ month: Number(e.target.value) })}
              disabled={loading}
              className={SELECT_CLASS}
              style={{ backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {value.period === "weekly" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fuel-week" className="text-xs font-medium text-gray-600">
              ISO Week
            </label>
            <select
              id="fuel-week"
              value={value.week}
              onChange={(e) => patch({ week: Number(e.target.value) })}
              disabled={loading}
              className={SELECT_CLASS}
              style={{ backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
            >
              {weeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fuel-aircraft"
            className="text-xs font-medium text-gray-600"
          >
            Aircraft Registration
          </label>
          <select
            id="fuel-aircraft"
            value={value.aircraftId ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              patch({ aircraftId: raw === "" ? null : Number(raw) });
            }}
            disabled={loading}
            className={SELECT_CLASS}
            style={{ backgroundImage: SELECT_CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
            aria-describedby={
              aircraftLoadError ? "fuel-aircraft-error" : undefined
            }
          >
            <option value="">All Aircraft</option>
            {aircraftOptions.map((ac) => (
              <option key={ac.id} value={ac.id}>
                {ac.registration || `Aircraft #${ac.id}`}
              </option>
            ))}
          </select>
          {aircraftLoadError && (
            <p id="fuel-aircraft-error" className="text-xs text-amber-600">
              {aircraftLoadError}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-end xl:col-span-2">
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply Filter
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(createDefaultFuelReportFilters());
              onReset();
            }}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
