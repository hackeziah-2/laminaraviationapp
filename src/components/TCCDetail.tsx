import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Loader,
} from "lucide-react";
import { AddTCCModal } from "./AddTCCModal";
import {
  getAircraftTccMonitoring,
  createAircraftTccMonitoring,
  updateAircraftTccMonitoring,
  deleteAircraftTccMonitoring,
  type TCCMonitoring,
} from "../api/tccMonitoringApi";
import { Spinner } from "./ui/spinner";
import Swal from "sweetalert2";

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

/** Format date for display (DD-Mon-YY) */
function formatDate(d: Date | null): string {
  if (!d) return "";
  const day = d.getDate();
  const mon = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getMonth()];
  const y = d.getFullYear();
  const yy = y >= 2000 ? String(y).slice(-2) : String(y).slice(-2);
  return `${day}-${mon}-${yy}`;
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

/** Color for REMAINING group: Red = Due, Orange = <10%, Yellow = <20%, Green = <40% */
function getRemainingColorClass(remainingPct: number | null): string {
  if (
    remainingPct == null ||
    !Number.isFinite(remainingPct) ||
    remainingPct <= 0
  ) {
    return "bg-red-100 text-red-800"; // Due
  }
  if (remainingPct < 10) return "bg-orange-100 text-orange-800"; // Less than 10% Remaining
  if (remainingPct < 20) return "bg-yellow-100 text-yellow-800"; // Less than 20% Remaining
  if (remainingPct < 40) return "bg-green-100 text-green-800"; // Less than 40% Remaining
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

  return {
    remainingYears: remainingYears != null ? remainingYears : null,
    remainingDays,
    remainingTach,
    remainingAftt,
    nextDueDate,
    nextDueTach,
    nextDueAftt,
    raw: item,
    limitYears: Number.isFinite(limitYears) ? limitYears : 0,
    limitHours: Number.isFinite(limitHours) ? limitHours : 0,
  };
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return parseFloat(n.toFixed(2)).toString();
}

export interface TCCDetailContentProps {
  aircraftId: string;
  showAddButton?: boolean;
}

