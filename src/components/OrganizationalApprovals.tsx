import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Upload,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";

const APPROVAL_TYPES = [
  "ATOC",
  "AMOC",
  "ATOC VALIDITY NEPAL",
  "FSTD",
  "AMDC",
] as const;

interface Approval {
  id: number;
  certificate: string;
  number: string;
  expiry: string;
  fileLink: string;
}

export function OrganizationalApprovals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingApproval, setEditingApproval] = useState<Approval | null>(null);
  const [viewingApproval, setViewingApproval] = useState<Approval | null>(null);
  const [formData, setFormData] = useState({
    approvalType: "",
    number: "",
    expiryDate: "",
    webLink: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  const [approvals, setApprovals] = useState<Approval[]>([
    {
      id: 1,
      certificate: "ATOC",
      number: "2020-01",
      expiry: "16 Aug 30",
      fileLink: "#",
    },
    {
      id: 2,
      certificate: "AMOC",
      number: "184-20",
      expiry: "31 Oct 27",
      fileLink: "#",
    },
    {
      id: 3,
      certificate: "ATOC VALIDITY NEPAL",
      number: "",
      expiry: "29 Oct 27",
      fileLink: "#",
    },
    {
      id: 4,
      certificate: "FSTD",
      number: "FSTD-2020-01",
      expiry: "16 Aug 30",
      fileLink: "#",
    },
    {
      id: 5,
      certificate: "AMDC",
      number: "07-2024",
      expiry: "22 Sep 26",
      fileLink: "#",
    },
  ]);

  // Calculate certificate type counts
  const certificateTypes = [...new Set(approvals.map((a) => a.certificate))];
  const typeCounts = {
    all: approvals.length,
    ...Object.fromEntries(
      certificateTypes.map((type) => [
        type.toLowerCase(),
        approvals.filter((a) => a.certificate === type).length,
      ])
    ),
  };

  const filteredApprovals = approvals.filter((approval) => {
    const matchesSearch =
      approval.certificate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.expiry.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      approval.certificate.toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApprovals = filteredApprovals.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setEditingApproval(null);
    setFormData({ approvalType: "", number: "", expiryDate: "", webLink: "" });
    setUploadFile(null);
    setUploadFileName("");
    setShowModal(true);
  };

  const openViewModal = (approval: Approval) => {
    setViewingApproval(approval);
  };

  const openViewEditModal = (approval: Approval) => {
    setEditingApproval(approval);
    setFormData({
      approvalType: approval.certificate,
      number: approval.number || "",
      expiryDate: approval.expiry
        ? (() => {
            const d = new Date(approval.expiry);
            return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
          })()
        : "",
      webLink:
        approval.fileLink && approval.fileLink !== "#" ? approval.fileLink : "",
    });
    setUploadFile(null);
    setUploadFileName("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingApproval(null);
    setFormData({ approvalType: "", number: "", expiryDate: "", webLink: "" });
    setUploadFile(null);
    setUploadFileName("");
  };

  const handleSaveDocument = () => {
    if (!formData.approvalType?.trim()) return;
    const expiryFormatted = formData.expiryDate
      ? new Date(formData.expiryDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        })
      : "—";
    if (editingApproval) {
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === editingApproval.id
            ? {
                ...a,
                certificate: formData.approvalType,
                number: formData.number?.trim() || "",
                expiry: expiryFormatted,
                fileLink: formData.webLink?.trim() || "#",
              }
            : a
        )
      );
    } else {
      const newId = Math.max(0, ...approvals.map((a) => a.id)) + 1;
      setApprovals((prev) => [
        ...prev,
        {
          id: newId,
          certificate: formData.approvalType,
          number: formData.number?.trim() || "",
          expiry: expiryFormatted,
          fileLink: formData.webLink?.trim() || "#",
        },
      ]);
    }
    closeModal();
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
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: "The approval has been deleted.",
      timer: 1500,
      showConfirmButton: false,
    });
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
              placeholder="Search by certificate, number, or expiry..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Types ({typeCounts.all})</option>
              {APPROVAL_TYPES.map((t) => (
                <option key={t} value={t.toLowerCase()}>
                  {t} (
                  {(typeCounts as Record<string, number>)[t.toLowerCase()] ?? 0}
                  )
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Header Info */}
      <div className="text-gray-600">
        Showing {filteredApprovals.length > 0 ? startIndex + 1 : 0} to{" "}
        {Math.min(startIndex + itemsPerPage, filteredApprovals.length)} of{" "}
        {filteredApprovals.length} approvals
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  CERTIFICATE
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  NUMBER
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    ></span>
                    EXPIRY
                  </span>
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
              {paginatedApprovals.length > 0 ? (
                paginatedApprovals.map((approval) => (
                  <tr
                    key={approval.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-gray-900 font-medium">
                      {approval.certificate}
                    </td>
                    <td className="px-6 py-3.5 text-gray-900">
                      {approval.number || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-900">
                      {approval.expiry}
                    </td>
                    <td className="px-6 py-3.5">
                      <a
                        href={approval.fileLink}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline text-sm"
                      >
                        [LINK]
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dynamic page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
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
                  className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors text-white`}
                  style={{
                    backgroundColor:
                      currentPage === pageNum ? "#38BDF8" : "transparent",
                    color: currentPage === pageNum ? "#ffffff" : "#454545",
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== pageNum)
                      e.currentTarget.style.backgroundColor = "#f3f3f5";
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== pageNum)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
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
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
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
                  {viewingApproval.certificate}
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
                  {viewingApproval.expiry}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  File Link
                </span>
                <a
                  href={viewingApproval.fileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                >
                  [LINK] <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
                  value={formData.approvalType}
                  onChange={(e) =>
                    setFormData({ ...formData, approvalType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  {APPROVAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
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
                  placeholder="mm/dd/yyyy"
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
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Upload Document
                </label>
                {uploadFile || uploadFileName ? (
                  <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                    <span className="flex-1 text-sm truncate">
                      {uploadFileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFile(null);
                        setUploadFileName("");
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      id="org-approval-file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setUploadFile(f ?? null);
                        setUploadFileName(f ? f.name : "");
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="org-approval-file"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 mb-1">
                        Choose file or drag here
                      </span>
                      <span className="text-xs text-gray-500">
                        Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                      </span>
                    </label>
                  </div>
                )}
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Save Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
