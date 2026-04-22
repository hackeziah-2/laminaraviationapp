import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader,
} from "lucide-react";
import { CPCPEntryModal } from "./CPCPEntryModal";
import {
  getCpcpMonitoringPaged,
  getCpcpMonitoringById,
  createCpcpMonitoring,
  updateCpcpMonitoring,
  deleteCpcpMonitoring,
  type CPCPEntry,
} from "../api/cpcpMonitoringApi";
import { computeCpcpRow } from "../utils/cpcpFormulas";
import Swal from "sweetalert2";
import { Spinner } from "./ui/spinner";
import { DataTablePagination } from "./ui/DataTablePagination";
import { useUserPermissions } from "../hooks/useUserPermissions";
import {
  getAircraftDetails,
  type AircraftMaintenanceDetails,
} from "../api/aircraftApi";
import * as XLSX from "xlsx";

const CPCP_EXPORT_HEADERS = [
  "SEQUENCE NO",
  "REMAINING YEARS",
  "REMAINING DAYS",
  "REMAINING TACH",
  "REMAINING",
  "INSPECTION OPERATION",
  "DESCRIPTION",
  "INTERNAL HOURS",
  "INTERNAL MONTHS",
  "LAST DONE DATE",
  "LAST DONE TACH",
  "LAST DONE AFTT",
  "NEXT DUE DATE",
  "NEXT DUE TACH",
  "NEXT DUE AFTT",
] as const;

