import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAircraftListOrdered,
  type AircraftListItem,
} from "../../api/aircraftApi";
import {
  getAircraftTechnicalLogById,
  getAircraftTechnicalLogs,
  type AircraftTechnicalLog,
} from "../../api/aircraftTechnicalLogApi";
import {
  enrichDataQualityFlags,
  type DataQualityFlag,
  type DataQualityFlagRow,
  type DataQualitySeverity,
  type DataQualityStatus,
} from "../../types/dashboardReport.types";
import { buildTechnicalLogbookAtlRoute } from "../../utility/technicalLogbookRoute";
import { formatApiErrorMessage } from "../../utils/formatApiErrorMessage";
import { DataTablePagination } from "../ui/DataTablePagination";
import { Skeleton } from "../ui/skeleton";
import { ViewTechnicalLogbookEntryModal } from "../ViewTechnicalLogbookEntryModal";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

type DataQualityFlagsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flags: DataQualityFlag[];
  loading?: boolean;
  errorMessage?: string | null;
  filterKey?: string;
};

function severityClass(severity: DataQualitySeverity): string {
  if (severity === "Critical") return "bg-red-50 text-red-700 ring-red-200";
  if (severity === "Warning") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-sky-50 text-sky-700 ring-sky-200";
}

function statusClass(status: DataQualityStatus): string {
  return status === "Open"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-gray-100 text-gray-600 ring-gray-200";
}

