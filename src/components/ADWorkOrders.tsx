import {
  ArrowLeft,
  Printer,
  Download,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader,
  Search,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getWorkOrderAdMonitoring,
  createWorkOrderAdMonitoring,
  updateWorkOrderAdMonitoring,
  deleteWorkOrderAdMonitoring,
  type WorkOrderAdMonitoring,
} from "../api/workOrderAdMonitoringApi";
import { Spinner } from "./ui/spinner";
import Swal from "sweetalert2";

function toDateInputValue(s: string | null | undefined): string {
  if (s == null || String(s).trim() === "") return "";
  const raw = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(s: string | null | undefined): string {
  if (s == null || String(s).trim() === "") return "—";
  const d = new Date(String(s).trim());
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString();
}

export function ADWorkOrders() {
  const params = useParams<{ id: string; ad_monitoring_id: string }>();
  const navigate = useNavigate();
  const aircraft_fk = parseInt(params.id ?? "0", 10);
  const ad_monitoring_fk = parseInt(params.ad_monitoring_id ?? "0", 10);
  const hasValidParams = aircraft_fk > 0 && ad_monitoring_fk > 0;

  const handleBack = () => {
    navigate(`/profile/${params.id ?? ""}/maintenance-ad`);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    woNumber: "",
    lastDoneActt: "",
    lastDoneTach: "",
    lastDoneDate: "",
    nextDoneActt: "",
    nextDueTach: "",
    atlRef: "",
  });

  const [workOrders, setWorkOrders] = useState<WorkOrderAdMonitoring[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] =
    useState<WorkOrderAdMonitoring | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    if (!hasValidParams) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkOrderAdMonitoring(
        aircraft_fk,
        ad_monitoring_fk,
        currentPage,
        itemsPerPage,
        searchQuery
      );
      setWorkOrders(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      console.error("Work orders fetch error:", err);
      setError(
        err?.response?.data?.detail ??
          err?.message ??
          "Failed to load work orders"
      );
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [
    aircraft_fk,
    ad_monitoring_fk,
    hasValidParams,
    currentPage,
    itemsPerPage,
    searchQuery,
  ]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      woNumber: "",
      lastDoneActt: "",
      lastDoneTach: "",
      lastDoneDate: "",
      nextDoneActt: "",
      nextDueTach: "",
      atlRef: "",
    });
    setEditingWorkOrder(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!hasValidParams) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid route",
        text: "Aircraft or AD monitoring is missing. Go back to the list.",
      });
      return;
    }
    const woNumber = String(formData.woNumber).trim();
    if (!woNumber) {
      await Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter Work Order Number.",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingWorkOrder) {
        await updateWorkOrderAdMonitoring(
          aircraft_fk,
          ad_monitoring_fk,
          editingWorkOrder.id,
          {
            woNumber,
            lastDoneActt: formData.lastDoneActt || undefined,
            lastDoneTach: formData.lastDoneTach || undefined,
            lastDoneDate: formData.lastDoneDate || undefined,
            nextDoneActt: formData.nextDoneActt || undefined,
            nextDueTach: formData.nextDueTach || undefined,
            atlRef: formData.atlRef || undefined,
          }
        );
      } else {
        await createWorkOrderAdMonitoring(aircraft_fk, ad_monitoring_fk, {
          woNumber,
          lastDoneActt: formData.lastDoneActt ?? "",
          lastDoneTach: formData.lastDoneTach ?? "",
          lastDoneDate: formData.lastDoneDate ?? "",
          nextDoneActt: formData.nextDoneActt ?? "",
          nextDueTach: formData.nextDueTach ?? "",
          atlRef: formData.atlRef ?? "",
        });
      }
      setShowAddModal(false);
      resetForm();
      await fetchWorkOrders();
      await Swal.fire({
        icon: "success",
        title: editingWorkOrder ? "Updated!" : "Saved!",
        text: editingWorkOrder ? "Work order updated." : "Work order added.",
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ?? err?.message ?? "Failed to save.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: WorkOrderAdMonitoring) => {
    if (!hasValidParams) return;
    const result = await Swal.fire({
      title: "Delete Work Order?",
      text: `"${item.woNumber}" — you won't be able to revert this.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    setDeletingId(item.id);
    try {
      await deleteWorkOrderAdMonitoring(aircraft_fk, ad_monitoring_fk, item.id);
      await fetchWorkOrders();
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Work order deleted.",
      });
    } catch (err: any) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err?.response?.data?.detail ?? err?.message ?? "Failed to delete.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (item: WorkOrderAdMonitoring) => {
    setEditingWorkOrder(item);
    setFormData({
      woNumber: item.woNumber,
      lastDoneActt: String(item.lastDoneActt ?? ""),
      lastDoneTach: String(item.lastDoneTach ?? ""),
      lastDoneDate: toDateInputValue(item.lastDoneDate),
      nextDoneActt: String(item.nextDoneActt ?? ""),
      nextDueTach: String(item.nextDueTach ?? ""),
      atlRef: item.atlRef ?? "",
    });
    setShowAddModal(true);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, total);

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              disabled={!hasValidParams}
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Work Order
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        <div>
          <h2 className="text-gray-900">
            Work Orders — AD Monitoring #{params.ad_monitoring_id ?? "—"}
          </h2>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Search bar: WO NUMBER and ATL_REF */}
          <div className="p-5 border-b border-gray-200">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by WO Number, ATL Ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {!hasValidParams && (
            <div className="p-4 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">
              Missing or invalid aircraft or AD monitoring.
            </div>
          )}
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border-b border-red-100 flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  fetchWorkOrders();
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded"
              >
                Retry
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-green-50 border-y border-gray-200">
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      WO NUMBER
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider border-l border-gray-200">
                      ACTT
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      TACH
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider border-r border-gray-200">
                      DATE
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      ACTT
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider border-r border-gray-200">
                      TACH
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      ATL REFERENCE
                    </th>
                    <th className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-8 text-center text-gray-500 text-sm"
                      >
                        No work orders. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    workOrders.map((wo) => (
                      <tr
                        key={wo.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3 text-sm text-gray-900">
                          {wo.woNumber}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-900 border-l border-gray-200">
                          {wo.lastDoneActt}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-900">
                          {wo.lastDoneTach}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-900 border-r border-gray-200">
                          {formatDateDisplay(wo.lastDoneDate)}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-900">
                          {wo.nextDoneActt}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-900 border-r border-gray-200">
                          {wo.nextDueTach}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          <span className="text-blue-600">{wo.atlRef}</span>
                        </td>
                        <td className="px-5 py-3 text-sm">
                          <div className="flex items-center justify-center gap-1">
                            {deletingId === wo.id ? (
                              <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(wo)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(wo)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {total > 0 && !loading && (
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-gray-500 text-sm">
                Showing {startIndex + 1} to {endIndex} of {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {pages || 1}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pages || 1, p + 1))
                  }
                  disabled={currentPage >= (pages || 1) || loading}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full min-w-[320px] max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="text-gray-900">
                {editingWorkOrder ? "Edit Work Order" : "Add Work Order"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-5 overflow-y-auto min-h-0 flex-1">
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  Work Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 17212-A-000343"
                  value={formData.woNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, woNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="text-amber-600 text-sm mb-2">Last Done</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      ACTT
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 60"
                      value={formData.lastDoneActt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastDoneActt: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Tach
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 60"
                      value={formData.lastDoneTach}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastDoneTach: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.lastDoneDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastDoneDate: e.target.value,
                        })
                      }
                      className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-amber-600 text-sm mb-2">Next Due</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      ACTT
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 6180.1"
                      value={formData.nextDoneActt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nextDoneActt: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Tach
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 6170.6"
                      value={formData.nextDueTach}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nextDueTach: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-gray-900 text-sm font-medium mb-1">
                  Sequence No.
                </label>
                <p className="text-xs text-gray-500 mb-2">ATL Reference</p>
                <div className="flex items-stretch rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <span className="inline-flex items-center px-4 py-2.5 bg-[#f7f7f7] border-r border-gray-200 text-gray-600 text-sm font-medium shrink-0 rounded-l-xl">
                    ATL-
                  </span>
                  <input
                    type="text"
                    value={(formData.atlRef || "").replace(/^ATL-/i, "")}
                    onChange={(e) => {
                      const num = e.target.value.replace(/^ATL-/i, "").trim();
                      setFormData((prev) => ({
                        ...prev,
                        atlRef: num ? `ATL-${num}` : "",
                      }));
                    }}
                    placeholder="001"
                    className="flex-1 min-w-0 py-2.5 pl-3 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none border-0 rounded-r-xl"
                    aria-label="ATL sequence number"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdate}
                disabled={saving}
                className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm disabled:opacity-50 flex items-center gap-2 min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : editingWorkOrder ? (
                  "Update Entry"
                ) : (
                  "Add Work Order"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
