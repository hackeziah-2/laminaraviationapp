import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Spinner } from "./ui/spinner";
import Swal from "sweetalert2";
import {
  getOrganizationalApprovalsPaged,
  createOrganizationalApproval,
  updateOrganizationalApproval,
  deleteOrganizationalApproval,
  getCertificateCategoryTypesList,
  createCertificateCategoryType,
  type OrganizationalApproval,
  type OrganizationalApprovalSortBy,
  type SortOrder,
  type CertificateTypeOption,
} from "../api/organizationalApprovalApi";

/** Format expiry string (ISO or other) for display e.g. "16 Aug 30" */
function formatExpiryDisplay(expiry: string | null | undefined): string {
  if (!expiry?.trim()) return "—";
  const d = new Date(expiry);
  if (isNaN(d.getTime())) return expiry;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

/** Normalize date to YYYY-MM-DD for API */
function toApiDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const d = new Date(value.trim());
  if (isNaN(d.getTime())) return value.trim();
  return d.toISOString().slice(0, 10);
}

const SEARCH_DEBOUNCE_MS = 400;

export function OrganizationalApprovals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<OrganizationalApprovalSortBy>("EXPIRY");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showModal, setShowModal] = useState(false);
  const [editingApproval, setEditingApproval] = useState<OrganizationalApproval | null>(null);
  const [viewingApproval, setViewingApproval] = useState<OrganizationalApproval | null>(null);
  const [formData, setFormData] = useState({
    certificateFk: 0,
    number: "",
    expiryDate: "",
    webLink: "",
  });
  const [certificateTypesFromApi, setCertificateTypesFromApi] = useState<CertificateTypeOption[]>([]);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [creatingType, setCreatingType] = useState(false);

  const [approvals, setApprovals] = useState<OrganizationalApproval[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const certificateOptions = useMemo(() => {
    const byId = new Map<number, { id: number; name: string }>();
    approvals
      .filter((a) => a.certificateFk && (a.approvalTypeName || a.certificate))
      .forEach((a) => {
        if (!byId.has(a.certificateFk)) {
          byId.set(a.certificateFk, {
            id: a.certificateFk,
            name: (a.approvalTypeName ?? a.certificate) || String(a.certificateFk),
          });
        }
      });
    certificateTypesFromApi.forEach((x) => {
      if (x.id && x.name && !byId.has(x.id)) byId.set(x.id, { id: x.id, name: x.name });
    });
    if (
      editingApproval?.certificateFk &&
      !byId.has(editingApproval.certificateFk)
    ) {
      const name =
        editingApproval.approvalTypeName ??
        editingApproval.certificate ??
        String(editingApproval.certificateFk);
      byId.set(editingApproval.certificateFk, { id: editingApproval.certificateFk, name });
    }
    const combined = Array.from(byId.values());
    return combined.length ? combined : certificateTypesFromApi;
  }, [approvals, certificateTypesFromApi, editingApproval]);

  useEffect(() => {
    getCertificateCategoryTypesList().then(setCertificateTypesFromApi);
  }, []);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const certificateFilter =
        filterType === "all" ? undefined : Number(filterType) || filterType;
      const res = await getOrganizationalApprovalsPaged(
        currentPage,
        itemsPerPage,
        debouncedSearchTerm.trim(),
        sortBy,
        sortOrder,
        certificateFilter
      );
      setApprovals(res.items);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.pages));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load approvals.";
      setError(message);
      setApprovals([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterType, sortBy, sortOrder]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Debounce search: update debounced term and reset to page 1 when it changes
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const paginatedApprovals = approvals;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Page resets to 1 when debounced search updates
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleSortChange = (field: OrganizationalApprovalSortBy) => {
    setSortBy(field);
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setEditingApproval(null);
    setFormData({ certificateFk: 0, number: "", expiryDate: "", webLink: "" });
    setShowModal(true);
  };

  const openViewModal = (approval: OrganizationalApproval) => {
    setViewingApproval(approval);
  };

  const openViewEditModal = (approval: OrganizationalApproval) => {
    setEditingApproval(approval);
    const expiryForInput = approval.expiryDate ?? approval.expiry;
    setFormData({
      certificateFk: approval.certificateFk || 0,
      number: approval.number || "",
      expiryDate: expiryForInput
        ? (() => {
            const d = new Date(expiryForInput);
            return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
          })()
        : "",
      webLink:
        approval.fileLink && approval.fileLink !== "#" ? approval.fileLink : approval.webLink ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingApproval(null);
    setFormData({ certificateFk: 0, number: "", expiryDate: "", webLink: "" });
  };

  const handleSaveDocument = async () => {
    const fk = formData.certificateFk;

    if (!fk) {
      Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please select an Approval Type.",
      });
      return;
    }

    if (!formData.number?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter the Approval Number.",
      });
      return;
    }

    if (!formData.expiryDate?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter an Expiry Date.",
      });
      return;
    }

    setSaving(true);

    const webLink = formData.webLink?.trim();
    const dateOfExpiration = toApiDate(formData.expiryDate);
    if (!dateOfExpiration) {
      Swal.fire({
        icon: "warning",
        title: "Invalid date",
        text: "Please enter a valid Expiry Date.",
      });
      return;
    }
    const payload = {
      certificate_fk: fk,
      number: formData.number.trim(),
      date_of_expiration: dateOfExpiration,
      web_link: webLink !== undefined && webLink !== "" ? webLink : null,
    };

    try {
      if (editingApproval) {
        await updateOrganizationalApproval(editingApproval.id, payload);

        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "The approval has been updated.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createOrganizationalApproval(payload);

        Swal.fire({
          icon: "success",
          title: "Created",
          text: "The approval has been added.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      closeModal();
      setCurrentPage(1);
      await fetchApprovals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewType = async () => {
    const name = newTypeName?.trim();
    if (!name) {
      Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter a name for the new approval type.",
      });
      return;
    }
    setCreatingType(true);
    try {
      const created = await createCertificateCategoryType({ name });
      const list = await getCertificateCategoryTypesList();
      setCertificateTypesFromApi(list);
      const newId = created?.id ?? list.find((x) => x.name === name)?.id;
      if (newId) {
        setFormData((prev) => ({ ...prev, certificateFk: newId }));
      }
      setShowCreateTypeModal(false);
      setNewTypeName("");
      await Swal.fire({
        icon: "success",
        title: "Approval type created",
        text: `"${name}" has been added.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create type.";
      Swal.fire({ icon: "error", title: "Error", text: message });
    } finally {
      setCreatingType(false);
    }
  };

  const handleDeleteApproval = async (id: number) => {
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
      await deleteOrganizationalApproval(id);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The approval has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      setCurrentPage(1);
      await fetchApprovals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete.";
      Swal.fire({ icon: "error", title: "Error", text: message });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Organizational Approvals
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Operational certificates and organizational approvals tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateTypeModal(true);
              setNewTypeName("");
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Approval Type</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Approval</span>
          </button>
        </div>
      </div>

      {/* Blue Banner */}
      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          ORGANIZATIONAL APPROVALS
        </span>
        <span className="text-sm">DATE: 27 FEB 26</span>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              Search Approvals
            </label>
            <input
              type="text"
              placeholder="Search by approval type, number, or expiry..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Approval Type
            </label>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Approval Types</option>
              {certificateOptions.map((opt, idx) => (
                <option key={`filter-${opt.id}-${idx}`} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Approvals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSortChange("CERTIFICATE")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    APPROVAL TYPE
                    {sortBy === "CERTIFICATE" && (
                      <span className="text-blue-600">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  NUMBER
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSortChange("EXPIRY")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    />
                    EXPIRY
                    {sortBy === "EXPIRY" && (
                      <span className="text-blue-600">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  FILE
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <Spinner />
                  </td>
                </tr>
              ) : paginatedApprovals.length > 0 ? (
                paginatedApprovals.map((approval) => (
                  <tr
                    key={approval.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-gray-900 font-medium">
                      {approval.approvalTypeName ?? approval.certificate}
                    </td>
                    <td className="px-6 py-3.5 text-gray-900">
                      {approval.number || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-900">
                      {formatExpiryDisplay(approval.expiryDate ?? approval.expiry)}
                    </td>
                    <td className="px-6 py-3.5">
                      {approval.fileLink && approval.fileLink !== "#" ? (
                        <a
                          href={approval.fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline text-sm"
                        >
                          [LINK]
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openViewModal(approval)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="View details"
                          aria-label="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openViewEditModal(approval)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteApproval(approval.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No approvals found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-6"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Approval Details Modal */}
      {viewingApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => setViewingApproval(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                View Approval Details
              </h2>
              <button
                type="button"
                onClick={() => setViewingApproval(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Approval Type
                </span>
                <span className="text-gray-900 text-sm">
                  {viewingApproval.approvalTypeName ?? viewingApproval.certificate}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Number
                </span>
                <span className="text-gray-900 text-sm">
                  {viewingApproval.number || "—"}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Expiry Date
                </span>
                <span className="text-gray-900 text-sm">
                  {formatExpiryDisplay(viewingApproval.expiryDate ?? viewingApproval.expiry)}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  File Link
                </span>
                {viewingApproval.fileLink && viewingApproval.fileLink !== "#" ? (
                  <a
                    href={viewingApproval.fileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                  >
                    [LINK] <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingApproval(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Approval Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingApproval ? "Edit Approval" : "Add Approval"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Approval Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.certificateFk ? String(formData.certificateFk) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      certificateFk: val ? Number(val) : 0,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  {certificateOptions.map((opt, idx) => (
                    <option key={`type-${opt.id}-${idx}`} value={String(opt.id)}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                  placeholder="Enter Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Web Link
                </label>
                <input
                  type="url"
                  value={formData.webLink}
                  onChange={(e) =>
                    setFormData({ ...formData, webLink: e.target.value })
                  }
                  placeholder="Enter Link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={
                  saving ||
                  !formData.certificateFk ||
                  !formData.number?.trim() ||
                  !formData.expiryDate?.trim()
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Document"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create new approval type modal */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => {
              if (!creatingType) {
                setShowCreateTypeModal(false);
                setNewTypeName("");
              }
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Create new approval type
              </h2>
              <button
                type="button"
                onClick={() => !creatingType && (setShowCreateTypeModal(false), setNewTypeName(""))}
                disabled={creatingType}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. AOC, Maintenance Approval"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateNewType()}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !creatingType && (setShowCreateTypeModal(false), setNewTypeName(""))}
                disabled={creatingType}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewType}
                disabled={creatingType || !newTypeName?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
              >
                {creatingType ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
