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
  Save,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "../utils/swalDefaults";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import {
  getFleetDailyUpdatePaged,
  getAllFleetDailyUpdatesOrdered,
  updateFleetDailyUpdateRemark,
  bulkUpdateFleetDailyUpdates,
  type FleetDailyUpdateItem,
  type FleetDailyUpdateBulkUpdateItem,
} from "../api/fleetDailyUpdateApi";
import {
  reorderAircraft,
} from "../api/aircraftApi";
import { SpinnerIcon } from "./ui/spinner";
import { DataTablePagination } from "./ui/DataTablePagination";
import { SortableTableRow } from "./SortableTableRow";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { useTableDisplayOrderReorder } from "../hooks/useTableDisplayOrderReorder";
import { formatDisplayDate } from "../utility/utils";
import {
  AIRCRAFT_ARRANGEMENT_DISABLED_TOOLTIP,
  isManualArrangementMode,
  toAircraftReorderPayload,
} from "../utils/displayOrderReorder";

/** Map status text to badge/row color: Operational / legacy Running = green, Ongoing Maintenance = yellow, AOG = red */
function statusToColor(status: string | undefined): "green" | "yellow" | "red" {
  if (!status) return "green";
  const s = status.trim().toUpperCase();
  if (s === "AOG") return "red";
  if (s === "ONGOING MAINTENANCE" || s === "ONGOINGMAINTENANCE")
    return "yellow";
  return "green"; // Operational, legacy Running, or default
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
  { value: "Operational", label: "Operational" },
  { value: "Ongoing Maintenance", label: "Ongoing Maintenance" },
  { value: "AOG", label: "AOG" },
];

interface BulkEditDraft {
  status: string;
  tachEod: string;
  remarks: string;
}

function getRowKey(item: FleetDailyUpdateItem): string {
  if (item.id != null) return `id:${item.id}`;
  const aircraftId = item.aircraftId ?? item.aircraft?.id;
  if (aircraftId != null) return `aircraft:${aircraftId}`;
  return `ident:${item.ident ?? item.registration ?? "unknown"}`;
}

function normalizeStatusForEdit(item: FleetDailyUpdateItem): string {
  const currentStatus = item.status ?? item.workStatus ?? "";
  const legacy =
    currentStatus.trim().toLowerCase() === "running"
      ? "Operational"
      : currentStatus;
  return STATUS_OPTIONS.some((o) => o.value === legacy)
    ? legacy
    : STATUS_OPTIONS[0]?.value ?? "Operational";
}

function draftFromItem(item: FleetDailyUpdateItem): BulkEditDraft {
  return {
    status: normalizeStatusForEdit(item),
    tachEod: item.tachEod != null ? String(item.tachEod) : "",
    remarks: item.remarks ?? "",
  };
}

