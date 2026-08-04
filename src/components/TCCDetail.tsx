import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Loader,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AddTCCModal } from "./AddTCCModal";
import { SortableTableRow } from "./SortableTableRow";
import {
  getAircraftTccMonitoring,
  getAllAircraftTccMonitoring,
  createAircraftTccMonitoring,
  updateAircraftTccMonitoring,
  deleteAircraftTccMonitoring,
  reorderAircraftTccMonitoring,
} from "../api/tccMonitoringApi";
import {
  getAircraftDetails,
  type AircraftMaintenanceDetails,
} from "../api/aircraftApi";
import { Spinner } from "./ui/spinner";
import {
  formatDisplayDate,
  formatDisplayDateFromDate,
} from "../utility/utils";
import { DataTablePagination } from "./ui/DataTablePagination";
import Swal from "../utils/swalDefaults";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { usePreserveListView } from "../hooks/usePreserveListView";
import { useTableDisplayOrderReorder } from "../hooks/useTableDisplayOrderReorder";
import {
  ARRANGEMENT_DISABLED_TOOLTIP,
  isManualArrangementMode,
} from "../utils/displayOrderReorder";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import * as XLSX from "xlsx";

const TCC_EXPORT_HEADERS = [
  "CATEGORY",
  "PART NUMBER",
  "SERIAL NUMBER",
  "DESCRIPTION",
  "COMPONENT METHOD OF COMPLIANCE",
  "LAST DONE DATE",
  "LAST DONE TACH",
  "LAST DONE AFTT",
  "LAST DONE METHOD OF COMPLIANCE",
  "COMPONENT LIMIT YEARS",
  "COMPONENT LIMIT HOURS",
  "SEQUENCE NO.",
] as const;

export interface ComponentItem {
  id: number;
  remaining: string;
  date: string;
  when: string;
  aftt: string;
  partNo: string;
  serialNo: string;
  description: string;
  limitHours: string; // COMPONENT LIMIT: Hours
  limitYears: string; // COMPONENT LIMIT: Years
  methodOfCompliance: string;
  lastDoneDate: string;
  lastDoneYear: string; // LAST DONE TACH (aircraft TACH at maintenance)
  lastDoneAftt: string;
  lastDoneTach: string;
  lastDoneMethodOfCompliance?: string;
  nextDueDate: string;
  nextDueYear: string;
  nextDueAftt: string;
  reference: string;
  /** API category display value, e.g. Powerplant */
  category?: string;
  /** Linked ATL row id when known */
  atlId?: number;
  /** 1-based persistent row order */
  displayOrder?: number;
  /** From GET .../tcc-maintenance/paged — server-computed; overrides client formulas when set */
  remainingYears?: number | null;
  remainingDays?: number | null;
  remainingTach?: number | null;
  remainingAftt?: number | null;
}

/** Display aircraft detail field; empty → em dash. TSN fields use displayTSN (UNK). */
function fmtAircraftDetail(v: unknown): string {
  if (v == null) return "—";
  const s = String(v).trim();
  return s === "" ? "—" : s;
}

function fmtAircraftTsn(v: unknown): string {
  if (v == null || v === "") return "UNK";
  return String(v);
}

