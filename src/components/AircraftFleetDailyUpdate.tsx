import {
  RefreshCw,
  Printer,
  Download,
  Search,
  Loader,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
  getFleetDailyUpdatePaged,
  updateFleetDailyUpdateRemark,
  type FleetDailyUpdateItem,
} from "../api/fleetDailyUpdateApi";
import { SpinnerIcon } from "./ui/spinner";
import { useUserPermissions } from "../hooks/useUserPermissions";

/** Map status text to badge/row color: Running=green, ONGOING MAINTENANCE=yellow, AOG=red */
function statusToColor(status: string | undefined): "green" | "yellow" | "red" {
  if (!status) return "green";
  const s = status.trim().toUpperCase();
  if (s === "AOG") return "red";
  if (s === "ONGOING MAINTENANCE" || s === "ONGOINGMAINTENANCE")
    return "yellow";
  return "green"; // Running or default
}

function splitMultilineField(value: string | undefined): string[] {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** Renders next inspection due with optional unit beside each line (or zipped units). */
function nextInspDueDisplayLines(
  due: string | undefined,
  unit: string | undefined
): string[] {
  const dueLines = splitMultilineField(due);
  const unitLines = splitMultilineField(unit);
  if (dueLines.length === 0) return [];
  const singleUnit = unitLines.length <= 1 ? unitLines[0] : undefined;
  return dueLines.map((line, i) => {
    const u =
      singleUnit !== undefined
        ? singleUnit
        : unitLines[i] ?? unitLines[unitLines.length - 1] ?? "";
    const suffix = u ? ` ${u}` : "";
    return `${line}${suffix}`;
  });
}

const STATUS_OPTIONS = [
  { value: "Running", label: "Running" },
  { value: "Ongoing Maintenance", label: "Ongoing Maintenance" },
  { value: "AOG", label: "AOG" },
];

export function AircraftFleetDailyUpdate() {
  const { canUpdate } = useUserPermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<FleetDailyUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  /** Server sort for A/C IDENT: registration (asc) / -registration (desc) */
  const [registrationSort, setRegistrationSort] = useState<"asc" | "desc">(
    "desc"
  );
  const sortParam =
    registrationSort === "asc" ? "registration" : "-registration";

  // Edit remark/status modal
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FleetDailyUpdateItem | null>(
    null
  );
  const [remarkDraft, setRemarkDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  // Map filterStatus to API status param (backend may expect these values)
  const apiStatus = filterStatus === "all" ? "" : filterStatus;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFleetDailyUpdatePaged(
        currentPage,
        itemsPerPage,
        searchDebounced,
        apiStatus,
        sortParam
      );
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.pages);
    } catch (err: any) {
      console.error("Error fetching fleet daily update:", err);
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [currentPage, itemsPerPage, searchDebounced, apiStatus, sortParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    };
  }, [searchQuery]);

  // No separate effect: page reset is done in handleFilterChange and items-per-page onChange

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const toggleRegistrationSort = () => {
    setRegistrationSort((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  };

  const openRemarkModal = useCallback((item: FleetDailyUpdateItem) => {
    setEditingItem(item);
    setRemarkDraft(item.remarks ?? "");
    const currentStatus = item.status ?? item.workStatus ?? "";
    setStatusDraft(
      STATUS_OPTIONS.some((o) => o.value === currentStatus)
        ? currentStatus
        : STATUS_OPTIONS[0]?.value ?? "Running"
    );
    setShowRemarkModal(true);
  }, []);

  const closeRemarkModal = useCallback(() => {
    if (!savingRemark) {
      setShowRemarkModal(false);
      setEditingItem(null);
      setRemarkDraft("");
      setStatusDraft("");
    }
  }, [savingRemark]);

  const handleSaveRemark = useCallback(async () => {
    if (!editingItem) return;
    setSavingRemark(true);
    try {
      await updateFleetDailyUpdateRemark(editingItem, {
        remarks: remarkDraft,
        status: statusDraft,
      });
      setShowRemarkModal(false);
      setEditingItem(null);
      setRemarkDraft("");
      setStatusDraft("");
      await fetchData();
      await Swal.fire({
        icon: "success",
        title: "Saved",
        text: "Remark and status updated successfully.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Error updating remark:", err);
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        "Failed to update remark.";
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: typeof msg === "string" ? msg : JSON.stringify(msg),
      });
    } finally {
      setSavingRemark(false);
    }
  }, [editingItem, remarkDraft, statusDraft, fetchData]);

  const startIndex = total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, total);

  const getRowColorClass = (
    rowColor?: string,
    statusColor?: string,
    statusText?: string
  ) => {
    if (rowColor?.startsWith("bg-")) return rowColor;
    const map: Record<string, string> = {
      green: "bg-green-100",
      yellow: "bg-yellow-100",
      red: "bg-red-100",
      orange: "bg-orange-100",
      blue: "bg-blue-100",
      purple: "bg-purple-100",
      pink: "bg-pink-100",
      teal: "bg-teal-100",
      lime: "bg-lime-100",
      indigo: "bg-indigo-100",
    };
    const c =
      statusColor || rowColor || (statusText ? statusToColor(statusText) : "");
    return map[c] || map[statusToColor(statusText)] || "";
  };

  const getStatusBadge = (status: string, color?: string) => {
    const colorClasses: Record<string, string> = {
      green: "bg-green-500 text-white",
      yellow: "bg-yellow-400 text-gray-900",
      red: "bg-red-500 text-white",
    };
    const c = color || statusToColor(status);
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          colorClasses[c] || colorClasses.green
        }`}
      >
        {status || "-"}
      </span>
    );
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }
    return pages;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl text-gray-900">
            Aircraft Fleet Daily Update
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            Daily maintenance status and maintenance tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Blue Header Bar */}
        <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <h3 className="text-sm">AIRCRAFT FLEET DAILY UPDATE</h3>
          <span className="text-sm">
            DATE:{" "}
            {new Date()
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              })
              .replace(/ /g, "-")}
          </span>
        </div>

        {/* Search and Filters */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ident, status, inspection, or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Showing count and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-gray-600">
                Showing {startIndex} to {endIndex} of {total} aircraft
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filter by Status</span>
                <select
                  value={filterStatus}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-right"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundPosition: "right 8px center",
                  }}
                >
                  <option value="all">All Aircraft</option>
                  <option value="Running">Running</option>
                  <option value="Ongoing Maintenance">
                    Ongoing Maintenance
                  </option>
                  <option value="AOG">AOG</option>
                </select>
              </div>
            </div>

            {/* Right: Items per page */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-right"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundPosition: "right 8px center",
                }}
              >
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative min-h-[200px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <SpinnerIcon size="lg" />
            </div>
          ) : null}
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-4 py-3 text-left text-gray-900 text-xs border-r border-gray-300">
                  <button
                    type="button"
                    onClick={toggleRegistrationSort}
                    className="inline-flex items-center gap-1 text-left font-semibold text-gray-900 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                    title="Sort by registration"
                  >
                    A/C IDENT
                    {registrationSort === "asc" ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown
                        className="w-3.5 h-3.5 shrink-0"
                        aria-hidden
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-gray-900 text-xs border-r border-gray-300">
                  STATUS
                </th>
                <th className="px-4 py-3 text-left text-gray-900 text-xs border-r border-gray-300">
                  NEXT INSP. DUE
                </th>
                <th
                  colSpan={2}
                  className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300"
                >
                  TACH TIME
                </th>
                <th className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300">
                  REMAINING
                  <br />
                  TIME BEFORE
                  <br />
                  NEXT INSP (HRS)
                </th>
                <th className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300">
                  REMAINING
                  <br />
                  TIME BEFORE
                  <br />
                  ENGINE
                  <br />
                  OVERHAUL (HRS)
                </th>
                <th className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300">
                  REMAINING
                  <br />
                  TIME BEFORE
                  <br />
                  PROPELLER
                  <br />
                  OVERHAUL (HRS)
                </th>
                <th className="px-4 py-3 text-left text-gray-900 text-xs">
                  REMARKS
                </th>
                <th className="px-4 py-3 text-center text-gray-900 text-xs w-20">
                  ACTIONS
                </th>
              </tr>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th className="px-4 py-2 text-center text-gray-700 text-xs border-r border-gray-300">
                  DUE
                </th>
                <th className="px-4 py-2 text-center text-gray-700 text-xs border-r border-gray-300">
                  EOD
                </th>
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {loading
                      ? "Loading..."
                      : "No aircraft found matching your filters."}
                  </td>
                </tr>
              ) : (
                items.map((aircraft) => (
                  <tr
                    key={aircraft.id ?? aircraft.ident ?? Math.random()}
                    className={`border-b border-gray-200 ${getRowColorClass(
                      aircraft.rowColor,
                      aircraft.statusColor,
                      aircraft.status ?? aircraft.workStatus
                    )}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      {aircraft.ident ?? aircraft.registration ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm border-r border-gray-300">
                      {getStatusBadge(
                        aircraft.status ?? aircraft.workStatus ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                      {(() => {
                        const lines = nextInspDueDisplayLines(
                          aircraft.nextInspDue ?? aircraft.nextInspectionDue,
                          aircraft.nextInspDueUnit ??
                            aircraft.nextInspectionDueUnit
                        );
                        if (lines.length === 0) return "-";
                        return (
                          <div className="space-y-1">
                            {lines.map((text, index) => (
                              <div key={`${aircraft.id}-next-insp-${index}`}>
                                {text}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                      {aircraft.tachDue ?? aircraft.tachTimeDue ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                      {aircraft.tachEod ?? "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-center border-r border-gray-300 ${
                        aircraft.criticalValue === "remainingNextInsp"
                          ? "bg-red-500 text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {aircraft.remainingNextInsp ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                      {aircraft.remainingEngine ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                      {aircraft.remainingPropeller ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {aircraft.remarks ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-center border-gray-300">
                      {canUpdate("daily-update") && (
                        <button
                          type="button"
                          onClick={() => openRemarkModal(aircraft)}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                          title="Edit remark"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && !loading && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Edit Remark Modal */}
      {showRemarkModal && editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeRemarkModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            {savingRemark && (
              <div className="absolute inset-0 rounded-lg bg-white/80 flex items-center justify-center z-10">
                <SpinnerIcon size="xl" />
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Remark
              </h3>
              <button
                type="button"
                onClick={closeRemarkModal}
                disabled={savingRemark}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-gray-600">
                Aircraft:{" "}
                <span className="font-medium text-gray-900">
                  {editingItem.ident ?? editingItem.registration ?? "—"}
                </span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={remarkDraft}
                  onChange={(e) => setRemarkDraft(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter remarks..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                type="button"
                onClick={closeRemarkModal}
                disabled={savingRemark}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              {canUpdate("daily-update") && (
                <button
                  type="button"
                  onClick={handleSaveRemark}
                  disabled={savingRemark}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingRemark ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : null}
                  {savingRemark ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