function parseTachEod(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = parseFloat(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function tachEodValuesEqual(a: string, b: string): boolean {
  const parsedA = parseTachEod(a);
  const parsedB = parseTachEod(b);
  return parsedA === parsedB;
}

function buildBulkUpdates(
  items: FleetDailyUpdateItem[],
  drafts: Record<string, BulkEditDraft>,
  originals: Record<string, BulkEditDraft>
): FleetDailyUpdateBulkUpdateItem[] {
  const updates: FleetDailyUpdateBulkUpdateItem[] = [];

  for (const item of items) {
    if (item.id == null) continue;

    const key = getRowKey(item);
    const draft = drafts[key];
    const original = originals[key];
    if (!draft || !original) continue;

    const payload: FleetDailyUpdateBulkUpdateItem = { id: item.id };
    let hasChanges = false;

    if (draft.status !== original.status) {
      payload.status = draft.status;
      hasChanges = true;
    }
    if (!tachEodValuesEqual(draft.tachEod, original.tachEod)) {
      payload.tach_time_eod = parseTachEod(draft.tachEod);
      hasChanges = true;
    }
    if (draft.remarks !== original.remarks) {
      payload.remarks = draft.remarks;
      hasChanges = true;
    }

    if (hasChanges) {
      updates.push(payload);
    }
  }

  return updates;
}

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
  /**
   * Server sort for A/C IDENT. null = default Aircraft.display_order (manual arrangement).
   */
  const [registrationSort, setRegistrationSort] = useState<"asc" | "desc" | null>(
    null
  );
  const sortParam =
    registrationSort === "asc"
      ? "registration"
      : registrationSort === "desc"
        ? "-registration"
        : "";

  // Edit remark/status modal
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FleetDailyUpdateItem | null>(
    null
  );
  const [remarkDraft, setRemarkDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  // Bulk edit mode
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkDrafts, setBulkDrafts] = useState<Record<string, BulkEditDraft>>(
    {}
  );
  const [bulkOriginals, setBulkOriginals] = useState<
    Record<string, BulkEditDraft>
  >({});
  const [bulkUpdates, setBulkUpdates] = useState<
    FleetDailyUpdateBulkUpdateItem[]
  >([]);
  const [savingBulk, setSavingBulk] = useState(false);

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

  const getAircraftSortId = useCallback((item: FleetDailyUpdateItem) => {
    return Number(item.aircraftId ?? item.aircraft?.id ?? 0);
  }, []);

  // Same as TCC: drag only when search/filters/sorts are clear (default display_order).
  const arrangementMode = useMemo(
    () =>
      isManualArrangementMode({
        search: searchDebounced,
        categoryFilter: filterStatus === "all" ? "" : filterStatus,
        columnSortActive: registrationSort != null,
      }),
    [searchDebounced, filterStatus, registrationSort]
  );

  const canUpdateDaily = canUpdate("daily-update");
  const canReorder =
    arrangementMode && canUpdateDaily && !bulkEditMode && !loading;

  const dragDisabledReason = !canUpdateDaily
    ? "You do not have permission to reorder aircraft."
    : bulkEditMode
      ? "Save or cancel maintenance edits before rearranging aircraft."
      : AIRCRAFT_ARRANGEMENT_DISABLED_TOOLTIP;

  const persistAircraftReorder = useCallback(
    async (payload: { items: { id: number; display_order: number }[] }) => {
      await reorderAircraft(toAircraftReorderPayload(payload));
    },
    []
  );

  const loadFullDailyOrdered = useCallback(async () => {
    return getAllFleetDailyUpdatesOrdered();
  }, []);

  const {
    sensors: dailyDndSensors,
    handleDragEnd: handleDailyDragEnd,
    isReordering: dailyReordering,
    dndDisabled: dailyDndDisabled,
  } = useTableDisplayOrderReorder({
    items,
    setItems,
    canReorder,
    pageOffset: (currentPage - 1) * itemsPerPage,
    getItemId: getAircraftSortId,
    loadFullOrdered: loadFullDailyOrdered,
    persistReorder: persistAircraftReorder,
    onSuccess: async () => {
      await fetchData();
      await Swal.fire({
        icon: "success",
        title: "Order saved",
        text: "Aircraft arrangement has been updated.",
        timer: 1400,
        showConfirmButton: false,
      });
    },
    onError: async (message) => {
      await fetchData();
      await Swal.fire({
        icon: "error",
        title: "Reorder failed",
        text: message,
      });
    },
  });

  // Keep bulk PATCH payload in sync with table edits (only changed fields).
  useEffect(() => {
    if (!bulkEditMode) {
      setBulkUpdates([]);
      return;
    }
    setBulkUpdates(buildBulkUpdates(items, bulkDrafts, bulkOriginals));
  }, [bulkEditMode, items, bulkDrafts, bulkOriginals]);

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
    if (bulkEditMode) return;
    fetchData();
  }, [fetchData, bulkEditMode]);

  const exitBulkEditMode = useCallback(() => {
    setBulkEditMode(false);
    setBulkDrafts({});
    setBulkOriginals({});
    setBulkUpdates([]);
  }, []);

  const enterBulkEditMode = useCallback(() => {
    const drafts: Record<string, BulkEditDraft> = {};
    const originals: Record<string, BulkEditDraft> = {};
    for (const item of items) {
      const key = getRowKey(item);
      const draft = draftFromItem(item);
      drafts[key] = draft;
      originals[key] = { ...draft };
    }
    setBulkDrafts(drafts);
    setBulkOriginals(originals);
    setBulkUpdates([]);
    setBulkEditMode(true);
  }, [items]);

  const cancelBulkEdit = useCallback(() => {
    exitBulkEditMode();
  }, [exitBulkEditMode]);

  const updateBulkDraft = useCallback(
    (key: string, field: keyof BulkEditDraft, value: string) => {
      setBulkDrafts((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleSaveBulkUpdates = useCallback(async () => {
    if (bulkUpdates.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "No changes",
        text: "No fields were modified.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    if (savingBulk) return;

    setSavingBulk(true);
    try {
      await confirmSaveEntry(true, async () => {
        await bulkUpdateFleetDailyUpdates({ updates: bulkUpdates });
        exitBulkEditMode();
        await fetchData();
      });
    } finally {
      setSavingBulk(false);
    }
  }, [bulkUpdates, exitBulkEditMode, fetchData]);

  const guardBulkEditNavigation = useCallback(async (): Promise<boolean> => {
    if (!bulkEditMode) return true;
    const result = await Swal.fire({
      icon: "warning",
      title: "Unsaved changes",
      text: "Bulk edit is active. Cancel editing to continue.",
      showCancelButton: true,
      confirmButtonText: "Cancel editing",
      cancelButtonText: "Stay",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) {
      exitBulkEditMode();
      return true;
    }
    return false;
  }, [bulkEditMode, exitBulkEditMode]);

  const handleFilterChange = async (value: string) => {
    if (!(await guardBulkEditNavigation())) return;
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const toggleRegistrationSort = async () => {
    if (!(await guardBulkEditNavigation())) return;
    setRegistrationSort((prev) => {
      if (prev == null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
    setCurrentPage(1);
  };

  const openRemarkModal = useCallback((item: FleetDailyUpdateItem) => {
    setEditingItem(item);
    setRemarkDraft(item.remarks ?? "");
    const currentStatus = item.status ?? item.workStatus ?? "";
    const legacy =
      currentStatus.trim().toLowerCase() === "running"
        ? "Operational"
        : currentStatus;
    setStatusDraft(
      STATUS_OPTIONS.some((o) => o.value === legacy)
        ? legacy
        : STATUS_OPTIONS[0]?.value ?? "Operational"
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
    if (savingRemark) return;

    setSavingRemark(true);
    try {
      await confirmSaveEntry(true, async () => {
        await updateFleetDailyUpdateRemark(editingItem, {
          remarks: remarkDraft,
          status: statusDraft,
        });
        setShowRemarkModal(false);
        setEditingItem(null);
        setRemarkDraft("");
        setStatusDraft("");
        await fetchData();
      });
    } finally {
      setSavingRemark(false);
    }
  }, [editingItem, remarkDraft, statusDraft, fetchData, savingRemark]);

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
          {bulkEditMode ? (
            <>
              <button
                type="button"
                onClick={handleSaveBulkUpdates}
                disabled={savingBulk || loading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingBulk ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {savingBulk ? "Saving..." : "Save Updates"}
                </span>
              </button>
              <button
                type="button"
                onClick={cancelBulkEdit}
                disabled={savingBulk}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRefresh}
                disabled={loading || dailyReordering}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {canUpdate("daily-update") && (
                <button
                  type="button"
                  onClick={enterBulkEditMode}
                  disabled={
                    loading ||
                    items.length === 0 ||
                    dailyReordering
                  }
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-blue-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Blue Header Bar */}
        <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <h3 className="text-sm">AIRCRAFT FLEET DAILY UPDATE</h3>
          <span className="text-sm">
            DATE: {formatDisplayDate(new Date().toISOString())}
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
                placeholder="Search by Aircraft Registration"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={bulkEditMode}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filter by Status</span>
              <select
                value={filterStatus}
                onChange={(e) => void handleFilterChange(e.target.value)}
                disabled={bulkEditMode}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-right disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundPosition: "right 8px center",
                }}
              >
                <option value="all">All Aircraft</option>
                <option value="Operational">Operational</option>
                <option value="Ongoing Maintenance">Ongoing Maintenance</option>
                <option value="AOG">AOG</option>
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
                <th className="px-2 py-3 text-left text-gray-900 text-xs border-r border-gray-300 w-10">
                  Arrange
                </th>
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
                    ) : registrationSort === "desc" ? (
                      <ChevronDown
                        className="w-3.5 h-3.5 shrink-0"
                        aria-hidden
                      />
                    ) : null}
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
              </tr>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300"></th>
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
              </tr>
            </thead>
            <DndContext
              sensors={dailyDndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDailyDragEnd}
            >
              <SortableContext
                items={items
                  .map((item) => getAircraftSortId(item))
                  .filter((id) => id > 0)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        {loading
                          ? "Loading..."
                          : "No aircraft found matching your filters."}
                      </td>
                    </tr>
                  ) : (
                    items.map((aircraft) => {
                      const sortId = getAircraftSortId(aircraft);
                      const identLabel =
                        aircraft.ident ??
                        aircraft.registration ??
                        String(sortId);
                      return (
                        <SortableTableRow
                          key={
                            aircraft.id ??
                            aircraft.aircraftId ??
                            aircraft.ident ??
                            Math.random()
                          }
                          id={sortId > 0 ? sortId : `row-${aircraft.id}`}
                          disabled={dailyDndDisabled || sortId <= 0}
                          dragLabel={`Move aircraft ${identLabel}`}
                          disabledReason={dragDisabledReason}
                          className={`border-b border-gray-200 ${getRowColorClass(
                            aircraft.rowColor,
                            bulkEditMode
                              ? statusToColor(
                                  bulkDrafts[getRowKey(aircraft)]?.status ??
                                    aircraft.status ??
                                    aircraft.workStatus
                                )
                              : aircraft.statusColor,
                            bulkEditMode
                              ? bulkDrafts[getRowKey(aircraft)]?.status ??
                                  aircraft.status ??
                                  aircraft.workStatus
                              : aircraft.status ?? aircraft.workStatus
                          )}`}
                        >
                          {({ dragHandle }) => (
                            <>
                              <td className="px-2 py-3 text-sm border-r border-gray-300 align-middle">
                                {dragHandle}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                                {(() => {
                                  const ident =
                                    aircraft.ident ??
                                    aircraft.registration ??
                                    "-";
                                  const trimmed =
                                    ident !== "-" ? String(ident).trim() : "";
                                  if (!trimmed) return "-";
                                  return (
                                    <Link
                                      to={`/profile?aircraft=${encodeURIComponent(
                                        trimmed
                                      )}`}
                                      className="text-blue-600 underline hover:text-blue-800 cursor-pointer font-medium"
                                    >
                                      {trimmed}
                                    </Link>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 text-sm border-r border-gray-300">
                                {bulkEditMode ? (
                                  <select
                                    value={
                                      bulkDrafts[getRowKey(aircraft)]?.status ??
                                      normalizeStatusForEdit(aircraft)
                                    }
                                    onChange={(e) =>
                                      updateBulkDraft(
                                        getRowKey(aircraft),
                                        "status",
                                        e.target.value
                                      )
                                    }
                                    disabled={savingBulk}
                                    className="w-full min-w-[140px] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                  >
                                    {STATUS_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  getStatusBadge(
                                    aircraft.status ??
                                      aircraft.workStatus ??
                                      "-"
                                  )
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                                {(() => {
                                  const lines = nextInspDueDisplayLines(
                                    aircraft.nextInspDue ??
                                      aircraft.nextInspectionDue,
                                    aircraft.nextInspDueUnit ??
                                      aircraft.nextInspectionDueUnit
                                  );
                                  if (lines.length === 0) return "-";
                                  return (
                                    <div className="space-y-1">
                                      {lines.map((text, index) => (
                                        <div
                                          key={`${aircraft.id}-next-insp-${index}`}
                                        >
                                          {text}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                                {aircraft.tachDue ??
                                  aircraft.tachTimeDue ??
                                  "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                                {bulkEditMode ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      bulkDrafts[getRowKey(aircraft)]?.tachEod ??
                                      (aircraft.tachEod != null
                                        ? String(aircraft.tachEod)
                                        : "")
                                    }
                                    onChange={(e) =>
                                      updateBulkDraft(
                                        getRowKey(aircraft),
                                        "tachEod",
                                        e.target.value
                                      )
                                    }
                                    disabled={savingBulk}
                                    className="w-full min-w-[80px] px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                    placeholder="-"
                                  />
                                ) : (
                                  aircraft.tachEod ?? "-"
                                )}
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
                                {bulkEditMode ? (
                                  <textarea
                                    value={
                                      bulkDrafts[getRowKey(aircraft)]
                                        ?.remarks ??
                                      aircraft.remarks ??
                                      ""
                                    }
                                    onChange={(e) =>
                                      updateBulkDraft(
                                        getRowKey(aircraft),
                                        "remarks",
                                        e.target.value
                                      )
                                    }
                                    disabled={savingBulk}
                                    rows={2}
                                    className="w-full min-w-[160px] px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-y"
                                    placeholder="Enter remarks..."
                                  />
                                ) : (
                                  aircraft.remarks ?? "-"
                                )}
                              </td>
                            </>
                          )}
                        </SortableTableRow>
                      );
                    })
                  )}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>

        {total > 0 && !loading && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={async (page) => {
              if (!(await guardBulkEditNavigation())) return;
              setCurrentPage(page);
            }}
            totalItems={total}
            totalLabel="aircraft"
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={async (size) => {
              if (!(await guardBulkEditNavigation())) return;
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50]}
            disabled={loading || dailyReordering || bulkEditMode}
            className="px-6"
          />
        )}
      </div>

      {/* Edit Remark Modal */}
      {showRemarkModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
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
