import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, RefreshCw, Search } from "lucide-react";
import {
  AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE,
  getAircraftFleetDashboard,
  type AircraftFleetDashboardResponse,
} from "../api/aircraftFleetDashboardApi";
import { formatDisplayDate } from "../utility/utils";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import { remainingHoursClass } from "../utils/fleetMagnetoRows";
import { DataTablePagination } from "./ui/DataTablePagination";
import { Spinner } from "./ui/spinner";

const IDENT_COLORS = [
  "bg-orange-300",
  "bg-lime-300",
  "bg-amber-200",
  "bg-sky-300",
  "bg-violet-300",
  "bg-pink-300",
  "bg-teal-200",
  "bg-rose-200",
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Aircraft" },
  { value: "Operational", label: "Operational" },
  { value: "Ongoing Maintenance", label: "Ongoing Maintenance" },
  { value: "AOG", label: "AOG" },
];

const EMPTY_RESULT: AircraftFleetDashboardResponse = {
  items: [],
  total: 0,
  page: 1,
  pageSize: AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE,
  pages: 0,
};

function statusCellClass(status: string): string {
  const value = status.trim().toUpperCase();
  if (value === "AOG") return "bg-red-500 text-white";
  if (value === "ONGOING MAINTENANCE") return "bg-yellow-400 text-gray-900";
  if (value === "OPERATIONAL" || value === "RUNNING") {
    return "bg-green-500 text-white";
  }
  return "bg-gray-100 text-gray-600";
}

function identCellClass(ident: string): string {
  let hash = 0;
  for (const char of ident) {
    hash = (hash + char.charCodeAt(0)) % IDENT_COLORS.length;
  }
  return IDENT_COLORS[hash];
}

function displayValue(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  return text || "—";
}

function parseHours(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const headerCell =
  "border border-gray-300 bg-gray-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-900";
const bodyCell =
  "border border-gray-300 px-3 py-2 text-center text-sm text-gray-900 tabular-nums";

export function AircraftFleetDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AircraftFleetDashboardResponse>(EMPTY_RESULT);
  const searchDebouncedRef = useRef(searchDebounced);
  searchDebouncedRef.current = searchDebounced;

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchTerm.trim();
      if (searchDebouncedRef.current !== next) setPage(1);
      setSearchDebounced(next);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAircraftFleetDashboard({
      page,
      pageSize: AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE,
      search: searchDebounced,
      status: filterStatus,
    })
      .then((response) => {
        if (cancelled) return;
        setResult(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setResult(EMPTY_RESULT);
        setError(
          formatApiErrorMessage(err, "Failed to load the fleet dashboard")
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchDebounced, filterStatus, page, refreshKey]);

  const today = formatDisplayDate(new Date().toISOString());

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl text-gray-900 sm:text-2xl">Fleet Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">
            Magneto tach time, remaining hours, and component identity by
            aircraft.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="min-w-0 flex-1 break-words">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-2 bg-blue-600 px-4 py-3 text-white sm:flex-row sm:items-center sm:px-6">
          <h3 className="text-sm">AIRCRAFT FLEET DASHBOARD</h3>
          <span className="text-sm">DATE: {today}</span>
        </div>

        <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="mb-4">
            <label htmlFor="fleet-dashboard-search" className="sr-only">
              Search aircraft
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="fleet-dashboard-search"
                type="text"
                placeholder="Search by registration"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" aria-hidden />
            <label htmlFor="fleet-dashboard-status" className="text-sm text-gray-600">
              Filter by Status
            </label>
            <select
              id="fleet-dashboard-status"
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value);
                setPage(1);
              }}
              className="appearance-none rounded border border-gray-300 bg-white bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative min-h-[200px] overflow-x-auto">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <Spinner label="Loading fleet dashboard…" />
            </div>
          ) : null}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th rowSpan={2} className={headerCell}>
                  A/C Ident
                </th>
                <th rowSpan={2} className={headerCell}>
                  Status
                </th>
                <th rowSpan={2} className={headerCell}>
                  Magneto
                </th>
                <th colSpan={2} className={headerCell}>
                  Tach Time
                </th>
                <th rowSpan={2} className={headerCell}>
                  Remaining Time
                  <br />
                  Before Replacement
                  <br />
                  (Hrs)
                </th>
                <th rowSpan={2} className={headerCell}>
                  Part Number
                </th>
                <th rowSpan={2} className={headerCell}>
                  Serial Number
                </th>
              </tr>
              <tr>
                <th className={headerCell}>Due for Replacement</th>
                <th className={headerCell}>EOD</th>
              </tr>
            </thead>
            <tbody>
              {!loading && error ? null : !loading && result.total === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-gray-300 px-4 py-12 text-center text-gray-500"
                  >
                    No aircraft found matching your search criteria
                  </td>
                </tr>
              ) : (
                result.items.map((item, itemIndex) => {
                  const rows =
                    item.components.length > 0 ? item.components : [null];
                  const ident = item.aircraftIdent.trim();
                  return (
                    <Fragment key={`${ident || "aircraft"}-${itemIndex}`}>
                      {rows.map((component, index) => {
                        const remaining = parseHours(component?.remainingHours);
                        const remainingClass = remainingHoursClass(
                          remaining,
                          null
                        );
                        return (
                          <tr
                            key={`${ident}-${component?.magneto ?? "empty"}-${component?.serialNumber ?? index}`}
                          >
                            {index === 0 ? (
                              <>
                                <td
                                  rowSpan={rows.length}
                                  className={`${bodyCell} font-semibold text-gray-900 ${identCellClass(ident)}`}
                                >
                                  {ident ? (
                                    <Link
                                      to={`/profile?aircraft=${encodeURIComponent(ident)}`}
                                      className="text-gray-900 underline decoration-gray-700/40 underline-offset-2 hover:text-blue-800"
                                    >
                                      {ident}
                                    </Link>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td
                                  rowSpan={rows.length}
                                  className={`${bodyCell} font-semibold ${statusCellClass(item.status ?? "")}`}
                                >
                                  {displayValue(item.status)}
                                </td>
                              </>
                            ) : null}
                            <td className={`${bodyCell} font-medium`}>
                              {displayValue(component?.magneto)}
                            </td>
                            <td className={bodyCell}>
                              {displayValue(component?.dueForReplacementTach)}
                            </td>
                            <td className={bodyCell}>
                              {displayValue(item.eodTach)}
                            </td>
                            <td className={`${bodyCell} font-medium ${remainingClass}`}>
                              {displayValue(component?.remainingHours)}
                            </td>
                            <td className={bodyCell}>
                              {displayValue(component?.partNumber)}
                            </td>
                            <td className={bodyCell}>
                              {displayValue(component?.serialNumber)}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          currentPage={page}
          totalPages={result.pages}
          onPageChange={setPage}
          totalItems={result.total}
          totalLabel="aircraft"
          itemsPerPage={AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE}
          disabled={loading}
          className="px-6"
        />
      </div>
    </div>
  );
}
