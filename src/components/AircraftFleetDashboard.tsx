import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, RefreshCw, Search } from "lucide-react";
import { getAircrafts } from "../api/aircraftApi";
import { getAllFleetDailyUpdatesOrdered } from "../api/fleetDailyUpdateApi";
import {
  getAircraftTccMonitoring,
  type TCCMonitoring,
} from "../api/tccMonitoringApi";
import { MAX_API_PAGE_SIZE } from "../constants/pagination";
import { formatDisplayDate } from "../utility/utils";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import { isConfiguredComponentLimit } from "../utils/componentLimit";
import {
  FLEET_DASHBOARD_PAGE_SIZE,
  buildMagnetoRows,
  formatTachHours,
  joinFleetDashboardAircraft,
  paginateFleetAircraft,
  remainingBeforeReplacement,
  remainingHoursClass,
  type FleetDashboardAircraft,
  type FleetDashboardAircraftInput,
  type FleetMagnetoRow,
  type MagnetoComponentInput,
} from "../utils/fleetMagnetoRows";
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

function parseTach(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toAircraftInput(raw: unknown): FleetDashboardAircraftInput | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = Number(record.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const displayOrderRaw = record.display_order ?? record.displayOrder;
  const displayOrder = Number(displayOrderRaw);
  return {
    id,
    registration: String(record.registration ?? ""),
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : undefined,
  };
}

async function fetchAllAircraft(
  search: string
): Promise<FleetDashboardAircraftInput[]> {
  const limit = MAX_API_PAGE_SIZE;
  const collected: FleetDashboardAircraftInput[] = [];
  const seen = new Set<number>();
  let page = 1;
  let pages = 1;

  while (page <= pages && page <= 50) {
    const response = await getAircrafts(page, limit, search, "all", "");
    const data = response?.data ?? {};
    const rawItems = Array.isArray(data)
      ? data
      : data.items ?? data.results ?? data.data ?? [];
    const list = Array.isArray(rawItems) ? rawItems : [];
    let added = 0;
    for (const item of list) {
      const aircraft = toAircraftInput(item);
      if (!aircraft || seen.has(aircraft.id)) continue;
      seen.add(aircraft.id);
      collected.push(aircraft);
      added += 1;
    }
    const total = Number(data.total ?? data.count ?? collected.length) || 0;
    pages = Math.max(
      1,
      Number(data.pages ?? data.total_pages) ||
        Math.ceil(total / limit) ||
        1
    );
    if (list.length === 0 || added === 0) break;
    page += 1;
  }

  return collected;
}

function toMagnetoInput(item: TCCMonitoring): MagnetoComponentInput {
  const limitHours = parseTach(item.limitHours);
  const lastDone = parseTach(item.lastDoneTach ?? item.lastDoneYear);
  const apiNextDue = parseTach(item.nextDueYear);
  const nextDueTach =
    apiNextDue ??
    (lastDone != null && isConfiguredComponentLimit(limitHours)
      ? lastDone + limitHours
      : null);
  return {
    description: item.description ?? "",
    methodOfCompliance: item.methodOfCompliance ?? "",
    partNo: item.partNo ?? "",
    serialNo: item.serialNo ?? "",
    nextDueTach,
    remainingTach: item.remainingTach ?? null,
    limitHours: isConfiguredComponentLimit(limitHours) ? limitHours : null,
  };
}

async function fetchAircraftMagnetos(
  aircraftId: number
): Promise<FleetMagnetoRow[]> {
  const limit = MAX_API_PAGE_SIZE;
  const first = await getAircraftTccMonitoring(aircraftId, 1, limit, "");
  let items = first.items;
  const pages = Math.max(1, first.pages || 1);
  for (let page = 2; page <= pages; page += 1) {
    const next = await getAircraftTccMonitoring(aircraftId, page, limit, "");
    items = items.concat(next.items);
  }
  return buildMagnetoRows(items.map(toMagnetoInput));
}

function statusCellClass(status: string): string {
  const value = status.trim().toUpperCase();
  if (value === "AOG") return "bg-red-500 text-white";
  if (value === "ONGOING MAINTENANCE") return "bg-yellow-400 text-gray-900";
  if (value === "OPERATIONAL") return "bg-green-400 text-gray-900";
  return "bg-gray-100 text-gray-600";
}

function identCellClass(aircraftId: number): string {
  const index = Math.abs(aircraftId) % IDENT_COLORS.length;
  return IDENT_COLORS[index];
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
  const [listLoading, setListLoading] = useState(true);
  const [magnetoLoading, setMagnetoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aircraft, setAircraft] = useState<FleetDashboardAircraft[]>([]);
  const [magnetosByAircraft, setMagnetosByAircraft] = useState<
    Record<number, FleetMagnetoRow[]>
  >({});
  const [magnetoErrors, setMagnetoErrors] = useState<Record<number, boolean>>(
    {}
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setError(null);
    setMagnetosByAircraft({});
    setMagnetoErrors({});

    Promise.all([
      fetchAllAircraft(searchDebounced),
      getAllFleetDailyUpdatesOrdered(),
    ])
      .then(([aircraftRows, dailyRows]) => {
        if (cancelled) return;
        setAircraft(
          joinFleetDashboardAircraft(
            aircraftRows,
            dailyRows.map((row) => ({
              aircraftId: row.aircraftId ?? row.aircraft?.id,
              registration: row.registration ?? row.aircraft?.registration,
              ident: row.ident,
              status: row.status ?? row.workStatus,
              tachEod: row.tachEod ?? null,
            })),
            filterStatus
          )
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setAircraft([]);
        setError(
          formatApiErrorMessage(err, "Failed to load the fleet dashboard")
        );
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchDebounced, filterStatus, refreshKey]);

  const pageResult = useMemo(
    () => paginateFleetAircraft(aircraft, page, FLEET_DASHBOARD_PAGE_SIZE),
    [aircraft, page]
  );

  useEffect(() => {
    if (pageResult.page !== page) setPage(pageResult.page);
  }, [page, pageResult.page]);

  const pageAircraftKey = pageResult.pageItems.map((item) => item.id).join(",");

  useEffect(() => {
    if (listLoading) return;
    const visible = pageResult.pageItems;
    if (visible.length === 0) {
      setMagnetosByAircraft({});
      setMagnetoErrors({});
      setMagnetoLoading(false);
      return;
    }

    let cancelled = false;
    setMagnetoLoading(true);
    Promise.all(
      visible.map(async (item) => {
        try {
          const rows = await fetchAircraftMagnetos(item.id);
          return { id: item.id, rows, failed: false };
        } catch {
          return { id: item.id, rows: [] as FleetMagnetoRow[], failed: true };
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        const nextRows: Record<number, FleetMagnetoRow[]> = {};
        const nextErrors: Record<number, boolean> = {};
        for (const result of results) {
          nextRows[result.id] = result.rows;
          if (result.failed) nextErrors[result.id] = true;
        }
        setMagnetosByAircraft(nextRows);
        setMagnetoErrors(nextErrors);
      })
      .finally(() => {
        if (!cancelled) setMagnetoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listLoading, pageAircraftKey, pageResult.pageItems]);

  const magnetosPending = pageResult.pageItems.some(
    (item) => magnetosByAircraft[item.id] === undefined && !magnetoErrors[item.id]
  );
  const loading = listLoading || magnetoLoading || magnetosPending;
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
                placeholder="Search by registration, MSN, or model"
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
                <th colSpan={3} className={headerCell}>
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
                <th className={headerCell}>Due for OH</th>
                <th className={headerCell}>Due for Replacement</th>
                <th className={headerCell}>EOD</th>
              </tr>
            </thead>
            <tbody>
              {!loading && error ? null : !loading && pageResult.total === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="border border-gray-300 px-4 py-12 text-center text-gray-500"
                  >
                    No aircraft found matching your search criteria
                  </td>
                </tr>
              ) : (
                pageResult.pageItems.map((item) => {
                  const magnetos = magnetosByAircraft[item.id] ?? [];
                  const magnetoFailed = Boolean(magnetoErrors[item.id]);
                  const rows = magnetos.length > 0 ? magnetos : [null];
                  return (
                    <Fragment key={item.id}>
                      {rows.map((magneto, index) => {
                    const remaining = magneto
                      ? remainingBeforeReplacement(
                          magneto.dueForReplacement,
                          item.tachEod,
                          magneto.remainingTach
                        )
                      : null;
                    const remainingClass = remainingHoursClass(
                      remaining,
                      magneto?.limitHours ?? null
                    );
                    const dueOh = formatTachHours(magneto?.dueForOh ?? null);
                    const dueReplacement = formatTachHours(
                      magneto?.dueForReplacement ?? null
                    );
                    const emptyOverhaul = Boolean(magneto) && !dueOh;
                    return (
                      <tr key={`${item.id}-${magneto?.key ?? "empty"}`}>
                        {index === 0 ? (
                          <>
                            <td
                              rowSpan={rows.length}
                              className={`${bodyCell} font-semibold text-gray-900 ${identCellClass(item.id)}`}
                            >
                              {item.registration.trim() ? (
                                <Link
                                  to={`/profile?aircraft=${encodeURIComponent(item.registration.trim())}`}
                                  className="text-gray-900 underline decoration-gray-700/40 underline-offset-2 hover:text-blue-800"
                                >
                                  {item.registration}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              rowSpan={rows.length}
                              className={`${bodyCell} font-semibold ${statusCellClass(item.status)}`}
                            >
                              {item.status || "—"}
                            </td>
                          </>
                        ) : null}
                        <td className={`${bodyCell} font-medium`}>
                          {magnetoFailed
                            ? "Unable to load magneto details"
                            : magneto?.label || "—"}
                        </td>
                        <td
                          className={`${bodyCell} ${emptyOverhaul ? "bg-gray-400" : ""}`}
                          title={emptyOverhaul ? "No overhaul due" : undefined}
                        >
                          {dueOh || (magneto ? "" : "—")}
                        </td>
                        <td className={bodyCell}>
                          {dueReplacement || "—"}
                        </td>
                        <td className={bodyCell}>
                          {formatTachHours(item.tachEod) || "—"}
                        </td>
                        <td className={`${bodyCell} font-medium ${remainingClass}`}>
                          {formatTachHours(remaining) || "—"}
                        </td>
                        <td className={bodyCell}>
                          {magneto?.partNumber || "—"}
                        </td>
                        <td className={bodyCell}>
                          {magneto?.serialNumber || "—"}
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
          currentPage={pageResult.page}
          totalPages={pageResult.totalPages}
          onPageChange={setPage}
          totalItems={pageResult.total}
          totalLabel="aircraft"
          itemsPerPage={FLEET_DASHBOARD_PAGE_SIZE}
          disabled={loading}
          className="px-6"
        />
      </div>
    </div>
  );
}
