import {
  ChevronDown,
  Download,
  Filter,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "../../utils/swalDefaults";
import {
  useAuditLogFilterOptions,
  useAuditLogs,
} from "../../hooks/useAuditLogs";
import { exportAuditLogs } from "../../services/audit-log.service";
import { DataTablePagination } from "../ui/DataTablePagination";
import { Spinner, SpinnerIcon } from "../ui/spinner";
import { AuditTrailDetailModal } from "./AuditTrailDetailModal";
import { AuditTrailSummaryCards } from "./AuditTrailSummaryCards";
import { AuditTrailTable } from "./AuditTrailTable";
import { AUDIT_ACTION_OPTIONS, formatModuleLabel } from "./auditTrailUtils";

const AUDIT_TRAIL_TAB = "audit-trail";

function buildAuditTrailSearchParams(user?: string) {
  const params = new URLSearchParams({ tab: AUDIT_TRAIL_TAB });
  if (user) params.set("user", user);
  return params;
}

const SELECT_CLASS =
  "cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

export function AuditTrail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUser = searchParams.get("user") ?? "";
  const initialSearch = searchParams.get("search") ?? "";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchDebounced, setSearchDebounced] = useState(initialSearch.trim());
  const [action, setAction] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [performedByName, setPerformedByName] = useState(initialUser);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  useEffect(() => {
    if (initialUser) {
      setPerformedByName(initialUser);
    }
  }, [initialUser]);

  // Sync the search box when navigating here with a ?search= param
  // (e.g. "View Audit Trail" from User Management).
  useEffect(() => {
    if (initialSearch) {
      setSearchInput(initialSearch);
      setSearchDebounced(initialSearch.trim());
      setPage(1);
    }
  }, [initialSearch]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: searchDebounced || undefined,
      action: action || undefined,
      moduleName: moduleName || undefined,
      performedByName: performedByName || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [
      page,
      limit,
      searchDebounced,
      action,
      moduleName,
      performedByName,
      startDate,
      endDate,
    ]
  );

  const { data, isLoading, isError, refetch, isFetching } =
    useAuditLogs(queryParams);
  const { data: filterOptions } = useAuditLogFilterOptions();

  const isInitialLoading = isLoading;
  const isRefetching = isFetching && !isLoading;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const summary = data?.summary ?? {
    total: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
  };
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const hasActiveFilters = Boolean(
    action ||
      moduleName ||
      performedByName ||
      startDate ||
      endDate ||
      searchInput
  );

  const handleView = (id: number) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const rows = await exportAuditLogs(queryParams);
      if (rows.length === 0) {
        await Swal.fire({
          icon: "info",
          title: "No records",
          text: "No audit logs match the current filters.",
        });
        return;
      }

      const header = [
        "ID",
        "Date",
        "Module",
        "Table",
        "Action",
        "User",
        "Record ID",
        "Changed Fields",
        "IP Address",
      ];
      const csvRows = rows.map((row) => [
        row.id,
        row.createdAt,
        row.moduleName,
        row.tableName,
        row.action,
        row.performedByName ?? "",
        row.recordId,
        (row.changedFields ?? []).join("; "),
        row.ipAddress ?? "",
      ]);

      const escape = (value: unknown) => {
        const str = String(value ?? "");
        return `"${str.replace(/"/g, '""')}"`;
      };

      const csv = [header, ...csvRows]
        .map((line) => line.map(escape).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-trail-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to export audit logs";
      await Swal.fire({ icon: "error", title: "Export failed", text: message });
    } finally {
      setExporting(false);
    }
  }, [queryParams]);

  const clearFilters = () => {
    setSearchInput("");
    setSearchDebounced("");
    setAction("");
    setModuleName("");
    setPerformedByName("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setSearchParams(buildAuditTrailSearchParams());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Track all system activity and data changes
          </p>
        </div>
      </div>

      <AuditTrailSummaryCards summary={summary} loading={isInitialLoading} />

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="space-y-3 border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by module, user, action..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Start date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="End date"
            />

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                filtersOpen
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}

            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-xl border border-gray-200 p-2.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
              aria-label="Refresh"
            >
              {isFetching ? (
                <SpinnerIcon size="sm" aria-hidden />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </div>

          {filtersOpen && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className={SELECT_CLASS}
                style={{
                  backgroundImage: SELECT_CHEVRON,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.5rem center",
                  backgroundSize: "12px",
                }}
                aria-label="Filter by action"
              >
                {AUDIT_ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={moduleName}
                onChange={(e) => {
                  setModuleName(e.target.value);
                  setPage(1);
                }}
                className={SELECT_CLASS}
                style={{
                  backgroundImage: SELECT_CHEVRON,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.5rem center",
                  backgroundSize: "12px",
                }}
                aria-label="Filter by module"
              >
                <option value="">All Modules</option>
                {(filterOptions?.moduleNames ?? []).map((name) => (
                  <option key={name} value={name}>
                    {formatModuleLabel(name)}
                  </option>
                ))}
              </select>
              <select
                value={performedByName}
                onChange={(e) => {
                  setPerformedByName(e.target.value);
                  setPage(1);
                  if (e.target.value) {
                    setSearchParams(
                      buildAuditTrailSearchParams(e.target.value)
                    );
                  } else {
                    setSearchParams(buildAuditTrailSearchParams());
                  }
                }}
                className={SELECT_CLASS}
                style={{
                  backgroundImage: SELECT_CHEVRON,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.5rem center",
                  backgroundSize: "12px",
                }}
                aria-label="Filter by user"
              >
                <option value="">All Users</option>
                {(filterOptions?.performedByNames ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-2">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
            {isInitialLoading ? (
              <>
                <SpinnerIcon size="sm" aria-hidden />
                Loading…
              </>
            ) : (
              <>
                {total} {total === 1 ? "record" : "records"} found
                {isRefetching ? (
                  <span className="inline-flex items-center gap-1.5 text-gray-400">
                    <SpinnerIcon size="sm" aria-hidden />
                    Updating…
                  </span>
                ) : null}
              </>
            )}
          </span>
        </div>

        {isError ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-gray-400">Failed to load audit logs.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : isInitialLoading ? (
          <Spinner className="py-16" label="Loading audit logs…" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <AuditTrailTable items={items} onView={handleView} />
            </div>

            <DataTablePagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
              disabled={isFetching}
              totalLabel="records"
              className="border-t border-gray-100"
            />
          </>
        )}
      </div>

      <AuditTrailDetailModal
        auditLogId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