/** TCC detail content (Aircraft info, POWERPLANT/AIRFRAME/PROPELLER tabs, component table). Use inside Maintenance TCC tab or in TCCDetail page. */
export function TCCDetailContent({
  aircraftId,
  showAddButton = true,
}: TCCDetailContentProps) {
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

  // Debounce search so we don't hit API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchTcc = useCallback(async () => {
    if (!aircraftIdNum || aircraftIdNum <= 0) {
      setTccItems([]);
      setTccTotal(0);
      setTccPages(1);
      return;
    }
    setTccLoading(true);
    setTccError(null);
    try {
      const res = await getAircraftTccMonitoring(
        aircraftIdNum,
        currentPage,
        itemsPerPage,
        searchDebounced,
        activeTab
      );
      setTccItems((res.items as ComponentItem[]) ?? []);
      setTccTotal(res.total ?? 0);
      setTccPages(res.pages ?? 1);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        setTccItems([]);
        setTccTotal(0);
        setTccPages(1);
      } else {
        setTccError(
          err?.response?.data?.detail ??
            err?.message ??
            "Failed to load TCC data."
        );
        setTccItems([]);
      }
    } finally {
      setTccLoading(false);
    }
  }, [aircraftIdNum, activeTab, currentPage, itemsPerPage, searchDebounced]);

  useEffect(() => {
    fetchTcc();
  }, [fetchTcc]);

  const handleAddComponent = async (payload: any) => {
    if (!aircraftIdNum || aircraftIdNum <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid aircraft",
        text: "Aircraft ID is required.",
      });
      return;
    }
    setTccSaving(true);
    try {
      await createAircraftTccMonitoring(aircraftIdNum, {
        category: payload.category || activeTab,
        partNo: payload.partNo,
        serialNo: payload.serialNo,
        description: payload.description,
        limitHours: payload.hours,
        limitYears: payload.years,
        methodOfCompliance: payload.methodOfCompliance,
        reference: payload.reference,
        sequenceNumber: payload.reference,
        atlId: payload.atlId,
        lastDoneDate: payload.lastDoneDate,
        lastDoneYear: payload.lastDoneYear,
        lastDoneAftt: payload.lastDoneAftt,
        lastDoneMethodOfCompliance: payload.lastDoneMethodOfCompliance,
      });
      await Swal.fire({
        icon: "success",
        title: "Saved!",
        text: "TCC entry added successfully.",
      });
      closeModal();
      fetchTcc();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ?? err?.message ?? "Failed to add entry.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setTccSaving(false);
    }
  };

  const handleUpdateTCC = async (id: number, payload: any) => {
    if (!aircraftIdNum || aircraftIdNum <= 0) return;
    setTccSaving(true);
    try {
      await updateAircraftTccMonitoring(aircraftIdNum, id, {
        partNo: payload.partNo,
        serialNo: payload.serialNo,
        description: payload.description,
        limitHours: payload.hours,
        limitYears: payload.years,
        methodOfCompliance: payload.methodOfCompliance,
        category: payload.category, // Added category
        reference: payload.reference,
        sequenceNumber: payload.reference,
        atlId: payload.atlId,
        lastDoneDate: payload.lastDoneDate,
        lastDoneYear: payload.lastDoneYear,
        lastDoneAftt: payload.lastDoneAftt,
        lastDoneMethodOfCompliance: payload.lastDoneMethodOfCompliance,
      });
      await Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "TCC entry updated successfully.",
      });
      closeModal();
      fetchTcc();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        "Failed to update entry.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
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

  // API returns paged data for current category
  const totalItems = tccTotal;
  const totalPages = Math.max(1, tccPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedData = tccItems;

  const currentDate = useMemo(() => new Date(), []);
  const currentTach = 7561;
  const currentAftt = 11656;

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

  return (
    <>
      {/* Title + Aircraft - same pattern as CPCP Monitoring */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-900 tracking-tight">
            TCC Monitoring
          </h1>
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
        {showAddButton && (
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th colSpan={4} className="px-3 py-2 text-xs text-gray-600">
                    REMAINING
                  </th>
                  <th
                    colSpan={3}
                    className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                  >
                    COMPONENT INFO
                  </th>
                  <th
                    colSpan={2}
                    className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                  >
                    COMPONENT LIMIT
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200">
                    METHOD OF COMPLIANCE
                  </th>
                  <th
                    colSpan={3}
                    className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                  >
                    LAST DONE
                  </th>
                  <th
                    colSpan={3}
                    className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                  >
                    NEXT DUE
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200">
                    ATL REFERENCE
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200 w-24">
                    Actions
                  </th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    YEARS
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    DAYS
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    TACH
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    AFTT
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    PART NO.
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    SERIAL NO.
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    DESCRIPTION
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    YEARS
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    HOURS
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    METHOD OF COMPLIANCE
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    DATE
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    TACH
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    AFTT
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                    DATE
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    TACH
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                    AFTT
                  </th>
                  <th
                    className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200"
                    title="sequence_number"
                  >
                    Sequence No
                  </th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200 w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {computedRows.map((row) => {
                  const item = row.raw;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* REMAINING: Years — color by % remaining: Red=Due, Orange=<10%, Yellow=<20%, Green=<40% */}
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
                        {item.lastDoneDate}
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
                          : item.nextDueDate}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-xs">
                        {formatNum(row.nextDueTach) || item.nextDueYear}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-xs">
                        {formatNum(row.nextDueAftt) || item.nextDueAftt}
                      </td>
                      {/* ATL Reference: sequence_number */}
                      <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                        {item.reference}
                      </td>
                      {/* Actions: Edit, Delete */}
                      <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTCC(item)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination - CPCP Monitoring pattern */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm appearance-none bg-no-repeat bg-[length:12px] bg-[right_0.25rem_center] pr-6"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2 text-gray-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="min-w-[2rem] px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600 px-6 py-2">
          Showing {totalItems === 0 ? 0 : startIndex + 1} to{" "}
          {Math.min(endIndex, totalItems)} of {totalItems} components
        </div>
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
}

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
              <h1 className="text-gray-900">TCC Monitoring</h1>
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
