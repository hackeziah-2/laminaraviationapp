import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { DataTablePagination } from "../ui/DataTablePagination";
import { Skeleton } from "../ui/skeleton";
import {
  formatReportNumber,
  type AircraftFuelBreakdown,
  type MonthlyFuelRow,
} from "../../types/dashboardReport.types";

type AircraftBreakdownTableProps = {
  monthly: MonthlyFuelRow[];
  loading?: boolean;
};

type FlatRow = {
  periodKey: string;
  periodLabel: string;
  tailNumber: string;
  hours: number;
  fuelGal: number;
  fuelBurnPerHour: number | null;
  oilUsageQrts: number;
};

type SortKey =
  | "periodLabel"
  | "tailNumber"
  | "hours"
  | "fuelGal"
  | "fuelBurnPerHour"
  | "oilUsageQrts";

const COLUMNS: {
  key: SortKey;
  label: string;
  align?: "left" | "right" | "center";
}[] = [
  { key: "periodLabel", label: "Month", align: "center" },
  { key: "tailNumber", label: "Aircraft Registration", align: "left" },
  { key: "hours", label: "ATL Hours", align: "right" },
  { key: "fuelGal", label: "Fuel (Gal)", align: "right" },
  { key: "fuelBurnPerHour", label: "Fuel Burn / Hour", align: "right" },
  { key: "oilUsageQrts", label: "Oil Usage", align: "right" },
];

function flattenMonthly(monthly: MonthlyFuelRow[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const period of monthly) {
    for (const ac of period.aircraftBreakdown ?? []) {
      rows.push({
        periodKey: period.month,
        periodLabel: period.monthLabel,
        tailNumber: ac.tailNumber,
        hours: ac.hours,
        fuelGal: ac.fuelGal,
        fuelBurnPerHour: ac.fuelBurnPerHour,
        oilUsageQrts: ac.oilUsageQrts,
      });
    }
  }
  return rows;
}

function compareValues(
  a: FlatRow,
  b: FlatRow,
  key: SortKey,
  dir: "asc" | "desc"
): number {
  const av = a[key];
  const bv = b[key];
  let cmp = 0;
  if (av == null && bv == null) cmp = 0;
  else if (av == null) cmp = 1;
  else if (bv == null) cmp = -1;
  else if (typeof av === "string" && typeof bv === "string") {
    cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
  } else {
    cmp = Number(av) - Number(bv);
  }
  return dir === "asc" ? cmp : -cmp;
}

function cellValue(row: FlatRow, key: SortKey): string {
  const v = row[key];
  if (key === "periodLabel" || key === "tailNumber") {
    return String(v ?? "N/A");
  }
  return formatReportNumber(v as number | null);
}

function exportRows(rows: FlatRow[]) {
  const header = COLUMNS.map((c) => c.label);
  const aoa = [
    header,
    ...rows.map((row) => COLUMNS.map((c) => cellValue(row, c.key))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Aircraft Breakdown");
  XLSX.writeFile(
    wb,
    `aircraft-fuel-breakdown-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

function PeriodGroup({
  period,
  search,
}: {
  period: MonthlyFuelRow;
  search: string;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const aircraft = period.aircraftBreakdown ?? [];
    if (!q) return aircraft;
    return aircraft.filter((ac) =>
      ac.tailNumber.toLowerCase().includes(q)
    );
  }, [period.aircraftBreakdown, search]);

  const [open, setOpen] = useState(true);
  if (filtered.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-gray-100">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-gray-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          >
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
            )}
            <span>{period.monthLabel}</span>
            <span className="ml-auto text-xs font-normal text-gray-500">
              {filtered.length} aircraft ·{" "}
              {formatReportNumber(period.hours)} hrs ·{" "}
              {formatReportNumber(period.fuelGal)} gal
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead className="sticky top-0 z-[1]">
                <tr className="bg-[#061B50] text-white">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="border border-gray-300 px-3 py-2 text-xs font-bold tracking-wide"
                      style={{ textAlign: col.align ?? "center" }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ac: AircraftFuelBreakdown, idx) => {
                  const row: FlatRow = {
                    periodKey: period.month,
                    periodLabel: period.monthLabel,
                    ...ac,
                  };
                  return (
                    <tr
                      key={`${period.month}-${ac.tailNumber}`}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={`border border-gray-200 px-3 py-2 ${
                            col.align === "right"
                              ? "text-right tabular-nums"
                              : col.align === "left"
                                ? "text-left"
                                : "text-center"
                          } text-gray-800`}
                        >
                          {cellValue(row, col.key)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AircraftBreakdownTable({
  monthly,
  loading = false,
}: AircraftBreakdownTableProps) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("periodLabel");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  const flatRows = useMemo(() => flattenMonthly(monthly), [monthly]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = flatRows;
    if (q) {
      rows = rows.filter((r) => r.tailNumber.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => compareValues(a, b, sortKey, sortDir));
  }, [flatRows, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = filteredSorted.slice(
    (pageSafe - 1) * pageSize,
    pageSafe * pageSize
  );

  const visiblePeriods = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monthly;
    return monthly
      .map((p) => ({
        ...p,
        aircraftBreakdown: (p.aircraftBreakdown ?? []).filter((ac) =>
          ac.tailNumber.toLowerCase().includes(q)
        ),
      }))
      .filter((p) => (p.aircraftBreakdown ?? []).length > 0);
  }, [monthly, search]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Skeleton className="mb-3 h-6 w-48 bg-gray-100" />
        <Skeleton className="h-48 w-full bg-gray-100" />
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {open ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
              <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                Aircraft Breakdown
              </h3>
            </button>
          </CollapsibleTrigger>

          <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search registration…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search aircraft registration"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="breakdown-view" className="sr-only">
              View mode
            </label>
            <select
              id="breakdown-view"
              value={viewMode}
              onChange={(e) =>
                setViewMode(e.target.value as "grouped" | "flat")
              }
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="grouped">By month</option>
              <option value="flat">Flat table</option>
            </select>

            <button
              type="button"
              onClick={() => exportRows(filteredSorted)}
              disabled={filteredSorted.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export
            </button>
          </div>
        </div>

        <CollapsibleContent>
          {filteredSorted.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              No aircraft breakdown rows match the current search.
            </p>
          ) : viewMode === "grouped" ? (
            <div className="max-h-[520px] overflow-y-auto">
              {visiblePeriods.map((period) => (
                <PeriodGroup
                  key={period.month}
                  period={period}
                  search={search}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#061B50] text-white">
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="border border-gray-300 px-0 text-xs font-bold tracking-wide"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="flex w-full items-center justify-center gap-1 px-3 py-2.5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                          >
                            {col.label}
                            {sortKey === col.key ? (
                              <span aria-hidden>
                                {sortDir === "asc" ? "↑" : "↓"}
                              </span>
                            ) : null}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, idx) => (
                      <tr
                        key={`${row.periodKey}-${row.tailNumber}-${idx}`}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`border border-gray-200 px-3 py-2 ${
                              col.align === "right"
                                ? "text-right tabular-nums"
                                : col.align === "left"
                                  ? "text-left"
                                  : "text-center"
                            } text-gray-800`}
                          >
                            {cellValue(row, col.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-4 py-3">
                <DataTablePagination
                  currentPage={pageSafe}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredSorted.length}
                  totalLabel="rows"
                  itemsPerPage={pageSize}
                  onItemsPerPageChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
