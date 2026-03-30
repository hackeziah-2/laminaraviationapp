import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { useUserPermissions } from "../hooks/useUserPermissions";

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

export function CPCPMonitoring({
  onBack,
  msn,
  registration = "RP-C12",
  aftf = "7895.4",
  tach = "7894.8",
  date = "20-Sep-25",
  embedded = false,
  aircraftId,
}: CPCPMonitoringProps) {
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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (!editingEntry) return;
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
    [editingEntry, fetchList]
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
              <h1 className="text-base font-semibold text-gray-900 tracking-tight">
                CPCP Monitoring
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {registration}
                </span>
                <span>
                  MSN <span className="text-gray-900">{msn}</span>
                </span>
                <span>
                  AFTT <span className="text-gray-900">{aftf}</span>
                </span>
                <span>
                  TACH <span className="text-gray-900">{tach}</span>
                </span>
                <span>
                  DATE <span className="text-gray-900">{date}</span>
                </span>
              </div>
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
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      REMAINING
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      INSPECTION OPERATION
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      DESCRIPTION
                    </th>
                    <th
                      colSpan={2}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      INTERVAL
                    </th>
                    <th
                      colSpan={3}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      LAST DONE
                    </th>
                    <th
                      colSpan={3}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      NEXT DUE
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      REFERENCE
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95"
                    >
                      ACTIONS
                    </th>
                  </tr>
                  <tr className="border-b border-blue-700/30 bg-blue-600 text-white">
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      MONTHS
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      DAYS
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      TACH
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
                      AFTT
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      HOURS
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
                      MONTHS
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      DATE
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      TACH
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
                      AFTT
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      DATE
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      TACH
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
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
                      const computed = computeCpcpRow(item, tach, aftf);
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
                            {item.interval?.hours ?? "-"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                            {item.interval?.months ?? "-"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                            {item.lastDone?.date ?? "-"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                            {item.lastDone?.tach ?? "-"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                            {item.lastDone?.aftf ?? "-"}
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
                            {item.reference ?? "-"}
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

            {/* Pagination - same pattern as Aircraft Fleet Profile */}
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1 || loading}
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
                  disabled={currentPage === totalPages || loading}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 px-6 py-2">
              Showing {totalItems === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, totalItems)} of {totalItems} inspections
            </div>
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
                  interval_hours: editingEntry.interval?.hours ?? "",
                  interval_months: editingEntry.interval?.months ?? "",
                  last_done_tach: editingEntry.lastDone?.tach ?? "",
                  last_done_aftt: editingEntry.lastDone?.aftf ?? "",
                  last_done_date: editingEntry.lastDone?.date ?? "",
                  lastDone: editingEntry.lastDone,
                  reference: editingEntry.reference ?? "",
                  atl_ref_display: editingEntry.reference ?? "",
                  atlId:
                    typeof (editingEntry as any).atl_ref === "number"
                      ? (editingEntry as any).atl_ref
                      : null,
                  atl_ref: (editingEntry as any).atl_ref,
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
                        {viewEntry.interval?.hours ?? "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Interval Months
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.interval?.months ?? "-"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Last Done TACH
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.lastDone?.tach ?? "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Last Done AFTT
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.lastDone?.aftf ?? "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">
                        Last Done Date
                      </span>
                      <p className="text-gray-900">
                        {viewEntry.lastDone?.date ?? "-"}
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
}