/** Remaining "months" from list/API → years (same basis as the MONTHS column ÷ 12) */
function formatCpcpRemainingYearsFromMonths(monthsDisplay: string): string {
  const s = String(monthsDisplay ?? "").trim();
  if (s === "" || s === "-" || s === "—") return "";
  const n = parseFloat(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return "";
  return (n / 12).toFixed(2);
}

function cpcpToExportRow(
  item: CPCPEntry,
  computed: ReturnType<typeof computeCpcpRow>
): string[] {
  return [
    String(item.reference ?? "").trim(),
    formatCpcpRemainingYearsFromMonths(computed.remaining.months),
    String(computed.remaining.days ?? "").trim(),
    String(computed.remaining.tach ?? "").trim(),
    String(computed.remaining.aftf ?? "").trim(),
    String(item.inspectionCode ?? "").trim(),
    String(item.description ?? "").replace(/\r\n/g, "\n").trim(),
    String(item.interval?.hours ?? ""),
    String(item.interval?.months ?? ""),
    String(item.lastDone?.date ?? "").trim(),
    String(item.lastDone?.tach ?? "").trim(),
    String(item.lastDone?.aftf ?? "").trim(),
    String(computed.nextDue.date ?? "").trim(),
    String(computed.nextDue.tach ?? "").trim(),
    String(computed.nextDue.aftf ?? "").trim(),
  ];
}

function fmtCpcpHeaderField(v: unknown): string {
  if (v == null) return "—";
  const s = String(v).trim();
  return s === "" ? "—" : s;
}

interface CPCPMonitoringProps {
  onBack?: () => void;
  msn: string;
  registration?: string;
  aftf?: string;
  tach?: string;
  date?: string;
  /** When true, hide the top header (back, print, export, add) for use inside Maintenance CPCP tab */
  embedded?: boolean;
  /** Optional aircraft ID for API scope */
  aircraftId?: string | number;
}

export type CPCPMonitoringHandle = {
  /** GET cpcp-monitoring/paged with current search + aircraft_id, then download CSV or XLSX. */
  exportCpcp: (format: "csv" | "xlsx") => Promise<void>;
};

/** Table row shape (compatible with CPCPEntry from API) */
interface InspectionItem {
  id: number;
  remaining: {
    months: number | string;
    days: number | string;
    tach: number | string;
    aftf: number | string;
  };
  inspectionCode: string;
  description: string;
  interval: {
    hours: number | string;
    months: number | string;
  };
  lastDone: {
    date: string;
    tach: number | string;
    aftf: number | string;
  };
  nextDue: {
    date: string;
    tach: number | string;
    aftf: number | string;
  };
  reference: string;
  status: "green" | "yellow" | "red" | "white";
}

export const CPCPMonitoring = forwardRef<
  CPCPMonitoringHandle,
  CPCPMonitoringProps
>(function CPCPMonitoring(
  {
    onBack,
    msn,
    registration = "RP-C14",
    aftf = "7895.4",
    tach = "7894.8",
    date = "20-Sep-25",
    embedded = false,
    aircraftId,
  },
  ref
) {
  const navigate = useNavigate();
  const { canUpdate, canCreate, canDelete } = useUserPermissions();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [items, setItems] = useState<CPCPEntry[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewEntry, setViewEntry] = useState<CPCPEntry | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CPCPEntry | null>(null);
  const [linkedAircraftId, setLinkedAircraftId] = useState<string>("");
  const [linkedSequenceNo, setLinkedSequenceNo] = useState<string>("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aircraftDetails, setAircraftDetails] =
    useState<AircraftMaintenanceDetails | null>(null);
  const [aircraftDetailsLoading, setAircraftDetailsLoading] = useState(false);

  const aircraftIdNum = useMemo(() => {
    if (aircraftId == null || String(aircraftId).trim() === "") return NaN;
    const n =
      typeof aircraftId === "number"
        ? aircraftId
        : parseInt(String(aircraftId), 10);
    return Number.isFinite(n) ? n : NaN;
  }, [aircraftId]);

  useEffect(() => {
    if (!Number.isFinite(aircraftIdNum) || aircraftIdNum <= 0) {
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

  const headerRegistration = fmtCpcpHeaderField(
    aircraftDetails?.registration ?? registration
  );
  const headerMsn = fmtCpcpHeaderField(aircraftDetails?.msn ?? msn);
  const headerAftt = fmtCpcpHeaderField(aircraftDetails?.airframeAftt ?? aftf);
  const headerTach = fmtCpcpHeaderField(aircraftDetails?.tachometerEnd ?? tach);
  const headerDate = fmtCpcpHeaderField(date);

  const handleCpcpExport = useCallback(
    async (format: "csv" | "xlsx") => {
      try {
        const exportLimit = Math.max(totalItems, items.length, 1);
        const res = await getCpcpMonitoringPaged(
          1,
          exportLimit,
          searchDebounced,
          aircraftId
        );
        const list = res.items;
        if (!list.length) {
          await Swal.fire({
            icon: "info",
            title: "No data to export",
            text: "There are no CPCP records matching the current search.",
            confirmButtonColor: "#2563eb",
          });
          return;
        }
        const reg = headerRegistration.trim();
        const fileReg =
          reg && reg !== "—"
            ? reg
            : Number.isFinite(aircraftIdNum) && aircraftIdNum > 0
              ? `aircraft_${aircraftIdNum}`
              : "cpcp_export";
        const rowStrings = list.map((item) => {
          const computed = computeCpcpRow(item, headerTach, headerAftt);
          return cpcpToExportRow(item, computed);
        });
        if (format === "csv") {
          const escapeCsvValue = (value: string) =>
            `"${String(value).replace(/"/g, '""')}"`;
          const headerLine = [...CPCP_EXPORT_HEADERS]
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
          link.download = `${fileReg}_cpcp_export.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const aoa: string[][] = [
            [...CPCP_EXPORT_HEADERS],
            ...rowStrings,
          ];
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "CPCP");
          XLSX.writeFile(wb, `${fileReg}_cpcp_export.xlsx`);
        }
      } catch (err: any) {
        await Swal.fire({
          icon: "error",
          title: "Export failed",
          text:
            err?.response?.data?.detail ??
            err?.message ??
            "Could not export CPCP data.",
          confirmButtonColor: "#2563eb",
        });
      }
    },
    [
      totalItems,
      items.length,
      searchDebounced,
      aircraftId,
      headerTach,
      headerAftt,
      headerRegistration,
      aircraftIdNum,
    ]
  );

  useImperativeHandle(
    ref,
    () => ({
      exportCpcp: (f) => handleCpcpExport(f),
    }),
    [handleCpcpExport]
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCpcpMonitoringPaged(
        currentPage,
        itemsPerPage,
        searchDebounced,
        aircraftId
      );
      setItems(res.items);
      setTotalItems(res.total);
      setTotalPages(Math.max(1, res.pages));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        "Failed to load CPCP list.";
      Swal.fire({ icon: "error", title: "Error!", text: msg });
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [currentPage, itemsPerPage, searchDebounced, aircraftId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1);
      searchDebounceRef.current = null;
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!linkedAircraftId || !linkedSequenceNo) return;
    navigate(`/profile/${linkedAircraftId}/operation`, {
      state: {
        aircraft_id: linkedAircraftId,
        sequence_no: linkedSequenceNo,
      },
    });
  }, [linkedAircraftId, linkedSequenceNo, navigate]);

  const handleSequenceNavigation = useCallback(
    (sequenceNo: string) => {
      const nextSequenceNo = String(sequenceNo ?? "").trim();
      const nextAircraftId = String(aircraftId ?? "").trim();
      if (!nextSequenceNo || !nextAircraftId) return;
      setLinkedAircraftId(nextAircraftId);
      setLinkedSequenceNo(nextSequenceNo);
    },
    [aircraftId]
  );

  const handleView = useCallback(async (entry: CPCPEntry) => {
    setViewEntry(null);
    setViewLoading(true);
    try {
      const one = await getCpcpMonitoringById(entry.id);
      setViewEntry(one);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ?? err?.message ?? "Failed to load entry.";
      Swal.fire({ icon: "error", title: "Error!", text: msg });
    } finally {
      setTimeout(() => setViewLoading(false), 360);
    }
  }, []);

  const handleDelete = useCallback(
    async (entry: CPCPEntry) => {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });
      if (!result.isConfirmed) return;
      try {
        await deleteCpcpMonitoring(entry.id);
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "The CPCP entry has been deleted.",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchList();
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ?? err?.message ?? "Failed to delete.";
        Swal.fire({ icon: "error", title: "Error!", text: msg });
      }
    },
    [fetchList]
  );

  const handleAddSubmit = useCallback(
    async (data: any) => {
      setSaving(true);
      try {
        const payload = { ...data };
        if (aircraftId != null && String(aircraftId).trim() !== "") {
          const aid =
            typeof aircraftId === "number"
              ? aircraftId
              : parseInt(String(aircraftId), 10);
          if (!isNaN(aid)) payload.aircraft_id = aid;
        }
        await createCpcpMonitoring(payload);
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "The CPCP entry has been added.",
          timer: 1500,
          showConfirmButton: false,
        });
        setShowAddModal(false);
        fetchList();
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ?? err?.message ?? "Failed to create.";
        Swal.fire({ icon: "error", title: "Error!", text: msg });
      } finally {
        setTimeout(() => setSaving(false), 360);
      }
    },
    [fetchList, aircraftId]
  );

  const handleEditSubmit = useCallback(
    async (id: number, data: any) => {
      setSaving(true);
      try {
        await updateCpcpMonitoring(id, data);
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "The CPCP entry has been updated.",
          timer: 1500,
          showConfirmButton: false,
        });
        setShowAddModal(false);
        setEditingEntry(null);
        fetchList();
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ?? err?.message ?? "Failed to update.";
        Swal.fire({ icon: "error", title: "Error!", text: msg });
      } finally {
        setTimeout(() => setSaving(false), 360);
      }
    },
    [fetchList]
  );

  const openEdit = useCallback((entry: CPCPEntry) => {
    setEditingEntry(entry);
    setShowAddModal(true);
  }, []);

  const getRowBackgroundColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-emerald-50/70";
      case "yellow":
        return "bg-amber-50/70";
      case "orange":
        return "bg-orange-50/70";
      case "red":
        return "bg-red-50/70";
      default:
        return "bg-white";
    }
  };

  const startIndex =
    totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);
  const currentItems = items;

  const contentPadding = embedded ? "p-0" : "p-6";

  return (
    <div className="h-full overflow-auto bg-gray-50/50">
      {/* Header - only when not embedded */}
      {!embedded && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              {canCreate("maintenance") && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Inspection
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={contentPadding}>
        <div className="space-y-6">
          {/* Title + Aircraft + Legend */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                CPCP Monitoring
              </h1>
              {Number.isFinite(aircraftIdNum) &&
              aircraftIdNum > 0 &&
              aircraftDetailsLoading ? (
                <div className="mt-4 flex items-center justify-center gap-2 rounded border border-gray-300 bg-gray-50/50 py-8 text-sm text-gray-500">
                  <Loader className="h-4 w-4 animate-spin shrink-0" />
                  <span>Loading aircraft details…</span>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse border border-gray-300 text-sm">
                    <tbody>
                      <tr>
                        <td className="w-[11%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                          Registration
                        </td>
                        <td className="w-[14%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                          {headerRegistration}
                        </td>
                        <td className="w-[9%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                          MSN
                        </td>
                        <td className="w-[11%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                          {headerMsn}
                        </td>
                        <td className="w-[10%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                          AFTT
                        </td>
                        <td className="w-[11%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                          {headerAftt}
                        </td>
                        <td className="w-[9%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                          TACH
                        </td>
                        <td className="w-[11%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                          {headerTach}
                        </td>
                        <td className="w-[9%] border border-gray-300 bg-gray-50/80 px-3 py-2 font-bold text-gray-900">
                          DATE
                        </td>
                        <td className="w-[14%] border border-gray-300 px-3 py-2 font-normal text-gray-900 tabular-nums">
                          {headerDate}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-emerald-100 border border-emerald-200/80" />
                <span>&lt; 40% remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-amber-100 border border-amber-200/80" />
                <span>&lt; 20% remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-orange-100 border border-orange-200/80" />
                <span>&lt; 10% remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-red-100 border border-red-200/80" />
                <span>Due</span>
              </div>
            </div>
          </div>

          {/* Search + Add Entry - same row as TCC */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Search Inspection
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by inspection code, description, or ATL-SEC.NO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {canCreate("maintenance") && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap mt-6"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            )}
          </div>

          {/* CPCP table: REMAINING | INSPECTION OPERATION | DESCRIPTION | INTERVAL | LAST DONE | NEXT DUE | REFERENCE | ACTIONS */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-700/30 bg-blue-600 text-white">
                        <th
                          colSpan={4}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-white/20"
                        >
                          REMAINING
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-white/20"
                        >
                          INSPECTION OPERATION
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-white/20"
                        >
                          DESCRIPTION
                        </th>
                        <th
                          colSpan={2}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-white/20"
                        >
                          INTERVAL
                        </th>
                        <th
                          colSpan={3}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-white/20"
                        >
                          LAST DONE
                        </th>
                        <th
                          colSpan={3}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-white/20"
                        >
                          NEXT DUE
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-white/20"
                        >
                          REFERENCE
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white"
                        >
                          ACTIONS
                        </th>
                      </tr>
                      <tr className="border-b border-blue-700/30 bg-blue-600 text-white">
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          MONTHS
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          DAYS
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          TACH
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white border-r border-white/20">
                          AFTT
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          HOURS
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white border-r border-white/20">
                          MONTHS
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          DATE
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          TACH
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white border-r border-white/20">
                          AFTT
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          DATE
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white">
                          TACH
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-white border-r border-white/20">
                          AFTT
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={16}
                            className="px-6 py-12 text-center text-gray-500 text-sm"
                          >
                            No CPCP entries found.
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((item) => {
                          const computed = computeCpcpRow(
                            item,
                            headerTach,
                            headerAftt
                          );
                          return (
                            <tr key={item.id} className="transition-colors">
                              <td
                                className={`px-3 py-2.5 text-gray-700 whitespace-nowrap ${getRowBackgroundColor(
                                  computed.status
                                )}`}
                              >
                                {computed.remaining.months}
                              </td>
                              <td
                                className={`px-3 py-2.5 text-gray-700 whitespace-nowrap ${getRowBackgroundColor(
                                  computed.status
                                )}`}
                              >
                                {computed.remaining.days}
                              </td>
                              <td
                                className={`px-3 py-2.5 text-gray-700 whitespace-nowrap ${getRowBackgroundColor(
                                  computed.status
                                )}`}
                              >
                                {computed.remaining.tach}
                              </td>
                              <td
                                className={`px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100 ${getRowBackgroundColor(
                                  computed.status
                                )}`}
                              >
                                {computed.remaining.aftf}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                                {item.inspectionCode ?? "-"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 border-r border-gray-100 max-w-[240px]">
                                <div className="whitespace-pre-line text-gray-600 leading-snug">
                                  {item.description ?? "-"}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                                {item.interval?.hours ?? "0"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                                {item.interval?.months ?? "0"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                                {item.lastDone?.date || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                                {item.lastDone?.tach || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                                {item.lastDone?.aftf || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                                {computed.nextDue.date}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                                {computed.nextDue.tach}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                                {computed.nextDue.aftf}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-gray-600">
                                {String(item.reference ?? "").trim() ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSequenceNavigation(
                                        String(item.reference)
                                      )
                                    }
                                    className="text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    {item.reference}
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleView(item)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {canUpdate("maintenance") && (
                                    <button
                                      type="button"
                                      onClick={() => openEdit(item)}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canDelete("maintenance") && (
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <DataTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showRangeText={false}
                  disabled={loading}
                  pageSizeOptions={[10, 25, 50]}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Entry Modal */}
      {showAddModal && (
        <CPCPEntryModal
          isOpen={true}
          isEdit={!!editingEntry}
          initialData={
            editingEntry
              ? {
                  inspection_operation: editingEntry.inspectionCode ?? "",
                  inspectionCode: editingEntry.inspectionCode ?? "",
                  description: editingEntry.description ?? "",
                  interval_hours: editingEntry.interval?.hours ?? "0",
                  interval_months: editingEntry.interval?.months ?? "0",
                  last_done_tach: editingEntry.lastDone?.tach ?? "",
                  last_done_aftt: editingEntry.lastDone?.aftf ?? "",
                  last_done_date: editingEntry.lastDone?.date ?? "",
                  lastDone: editingEntry.lastDone,
                  reference: editingEntry.reference ?? "",
                  atl_ref_display: editingEntry.reference ?? "",
                  atlId: (() => {
                    const ar = (editingEntry as any).atl_ref;
                    if (typeof ar === "number" && ar > 0) return ar;
                    if (ar && typeof ar === "object" && ar.id != null) {
                      const id = Number(ar.id);
                      return Number.isFinite(id) && id > 0 ? id : null;
                    }
                    return null;
                  })(),
                  atl: (editingEntry as any).atl,
                }
              : undefined
          }
          aircraftId={aircraftId}
          onClose={() => {
            setShowAddModal(false);
            setEditingEntry(null);
          }}
          onSubmit={(data) => {
            if (editingEntry) {
              handleEditSubmit(editingEntry.id, data);
            } else {
              handleAddSubmit(data);
            }
          }}
        />
      )}

      {/* View Modal */}
      {(viewLoading || viewEntry) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                View CPCP Entry
              </h2>
              <button
                type="button"
                onClick={() => setViewEntry(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {viewLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : viewEntry ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-gray-500 block mb-0.5">
                      Inspection operation
                    </span>
                    <p className="text-gray-900">
                      {viewEntry.inspectionCode ?? "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">
                      Description
                    </span>
                    <p className="text-gray-900 whitespace-pre-line">
                      {viewEntry.description ?? "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Interval Hours
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.interval?.hours ?? "0"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Interval Months
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.interval?.months ?? "0"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Last Done TACH
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.lastDone?.tach || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Last Done AFTT
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.lastDone?.aftf || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Last Done Date
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.lastDone?.date || "-"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">
                      ATL Ref (sequence_no)
                    </span>
                    <p className="text-gray-900">
                      {viewEntry.reference ?? "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Next due date
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.nextDue?.date ?? "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Next due TACH
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.nextDue?.tach ?? "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Next due AFTT
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.nextDue?.aftf ?? "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CPCPMonitoring.displayName = "CPCPMonitoring";