export function DataQualityFlagsModal({
  open,
  onOpenChange,
  flags,
  loading = false,
  errorMessage = null,
  filterKey = "",
}: DataQualityFlagsModalProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [aircraftFilter, setAircraftFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"" | DataQualitySeverity>(
    ""
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | DataQualityStatus>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [aircraftOptions, setAircraftOptions] = useState<AircraftListItem[]>(
    []
  );
  const [openingAtl, setOpeningAtl] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [viewEntry, setViewEntry] = useState<{
    id: number;
    seqNo: string;
    acReg: string;
  } | null>(null);
  const [viewFullEntry, setViewFullEntry] =
    useState<AircraftTechnicalLog | null>(null);

  const rows = useMemo(() => enrichDataQualityFlags(flags), [flags]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setAircraftFilter("");
    setSeverityFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setPage(1);
    setRowError(null);
  }, [open, filterKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewEntry == null) {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange, viewEntry]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAircraftListOrdered()
      .then((list) => {
        if (!cancelled) setAircraftOptions(list);
      })
      .catch(() => {
        if (!cancelled) setAircraftOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const registrationToId = useMemo(() => {
    const map = new Map<string, number>();
    for (const ac of aircraftOptions) {
      const reg = ac.registration?.trim().toUpperCase();
      if (reg) map.set(reg, ac.id);
    }
    return map;
  }, [aircraftOptions]);

  const aircraftChoices = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const t = row.aircraftTail?.trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [rows]);

  const categoryChoices = useMemo(() => {
    const set = new Set(rows.map((r) => r.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (aircraftFilter && (row.aircraftTail ?? "") !== aircraftFilter) {
        return false;
      }
      if (severityFilter && row.severity !== severityFilter) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        row.aircraftTail,
        row.sequenceNo,
        row.category,
        row.description,
        row.invalidValue,
        row.severity,
        row.status,
        row.dateDetected,
        row.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    rows,
    search,
    aircraftFilter,
    severityFilter,
    categoryFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, aircraftFilter, severityFilter, categoryFilter, statusFilter]);

  const openAtlForRow = async (row: DataQualityFlagRow) => {
    const sequenceNo = row.sequenceNo?.trim();
    if (!sequenceNo) {
      setRowError("This flag has no ATL sequence number to open.");
      return;
    }
    setRowError(null);
    setOpeningAtl(true);
    try {
      const tail = row.aircraftTail?.trim().toUpperCase() ?? "";
      const aircraftId = tail ? registrationToId.get(tail) : undefined;
      const pageResult = await getAircraftTechnicalLogs(
        1,
        20,
        sequenceNo,
        aircraftId && aircraftId > 0 ? aircraftId : undefined
      );
      const match =
        pageResult.items.find(
          (item) =>
            String(item.sequenceNo ?? "").trim() === sequenceNo &&
            (!tail ||
              String(item.aircraft?.registration ?? "")
                .trim()
                .toUpperCase() === tail)
        ) ?? pageResult.items[0];

      if (!match?.id) {
        navigate(
          buildTechnicalLogbookAtlRoute({
            sequenceNo,
            aircraftId: aircraftId ?? null,
          })
        );
        onOpenChange(false);
        return;
      }

      const full = await getAircraftTechnicalLogById(match.id);
      setViewFullEntry(full);
      setViewEntry({
        id: match.id,
        seqNo: String(match.sequenceNo ?? sequenceNo),
        acReg:
          match.aircraft?.registration?.trim() ||
          row.aircraftTail?.trim() ||
          "",
      });
    } catch (err) {
      setRowError(
        formatApiErrorMessage(err, "Failed to open the related ATL record.")
      );
    } finally {
      setOpeningAtl(false);
    }
  };

  if (!open) {
    return (
      <ViewTechnicalLogbookEntryModal
        isOpen={viewEntry != null}
        onClose={() => {
          setViewEntry(null);
          setViewFullEntry(null);
        }}
        entry={
          viewEntry
            ? {
                id: viewEntry.id,
                seqNo: viewEntry.seqNo,
                acReg: viewEntry.acReg,
              }
            : null
        }
        fullEntry={viewFullEntry}
        permissionModuleCode="logbook"
      />
    );
  }

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 modal-overlay animate-modal-overlay"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dq-flags-modal-title"
        className="relative z-[201] flex max-h-[min(92vh,820px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="dq-flags-modal-title"
              className="flex items-center gap-2 text-base font-semibold text-gray-900"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              Data Quality Flags
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Complete list for the current dashboard filters. Click a row to
              open the related ATL record in view mode.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-w-0 shrink-0 space-y-3 border-b border-gray-100 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search registration, sequence, description…"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search data quality flags"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Aircraft
              <select
                value={aircraftFilter}
                onChange={(e) => setAircraftFilter(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">All aircraft</option>
                {aircraftChoices.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Severity
              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as "" | DataQualitySeverity)
                }
                className={SELECT_CLASS}
              >
                <option value="">All severities</option>
                <option value="Critical">Critical</option>
                <option value="Warning">Warning</option>
                <option value="Info">Info</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Category
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">All categories</option>
                {categoryChoices.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600">
              Status
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "" | DataQualityStatus)
                }
                className={SELECT_CLASS}
              >
                <option value="">All statuses</option>
                <option value="Open">Open</option>
                <option value="Resolved">Resolved</option>
              </select>
            </label>
          </div>
          {(errorMessage || rowError) && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {rowError || errorMessage}
            </div>
          )}
          {openingAtl && (
            <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Opening ATL record…
            </p>
          )}
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-5 py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-gray-300" aria-hidden />
              <p className="text-sm font-medium text-gray-800">
                No data quality flags match
              </p>
              <p className="max-w-sm text-sm text-gray-500">
                {errorMessage
                  ? "Resolve the report error and try again."
                  : "Try clearing search or filters, or widen the dashboard date/aircraft range."}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#061B50] text-white shadow-sm">
                <tr>
                  {[
                    "Aircraft",
                    "Sequence",
                    "Category",
                    "Issue description",
                    "Invalid value",
                    "Severity",
                    "Date detected",
                    "Status",
                  ].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-bold tracking-wide"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => void openAtlForRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openAtlForRow(row);
                      }
                    }}
                    className="cursor-pointer border-b border-gray-100 bg-white hover:bg-amber-50/40 focus:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  >
                    <td className="max-w-[8rem] break-words px-3 py-2.5 font-medium text-gray-900">
                      {row.aircraftTail || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-gray-800">
                      {row.sequenceNo || "—"}
                    </td>
                    <td className="max-w-[8rem] break-words px-3 py-2.5 text-gray-800">
                      {row.category}
                    </td>
                    <td
                      className="max-w-[18rem] px-3 py-2.5 text-gray-700"
                      style={{
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {row.description}
                    </td>
                    <td
                      className="max-w-[10rem] px-3 py-2.5 tabular-nums text-gray-700"
                      style={{
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {row.invalidValue}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${severityClass(row.severity)}`}
                      >
                        {row.severity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-gray-700">
                      {row.dateDetected}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="min-w-0 shrink-0 space-y-3 border-t border-gray-100 bg-white px-5 py-3">
          {!loading && filtered.length > 0 ? (
            <DataTablePagination
              currentPage={pageSafe}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filtered.length}
              totalLabel="flags"
              itemsPerPage={pageSize}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(modal, document.body)
        : null}
      <ViewTechnicalLogbookEntryModal
        isOpen={viewEntry != null}
        onClose={() => {
          setViewEntry(null);
          setViewFullEntry(null);
        }}
        entry={
          viewEntry
            ? {
                id: viewEntry.id,
                seqNo: viewEntry.seqNo,
                acReg: viewEntry.acReg,
              }
            : null
        }
        fullEntry={viewFullEntry}
        permissionModuleCode="logbook"
      />
    </>
  );
}