/** Parses numeric string to number; returns NaN if invalid */
function parseNum(s: string | undefined): number {
  if (s == null || String(s).trim() === "") return NaN;
  const n = parseFloat(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

/** Parses date string (DD-Mon-YY, YYYY-MM-DD, or ISO); returns null if invalid */
function parseDate(s: string | undefined): Date | null {
  if (s == null || String(s).trim() === "") return null;
  const str = String(s).trim();
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;
  const match = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (match) {
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const mon = months[match[2]] ?? NaN;
    if (Number.isFinite(mon)) {
      const year =
        match[3].length === 2
          ? 2000 + parseInt(match[3], 10)
          : parseInt(match[3], 10);
      const day = parseInt(match[1], 10);
      const d2 = new Date(year, mon, day);
      if (!Number.isNaN(d2.getTime())) return d2;
    }
  }
  return null;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return formatDisplayDateFromDate(d);
}

/** Days between two dates (truncated) */
function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export interface TCCComputedRow {
  /** REMAINING: (Next Due Date − Current Date) ÷ 365 */
  remainingYears: number | null;
  /** REMAINING: Next Due Date − Current Date (days) */
  remainingDays: number | null;
  /** REMAINING: Limit Hours − (Current TACH − Last Done TACH) */
  remainingTach: number | null;
  /** REMAINING: Limit Hours − (Current AFTT − Last Done AFTT) */
  remainingAftt: number | null;
  /** NEXT DONE: Last Done Date + Limit Years */
  nextDueDate: Date | null;
  /** NEXT DUE: Last Done TACH + Limit Hours */
  nextDueTach: number | null;
  /** NEXT DUE: Last Done AFTT + Limit Hours */
  nextDueAftt: number | null;
  /** Display strings for fallback when no computation */
  raw: ComponentItem;
  /** Limit years (for remaining %); from COMPONENT LIMIT Years */
  limitYears: number;
  /** Limit hours (for remaining %); from COMPONENT LIMIT Hours */
  limitHours: number;
}

/** Color for REMAINING group: Red <=0, Orange <=10, Yellow <=20, Green <=40 */
function getRemainingColorClass(remainingPct: number | null): string {
  if (
    remainingPct == null ||
    !Number.isFinite(remainingPct) ||
    remainingPct <= 0
  ) {
    return "bg-red-100 text-red-800"; // Due
  }
  if (remainingPct <= 10) return "bg-orange-100 text-orange-800"; // >0 to 10% remaining
  if (remainingPct <= 20) return "bg-yellow-100 text-yellow-800"; // >10% to 20% remaining
  if (remainingPct <= 40) return "bg-green-100 text-green-800"; // >20% to 40% remaining
  return "";
}

function computeTCCRow(
  item: ComponentItem,
  currentDate: Date,
  currentTach: number,
  currentAftt: number
): TCCComputedRow {
  const limitYears = parseNum(item.limitYears);
  const limitHours = parseNum(item.limitHours);
  const lastDoneDate = parseDate(item.lastDoneDate);
  const lastDoneTach = parseNum(item.lastDoneYear);
  const lastDoneAftt = parseNum(item.lastDoneAftt);

  const hasLimitHours = Number.isFinite(limitHours);
  const hasLastDoneTach = Number.isFinite(lastDoneTach);
  const hasLastDoneAftt = Number.isFinite(lastDoneAftt);

  const nextDueTach =
    hasLimitHours && hasLastDoneTach ? lastDoneTach + limitHours : null;
  const nextDueAftt =
    hasLimitHours && hasLastDoneAftt ? lastDoneAftt + limitHours : null;

  let nextDueDate: Date | null = null;
  if (lastDoneDate != null && Number.isFinite(limitYears)) {
    const d = new Date(lastDoneDate);
    // Add integer years first to handle leap years correctly
    const wholeYears = Math.floor(limitYears);
    const fractionalYear = limitYears - wholeYears;
    d.setFullYear(d.getFullYear() + wholeYears);
    // Add fractional part as days (approx 365.25 days/year)
    if (fractionalYear > 0) {
      d.setDate(d.getDate() + Math.ceil(fractionalYear * 365.25));
    }
    nextDueDate = d;
  }

  const remainingYears =
    nextDueDate != null ? daysBetween(currentDate, nextDueDate) / 365 : null;
  const remainingDays =
    nextDueDate != null ? daysBetween(currentDate, nextDueDate) : null;
  const remainingTach =
    hasLimitHours && hasLastDoneTach
      ? limitHours - (currentTach - lastDoneTach)
      : null;
  const remainingAftt =
    hasLimitHours && hasLastDoneAftt
      ? limitHours - (currentAftt - lastDoneAftt)
      : null;

  let outRemainingYears =
    remainingYears != null ? remainingYears : null;
  let outRemainingDays = remainingDays;
  let outRemainingTach = remainingTach;
  let outRemainingAftt = remainingAftt;
  let outNextDueDate = nextDueDate;
  let outNextDueTach = nextDueTach;
  let outNextDueAftt = nextDueAftt;

  if (item.remainingYears != null && Number.isFinite(item.remainingYears)) {
    outRemainingYears = item.remainingYears;
  }
  if (item.remainingDays != null && Number.isFinite(item.remainingDays)) {
    outRemainingDays = item.remainingDays;
  }
  if (item.remainingTach != null && Number.isFinite(item.remainingTach)) {
    outRemainingTach = item.remainingTach;
  }
  if (item.remainingAftt != null && Number.isFinite(item.remainingAftt)) {
    outRemainingAftt = item.remainingAftt;
  }

  const apiNextDueDate = parseDate(item.nextDueDate);
  if (apiNextDueDate != null) {
    outNextDueDate = apiNextDueDate;
  }
  const apiNextDueTach = parseNum(item.nextDueYear);
  if (Number.isFinite(apiNextDueTach)) {
    outNextDueTach = apiNextDueTach;
  }
  const apiNextDueAftt = parseNum(item.nextDueAftt);
  if (Number.isFinite(apiNextDueAftt)) {
    outNextDueAftt = apiNextDueAftt;
  }

  return {
    remainingYears: outRemainingYears,
    remainingDays: outRemainingDays,
    remainingTach: outRemainingTach,
    remainingAftt: outRemainingAftt,
    nextDueDate: outNextDueDate,
    nextDueTach: outNextDueTach,
    nextDueAftt: outNextDueAftt,
    raw: item,
    limitYears: Number.isFinite(limitYears) ? limitYears : 0,
    limitHours: Number.isFinite(limitHours) ? limitHours : 0,
  };
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return parseFloat(n.toFixed(2)).toString();
}

/** Display label for API category value (e.g. Powerplant, Inspection Servicing) */
function formatTccCategoryDisplay(cat: string | undefined): string {
  if (!cat?.trim()) return "—";
  const key = cat.trim().toLowerCase().replace(/\s+/g, " ");
  const map: Record<string, string> = {
    powerplant: "Powerplant",
    airframe: "Airframe",
    propeller: "Propeller",
    "inspection servicing": "Inspection Servicing",
    inspection_servicing: "Inspection Servicing",
  };
  return map[key] ?? cat.trim();
}

function tccItemToExportCells(item: ComponentItem): string[] {
  return [
    String(item.category ?? "").trim(),
    String(item.partNo ?? "").trim(),
    String(item.serialNo ?? "").trim(),
    String(item.description ?? "").trim(),
    String(item.methodOfCompliance ?? "").trim(),
    String(item.lastDoneDate ?? "").trim(),
    String(item.lastDoneTach ?? item.lastDoneYear ?? "").trim(),
    String(item.lastDoneAftt ?? "").trim(),
    String(item.lastDoneMethodOfCompliance ?? "").trim(),
    formatNum(parseNum(item.limitYears)),
    formatNum(parseNum(item.limitHours)),
    String(item.reference ?? "").trim(),
  ];
}

export interface TCCDetailContentProps {
  aircraftId: string;
  showAddButton?: boolean;
}

export type TCCDetailContentHandle = {
  /** Fetches paged TCC data with current search/category and downloads CSV or XLSX. */
  exportTcc: (format: "csv" | "xlsx") => Promise<void>;
};

/** TCC detail content (Aircraft info, POWERPLANT/AIRFRAME/PROPELLER tabs, component table). Use inside Maintenance TCC tab or in TCCDetail page. */
export const TCCDetailContent = forwardRef<
  TCCDetailContentHandle,
  TCCDetailContentProps
>(function TCCDetailContent(
  { aircraftId, showAddButton = true },
  ref
) {
  const navigate = useNavigate();
  const { canUpdate, canCreate, canDelete } = useUserPermissions();
  /* Filter state: default to empty (All) or specific category */
  const [activeTab, setActiveTab] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTCCEntry, setEditingTCCEntry] = useState<ComponentItem | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const aircraftIdNum = useMemo(
    () => parseInt(aircraftId || "0", 10),
    [aircraftId]
  );
  const [tccItems, setTccItems] = useState<ComponentItem[]>([]);
  const [tccLoading, setTccLoading] = useState(false);
  const [tccError, setTccError] = useState<string | null>(null);
  const [tccTotal, setTccTotal] = useState(0);
  const [tccPages, setTccPages] = useState(1);
  const [tccSaving, setTccSaving] = useState(false);
  const [searchDebounced, setSearchDebounced] = useState("");
  const [aircraftDetails, setAircraftDetails] =
    useState<AircraftMaintenanceDetails | null>(null);
  const [aircraftDetailsLoading, setAircraftDetailsLoading] = useState(false);

  const {
    listScrollRef,
    captureViewForRestore,
    beginPreserveViewSettle,
    getPendingPage,
  } = usePreserveListView({
    isEditOpen: Boolean(editingTCCEntry),
    loading: tccLoading,
    listDeps: [tccItems],
  });

  // Debounce search so we don't hit API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const arrangementMode = useMemo(
    () =>
      isManualArrangementMode({
        search: searchDebounced,
        categoryFilter: activeTab,
      }),
    [searchDebounced, activeTab]
  );

  const canUpdateMaintenance = canUpdate("maintenance");
  const canReorder =
    arrangementMode && canUpdateMaintenance && !tccLoading;

  const dragDisabledReason = !canUpdateMaintenance
    ? "You do not have permission to reorder rows."
    : ARRANGEMENT_DISABLED_TOOLTIP;

  const fetchTcc = useCallback(
    async (options?: { preserveView?: boolean }) => {
      if (!aircraftIdNum || aircraftIdNum <= 0) {
        setTccItems([]);
        setTccTotal(0);
        setTccPages(1);
        return;
      }
      const preserveView = Boolean(options?.preserveView);
      const pageToFetch = preserveView
        ? getPendingPage(currentPage)
        : currentPage;
      if (!preserveView) {
        setTccLoading(true);
      }
      setTccError(null);
      try {
        // Always use paged list for display (restores pre-DnD load path).
        // Full ordered collection is loaded only when a drag-reorder is persisted.
        const res = await getAircraftTccMonitoring(
          aircraftIdNum,
          pageToFetch,
          itemsPerPage,
          searchDebounced,
          activeTab
        );
        setTccItems((res.items as ComponentItem[]) ?? []);
        setTccTotal(res.total ?? 0);
        setTccPages(res.pages ?? 1);
        if (preserveView && pageToFetch !== currentPage) {
          setCurrentPage(pageToFetch);
        }
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          setTccItems([]);
          setTccTotal(0);
          setTccPages(1);
        } else {
          setTccError(
            formatApiErrorMessage(err, "Failed to load TCC data.")
          );
          setTccItems([]);
        }
      } finally {
        if (!preserveView) {
          setTccLoading(false);
        } else {
          beginPreserveViewSettle();
        }
      }
    },
    [
      aircraftIdNum,
      currentPage,
      itemsPerPage,
      searchDebounced,
      activeTab,
      getPendingPage,
      beginPreserveViewSettle,
    ]
  );

  useEffect(() => {
    fetchTcc();
  }, [fetchTcc]);

  const persistTccReorder = useCallback(
    async (payload: { items: { id: number; display_order: number }[] }) => {
      await reorderAircraftTccMonitoring(payload);
    },
    []
  );

  const loadFullTccOrdered = useCallback(async () => {
    const res = await getAllAircraftTccMonitoring(aircraftIdNum);
    return (res.items as ComponentItem[]) ?? [];
  }, [aircraftIdNum]);

  const {
    sensors: tccDndSensors,
    handleDragEnd: handleTccDragEnd,
    isReordering: tccReordering,
    dndDisabled: tccDndDisabled,
  } = useTableDisplayOrderReorder({
    items: tccItems,
    setItems: setTccItems,
    canReorder,
    pageOffset: (currentPage - 1) * itemsPerPage,
    loadFullOrdered: loadFullTccOrdered,
    persistReorder: persistTccReorder,
    tableName: "TCC",
    onSuccess: async () => {
      await fetchTcc();
      await Swal.fire({
        icon: "success",
        title: "Order saved",
        text: "TCC row arrangement has been updated.",
        timer: 1400,
        showConfirmButton: false,
      });
    },
    onError: async (message) => {
      await Swal.fire({
        icon: "error",
        title: "Reorder failed",
        text: message,
      });
    },
  });

  useEffect(() => {
    if (!aircraftIdNum || aircraftIdNum <= 0) {
      setAircraftDetails(null);
      return;
    }
    let cancelled = false;
    setAircraftDetailsLoading(true);
    getAircraftDetails(aircraftIdNum)
      .then((data) => {
        if (!cancelled) setAircraftDetails(data);
      })
      .catch(() => {
        if (!cancelled) setAircraftDetails(null);
      })
      .finally(() => {
        if (!cancelled) setAircraftDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aircraftIdNum]);

  const handleAddComponent = async (payload: any) => {
    if (!aircraftIdNum || aircraftIdNum <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid aircraft",
        text: "Aircraft ID is required.",
      });
      return;
    }
    const category = String(payload.category || activeTab || "").trim();
    if (!category) return;
    if (tccSaving) return;

    setTccSaving(true);
    try {
      await confirmSaveEntry(false, async () => {
        await createAircraftTccMonitoring(aircraftIdNum, {
          category,
          partNo: payload.partNo,
          serialNo: payload.serialNo,
          description: payload.description,
          limitHours: payload.limitHours ?? payload.hours,
          limitYears: payload.limitYears ?? payload.years,
          methodOfCompliance: payload.methodOfCompliance,
          reference: payload.reference,
          sequenceNumber: payload.reference,
          atlId: payload.atlId,
          lastDoneDate: payload.lastDoneDate,
          lastDoneYear: payload.lastDoneYear,
          lastDoneAftt: payload.lastDoneAftt,
          lastDoneMethodOfCompliance: payload.lastDoneMethodOfCompliance,
        });
        closeModal();
        fetchTcc();
      });
    } finally {
      setTccSaving(false);
    }
  };

  const handleUpdateTCC = async (id: number, payload: any) => {
    if (!aircraftIdNum || aircraftIdNum <= 0) return;
    const category = String(payload.category || "").trim();
    if (!category) return;
    if (tccSaving) return;

    setTccSaving(true);
    try {
      await confirmSaveEntry(true, async () => {
        await updateAircraftTccMonitoring(aircraftIdNum, id, {
          partNo: payload.partNo,
          serialNo: payload.serialNo,
          description: payload.description,
          limitHours: payload.limitHours ?? payload.hours,
          limitYears: payload.limitYears ?? payload.years,
          methodOfCompliance: payload.methodOfCompliance,
          category,
          reference: payload.reference,
          sequenceNumber: payload.reference,
          atlId: payload.atlId,
          lastDoneDate: payload.lastDoneDate,
          lastDoneYear: payload.lastDoneYear,
          lastDoneTach: payload.lastDoneTach ?? payload.lastDoneYear,
          lastDoneAftt: payload.lastDoneAftt,
          lastDoneMethodOfCompliance: payload.lastDoneMethodOfCompliance,
        });
        captureViewForRestore(id, currentPage);
        closeModal();
        fetchTcc({ preserveView: true });
      });
    } finally {
      setTccSaving(false);
    }
  };

  const handleDeleteTCC = async (item: ComponentItem) => {
    const result = await Swal.fire({
      title: "Delete TCC entry?",
      text: `"${
        item.description || item.partNo || item.id
      }" — This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    if (!aircraftIdNum || aircraftIdNum <= 0) return;
    try {
      await deleteAircraftTccMonitoring(aircraftIdNum, item.id);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "TCC entry deleted.",
      });
      setEditingTCCEntry(null);
      fetchTcc();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        "Failed to delete entry.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    }
  };

  const openAddModal = () => {
    setEditingTCCEntry(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ComponentItem) => {
    setEditingTCCEntry(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTCCEntry(null);
  };

  // API returns paged data for the current filters/page.
  const totalItems = tccTotal;
  const totalPages = Math.max(1, tccPages);
  const paginatedData = tccItems;

  const currentDate = useMemo(() => new Date(), []);
  const currentTach = useMemo(() => {
    const n = parseNum(
      aircraftDetails?.tachometerEnd != null
        ? String(aircraftDetails.tachometerEnd)
        : undefined
    );
    return Number.isFinite(n) ? n : 7561;
  }, [aircraftDetails?.tachometerEnd]);
  const currentAftt = useMemo(() => {
    const n = parseNum(
      aircraftDetails?.airframeAftt != null
        ? String(aircraftDetails.airframeAftt)
        : undefined
    );
    return Number.isFinite(n) ? n : 11656;
  }, [aircraftDetails?.airframeAftt]);

  const handleTccExport = useCallback(
    async (format: "csv" | "xlsx") => {
      if (!aircraftIdNum || aircraftIdNum <= 0) return;
      try {
        const exportLimit = Math.max(tccTotal, tccItems.length, 1);
        const res = await getAircraftTccMonitoring(
          aircraftIdNum,
          1,
          exportLimit,
          searchDebounced,
          activeTab
        );
        const items = (res.items as ComponentItem[]) ?? [];
        if (!items.length) {
          await Swal.fire({
            icon: "info",
            title: "No data to export",
            text: "There are no TCC records matching the current search or category.",
            confirmButtonColor: "#2563eb",
          });
          return;
        }
        const fileReg =
          aircraftDetails?.registration?.trim() || `aircraft_${aircraftIdNum}`;
        const rowStrings = items.map((item) => tccItemToExportCells(item));
        if (format === "csv") {
          const escapeCsvValue = (value: string) =>
            `"${String(value).replace(/"/g, '""')}"`;
          const headerLine = [...TCC_EXPORT_HEADERS]
            .map(escapeCsvValue)
            .join(",");
          const csvLines = [
            headerLine,
            ...rowStrings.map((cells) =>
              cells.map(escapeCsvValue).join(",")
            ),
          ];
          const csvBlob = new Blob(["\uFEFF" + csvLines.join("\n")], {
            type: "text/csv;charset=utf-8;",
          });
          const url = window.URL.createObjectURL(csvBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${fileReg}_tcc_export.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const aoa: string[][] = [
            [...TCC_EXPORT_HEADERS],
            ...rowStrings,
          ];
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "TCC");
          XLSX.writeFile(wb, `${fileReg}_tcc_export.xlsx`);
        }
      } catch (err: any) {
        await Swal.fire({
          icon: "error",
          title: "Export failed",
          text:
            err?.response?.data?.detail ??
            err?.message ??
            "Could not export TCC data.",
          confirmButtonColor: "#2563eb",
        });
      }
    },
    [
      aircraftIdNum,
      activeTab,
      aircraftDetails?.registration,
      searchDebounced,
      tccItems.length,
      tccTotal,
    ]
  );

  useImperativeHandle(
    ref,
    () => ({
      exportTcc: (format) => handleTccExport(format),
    }),
    [handleTccExport]
  );

  const computedRows = useMemo(
    () =>
      paginatedData.map((item) =>
        computeTCCRow(item, currentDate, currentTach, currentAftt)
      ),
    [paginatedData, currentDate, currentTach, currentAftt]
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // TCC pattern color: blue (same as CPCP Monitoring pattern)
  const tccHeaderColor = "bg-blue-600";

  const categoryOptions: {
    value: string;
    label: string;
  }[] = [
    { value: "", label: "All" },
    { value: "POWERPLANT", label: "Powerplant" },
    { value: "AIRFRAME", label: "Airframe" },
    { value: "INSPECTION_SERVICING", label: "Inspection Servicing" },
  ];

  const showCategoryColumn = activeTab === "";

  return (
    <>
      {/* Title + Aircraft - same pattern as CPCP Monitoring */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h1 className="text-base font-bold text-gray-900 tracking-tight">
            TCC Monitoring
          </h1>
          {aircraftDetailsLoading ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded border border-gray-300 bg-gray-50/50 py-10 text-sm text-gray-500">
              <Loader className="h-4 w-4 animate-spin shrink-0" />
              <span>Loading aircraft details…</span>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse border border-gray-300 text-sm">
                <tbody>
                  <tr>
                    <td className="w-[12%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      ATL Seq
                    </td>
                    <td className="w-[21%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.sequenceNo)}
                    </td>
                    <td className="w-[12%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Engine S/N:
                    </td>
                    <td className="w-[21%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.engineSerialNumber)}
                    </td>
                    <td className="w-[12%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Propeller S/N
                    </td>
                    <td className="w-[22%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.propellerSerialNumber)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      MSN
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.msn)}
                    </td>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Eng TSN:
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftTsn(aircraftDetails?.engineTsn)}
                    </td>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Prop TSN
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftTsn(aircraftDetails?.propellerTsn)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      AFTT
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.airframeAftt)}
                    </td>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Eng TSO:
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.engineTso)}
                    </td>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Prop TSO
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.propellerTso)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      TACH
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.tachometerEnd)}
                    </td>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Eng TBO:
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.engineTbo)}
                    </td>
                    <td className="border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                      Prop TBO
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                      {fmtAircraftDetail(aircraftDetails?.propellerTbo)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-gray-50/80 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            &gt; 20% to ≤ 40% remaining
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            &gt; 10% to ≤ 20% remaining
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 text-orange-800 border border-orange-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            &gt; 0% to ≤ 10% remaining
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-800 border border-red-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Due
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search Component
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ATL-No, part no, or serial no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="w-56">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Filter by Category
          </label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {showAddButton && canCreate("maintenance") && (
          <button
            type="button"
            onClick={openAddModal}
            disabled={tccSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {tccSaving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add TCC Entry
              </>
            )}
          </button>
        )}
      </div>
      {/* Tabs */}
      {/* <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("POWERPLANT")}
          className={`px-6 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "POWERPLANT"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          POWERPLANT
        </button>
        <button
          onClick={() => setActiveTab("AIRFRAME")}
          className={`px-6 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "AIRFRAME"
              ? "bg-orange-600 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          AIRFRAME
        </button>
        <button
          onClick={() => setActiveTab("PROPELLER")}
          className={`px-6 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "PROPELLER"
              ? "bg-teal-600 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          PROPELLER
        </button>
      </div> */}

      {/* Table card - TCC pattern, blue */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div
          className={`${tccHeaderColor} text-white px-5 py-3.5 text-sm font-medium flex items-center gap-3`}
        >
          <span>
            {categoryOptions.find((o) => o.value === activeTab)?.label ??
              activeTab}
          </span>
        </div>

        {tccLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner />
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        ) : tccError ? (
          <div className="px-5 py-8 text-center">
            <p className="text-red-600 text-sm mb-3">{tccError}</p>
            <button
              type="button"
              onClick={() => fetchTcc()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <div
            ref={listScrollRef}
            data-atl-list-scroll
            className="overflow-x-auto"
          >
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    rowSpan={2}
                    className="px-2 py-2 text-xs font-bold text-gray-700 border-r border-gray-200 align-middle w-10"
                  >
                    {/* drag */}
                  </th>
                  <th
                    rowSpan={2}
                    className="px-2 py-2 text-xs font-bold text-gray-700 border-r border-gray-200 align-middle whitespace-nowrap"
                    title="Display order"
                  >
                    #
                  </th>
                  {showCategoryColumn && (
                    <th
                      rowSpan={2}
                      className="px-3 py-2 text-xs font-bold text-gray-700 border-r border-gray-200 align-middle whitespace-nowrap"
                    >
                      CATEGORY
                    </th>
                  )}
                  <th colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-700">
                    REMAINING
                  </th>
                  <th
                    colSpan={3}
                    className="px-3 py-2 text-xs font-bold text-gray-700 border-l border-gray-200"
                  >
                    COMPONENT INFO
                  </th>
                  <th
                    colSpan={2}
                    className="px-3 py-2 text-xs font-bold text-gray-700 border-l border-gray-200"
                  >
                    COMPONENT LIMIT
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-700 border-l border-gray-200">
                    METHOD OF COMPLIANCE
                  </th>
                  <th
                    colSpan={3}
                    className="px-3 py-2 text-xs font-bold text-gray-700 border-l border-gray-200"
                  >
                    LAST DONE
                  </th>
                  <th
                    colSpan={3}
                    className="px-3 py-2 text-xs font-bold text-gray-700 border-l border-gray-200"
                  >
                    NEXT DUE
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-700 border-l border-gray-200">
                    ATL REFERENCE
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-700 border-l border-gray-200 w-24">
                    Actions
                  </th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    YEARS
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    DAYS
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    TACH
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    AFTT
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    PART NO.
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    SERIAL NO.
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    DESCRIPTION
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    YEARS
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    HOURS
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    METHOD OF COMPLIANCE
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    DATE
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    TACH
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    AFTT
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    DATE
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    TACH
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap">
                    AFTT
                  </th>
                  <th
                    className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200"
                    title="sequence_number"
                  >
                    Sequence No
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200 w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <DndContext
                sensors={tccDndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTccDragEnd}
              >
                <SortableContext
                  items={paginatedData.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-gray-200">
                    {computedRows.map((row) => {
                      const item = row.raw;
                      return (
                        <SortableTableRow
                          key={item.id}
                          id={item.id}
                          disabled={tccDndDisabled}
                          dragLabel="Move Maintenance TCC row"
                          disabledReason={dragDisabledReason}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {({ dragHandle }) => (
                            <>
                              <td className="px-2 py-3 border-r border-gray-200 align-middle">
                                {dragHandle}
                              </td>
                              <td className="px-2 py-3 text-gray-700 text-xs border-r border-gray-200 tabular-nums text-center">
                                {item.displayOrder ?? "—"}
                              </td>
                              {showCategoryColumn && (
                                <td className="px-3 py-3 text-gray-900 text-xs border-r border-gray-200 whitespace-nowrap">
                                  {formatTccCategoryDisplay(item.category)}
                                </td>
                              )}
                              {/* REMAINING: Years — color by % remaining: Red<=0, Orange<=10, Yellow<=20, Green<=40 */}
                              {(() => {
                                const pctYears =
                                  row.limitYears > 0 && row.remainingYears != null
                                    ? (row.remainingYears / row.limitYears) * 100
                                    : null;
                                const colorYears = getRemainingColorClass(pctYears);
                                return (
                                  <td
                                    className={`px-3 py-3 text-xs ${
                                      colorYears || "text-gray-900"
                                    }`}
                                  >
                                    {row.remainingYears != null
                                      ? row.remainingYears.toFixed(2)
                                      : item.remaining}
                                  </td>
                                );
                              })()}
                              {/* REMAINING: Days */}
                              {(() => {
                                const pctDays =
                                  row.limitYears > 0 && row.remainingDays != null
                                    ? (row.remainingDays / (row.limitYears * 365)) * 100
                                    : null;
                                const colorDays = getRemainingColorClass(pctDays);
                                return (
                                  <td
                                    className={`px-3 py-3 text-xs ${
                                      colorDays || "text-gray-900"
                                    }`}
                                  >
                                    {row.remainingDays != null
                                      ? String(row.remainingDays)
                                      : item.date}
                                  </td>
                                );
                              })()}
                              {/* REMAINING: TACH */}
                              {(() => {
                                const pctTach =
                                  row.limitHours > 0 && row.remainingTach != null
                                    ? (row.remainingTach / row.limitHours) * 100
                                    : null;
                                const colorTach = getRemainingColorClass(pctTach);
                                return (
                                  <td
                                    className={`px-3 py-3 text-xs ${
                                      colorTach || "text-gray-900"
                                    }`}
                                  >
                                    {formatNum(row.remainingTach) || item.when}
                                  </td>
                                );
                              })()}
                              {/* REMAINING: AFTT */}
                              {(() => {
                                const pctAftt =
                                  row.limitHours > 0 && row.remainingAftt != null
                                    ? (row.remainingAftt / row.limitHours) * 100
                                    : null;
                                const colorAftt = getRemainingColorClass(pctAftt);
                                return (
                                  <td
                                    className={`px-3 py-3 text-xs ${
                                      colorAftt || "text-gray-900"
                                    }`}
                                  >
                                    {formatNum(row.remainingAftt) || item.aftt}
                                  </td>
                                );
                              })()}
                              {/* COMPONENT INFO: Part No., Serial No., Description (reference) */}
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                                {item.partNo}
                              </td>
                              <td className="px-3 py-3 text-gray-900 text-xs">
                                {item.serialNo}
                              </td>
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                                {item.description}
                              </td>
                              {/* COMPONENT LIMIT: Years, Hours (fixed from AMM/CMM/AD/SB) */}
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                                {formatNum(parseNum(item.limitYears))}
                              </td>
                              <td className="px-3 py-3 text-gray-900 text-xs">
                                {formatNum(parseNum(item.limitHours))}
                              </td>
                              {/* METHOD OF COMPLIANCE (Overhaul, Replacement, etc.) */}
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                                {item.methodOfCompliance}
                              </td>
                              {/* LAST DONE: Date, TACH, AFTT (reference) */}
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200 bg-green-50">
                                {formatDisplayDate(item.lastDoneDate, {
                                  fallback: item.lastDoneDate ?? "",
                                })}
                              </td>
                              <td className="px-3 py-3 text-gray-900 text-xs bg-green-50">
                                {item.lastDoneTach ?? item.lastDoneYear}
                              </td>
                              <td className="px-3 py-3 text-gray-900 text-xs bg-green-50">
                                {item.lastDoneAftt}
                              </td>
                              {/* NEXT DUE: Date = Last Done + Limit Years; TACH/AFTT = Last Done + Limit Hours */}
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                                {row.nextDueDate
                                  ? formatDate(row.nextDueDate)
                                  : formatDisplayDate(item.nextDueDate, {
                                      fallback: item.nextDueDate ?? "",
                                    })}
                              </td>
                              <td className="px-3 py-3 text-gray-900 text-xs">
                                {formatNum(row.nextDueTach) || item.nextDueYear}
                              </td>
                              <td className="px-3 py-3 text-gray-900 text-xs">
                                {formatNum(row.nextDueAftt) || item.nextDueAftt}
                              </td>
                              {/* ATL Reference: sequence_number */}
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                                {String(item.reference ?? "").trim() ? (
                                  String(aircraftId ?? "").trim() ? (
                                    <a
                                      href={`/profile/${String(aircraftId).trim()}/operation?${new URLSearchParams(
                                        { sequence_no: String(item.reference).trim() }
                                      ).toString()}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      {item.reference}
                                    </a>
                                  ) : (
                                    <span className="text-gray-900">{item.reference}</span>
                                  )
                                ) : (
                                  "-"
                                )}
                              </td>
                              {/* Actions: Edit, Delete */}
                              <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {canUpdate("maintenance") && (
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(item)}
                                      className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canDelete("maintenance") && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTCC(item)}
                                      className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </SortableTableRow>
                      );
                    })}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        )}

        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          totalLabel="components"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          pageSizeOptions={[10, 25, 50]}
          disabled={tccLoading || tccReordering}
          className="px-6"
        />
      </div>

      {/* Add / Edit TCC Entry Modal */}
      <AddTCCModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onAdd={handleAddComponent}
        editingItem={editingTCCEntry}
        onUpdate={handleUpdateTCC}
        activeCategory={activeTab}
        aircraftId={aircraftId}
      />
    </>
  );
});

export function TCCDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = id ?? "";

  const handleBack = () => {
    navigate(`/profile/${id}/maintenance-ldnd`);
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                TCC Monitoring
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Time Controlled Components – life limit and replacement
                schedules
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <TCCDetailContent aircraftId={aircraftId} showAddButton={true} />
      </div>
    </div>
  );
}
