import {
  Search,
  Printer,
  Download,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Loader,
  Upload,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import {
  getCertificatesMonitoring,
  createCertificateMonitoring,
  updateCertificateMonitoring,
  deleteCertificateMonitoring,
  downloadCertificateFile,
  CertificateMonitoring as CertificateMonitoringType,
  CertificateStatus,
  type CertificateMonitoringCreate,
  type CertificateMonitoringUpdate,
} from "../api/certificateMonitoringApi";
import { Spinner } from "./ui/spinner";

/**
 * Certificate Monitoring (global): /certificate-monitoring
 * Columns: AIRCRAFT, CERTIFICATE, EXPIRY DATE, DAYS LEFT, STATUS, ACTIONS
 */
export function CertificateMonitoring() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortBy, setSortBy] = useState<"document" | "expiryDate" | "status">(
    "document"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [certificates, setCertificates] = useState<CertificateMonitoringType[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingCertificate, setEditingCertificate] =
    useState<CertificateMonitoringType | null>(null);
  const [viewingCertificate, setViewingCertificate] =
    useState<CertificateMonitoringType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    certificateName: "",
    description: "",
    issueDate: "",
    expiryDate: "",
    warningDays: "",
    webLink: "",
    status: "Active" as CertificateStatus,
  });

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Status enum state (static list; API base URL returns 405 for GET)
  const [statusEnum] = useState<CertificateStatus[]>([
    "Active",
    "Expired",
    "Expiring Soon",
    "Inactive",
  ]);

  // Fetch certificates
  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCertificatesMonitoring(
        currentPage,
        itemsPerPage,
        searchDebounced
      );
      setCertificates(response.items);
      setTotalRecords(response.total);
      setTotalPages(response.pages);
    } catch (error: any) {
      console.error("Error fetching certificates:", error);

      // Show user-friendly error message
      let errorMessage = "Failed to load certificates. Please try again.";
      let errorTitle = "Error!";
      let showFooter = false;

      if (error.message) {
        errorMessage = error.message;
        // Check if it's a network error for special handling
        if (
          error.message.includes("Network error") ||
          error.code === "ERR_NETWORK"
        ) {
          errorTitle = "Connection Error";
          showFooter = true;
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 500) {
        errorTitle = "Server Error";
        errorMessage =
          "Server error: The documents-on-board/certificates endpoint may not be available. Check that GET /api/v1/documents-on-board/certificates/paged exists.";
      } else if (error.code === "ERR_NETWORK") {
        errorTitle = "Network Error";
        errorMessage =
          "Network error: Unable to connect to the server. Please check if the backend is running and CORS is configured.";
        showFooter = true;
      }

      Swal.fire({
        icon: "error",
        title: errorTitle,
        html: `<div style="text-align: left; white-space: pre-line;">${errorMessage}</div>`,
        footer: showFooter
          ? '<small style="text-align: left; display: block;">Tip: Ensure the backend server is running on port 8000 and CORS is properly configured to allow requests from http://localhost:3000</small>'
          : undefined,
        width: "600px",
      });

      // Set empty state on error
      setCertificates([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [currentPage, itemsPerPage, searchDebounced]);

  // Refresh certificates list after save/edit - shows loading spinner
  const refreshCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCertificatesMonitoring(
        currentPage,
        itemsPerPage,
        searchDebounced
      );
      setCertificates(response.items);
      setTotalRecords(response.total);
      setTotalPages(response.pages);
    } catch (error: any) {
      console.error("Error refreshing certificates:", error);
      // Don't show error alert on refresh - just log it
      // The main fetchCertificates will handle errors on initial load
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [currentPage, itemsPerPage, searchDebounced]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // Debounce search input (400ms) before applying to API
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

  // Compute days left: expiry_date - today (positive = days until expiry, negative = overdue)
  const computeDaysLeft = (
    expiryDate: string | null | undefined
  ): number | null => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffMs = expiry.getTime() - today.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  };

  // Compute status from days_left and warning_days
  const computeStatus = (
    daysLeft: number | null,
    warningDays: number | null | undefined
  ): "Expired" | "Expiring Soon" | "Active" => {
    if (daysLeft === null) return "Active";
    if (daysLeft < 0) return "Expired";
    const threshold = warningDays ?? 30;
    if (daysLeft <= threshold) return "Expiring Soon";
    return "Active";
  };

  const STATUS_SORT_ORDER: Record<string, number> = {
    Active: 0,
    "Expiring Soon": 1,
    Expired: 2,
    Inactive: 3,
  };

  const toggleSort = (column: "document" | "expiryDate" | "status") => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const sortedCertificates = useMemo(() => {
    const list = [...certificates];
    list.sort((a, b) => {
      const daysLeftA = computeDaysLeft(a.expiryDate);
      const daysLeftB = computeDaysLeft(b.expiryDate);
      const statusA = computeStatus(daysLeftA, a.warningDays);
      const statusB = computeStatus(daysLeftB, b.warningDays);
      const nameA = (
        (a as any).certificateName ??
        (a as any).documentName ??
        ""
      ).toLowerCase();
      const nameB = (
        (b as any).certificateName ??
        (b as any).documentName ??
        ""
      ).toLowerCase();
      const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
      const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
      let cmp = 0;
      if (sortBy === "document") {
        cmp = nameA.localeCompare(nameB);
      } else if (sortBy === "expiryDate") {
        cmp = dateA - dateB;
      } else {
        cmp =
          (STATUS_SORT_ORDER[statusA] ?? 4) - (STATUS_SORT_ORDER[statusB] ?? 4);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [certificates, sortBy, sortDir]);

  // Calculate statistics from all certificates (using computed status)
  const totalCertificates = totalRecords;
  const activeCount = certificates.filter((d) => {
    const days = computeDaysLeft(d.expiryDate);
    return computeStatus(days, d.warningDays) === "Active";
  }).length;
  const expiringSoonCount = certificates.filter((d) => {
    const days = computeDaysLeft(d.expiryDate);
    return computeStatus(days, d.warningDays) === "Expiring Soon";
  }).length;
  const expiredCount = certificates.filter((d) => {
    const days = computeDaysLeft(d.expiryDate);
    return computeStatus(days, d.warningDays) === "Expired";
  }).length;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700";
      case "Inactive":
        return "bg-gray-100 text-gray-700";
      case "Expiring Soon":
      case "Due Soon":
        return "bg-orange-100 text-orange-700";
      case "Expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDaysLeft = (
    daysLeft: number | null | undefined,
    status: string
  ) => {
    if (daysLeft === null || daysLeft === undefined) return "-";
    if (status === "Expired" || daysLeft < 0) {
      return `${Math.abs(daysLeft)} days overdue`;
    }
    return `${daysLeft} days left`;
  };

  const handleFileChange = (file: File | null) => {
    setUploadFile(file);
    setUploadFileName(file ? file.name : "");
  };

  const handleRemoveFile = () => {
    setUploadFile(null);
    setUploadFileName("");
  };

  // Get certificate ID (supports id, documentId, document_id from API)
  const getCertificateId = (
    cert: CertificateMonitoringType | null
  ): number | null => {
    if (!cert) return null;
    const id = cert.id ?? (cert as any).documentId ?? (cert as any).document_id;
    return id != null && !isNaN(Number(id)) ? Number(id) : null;
  };

  // Get file path from certificate (supports filePath, uploadFile, upload_file from API)
  const getCertificateFilePath = (
    cert: CertificateMonitoringType | null
  ): string | null => {
    if (!cert) return null;
    const path =
      (cert as any).filePath ?? cert.uploadFile ?? (cert as any).upload_file;
    return path && typeof path === "string" ? path : null;
  };

  // Same pattern as logbook: extract filename from path
  const extractFilenameFromPath = (filePath: string): string => {
    let cleanPath = filePath;
    if (filePath.includes("/")) {
      cleanPath = filePath.split("/").pop() || filePath;
    }
    cleanPath = cleanPath.split("?")[0];
    return cleanPath;
  };

  // Download file - same pattern as MaintenanceLogbook handleFileDownload
  const handleDownloadFile = async (
    filePath: string | undefined | null,
    fileName?: string
  ) => {
    if (!filePath) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "File path is not available.",
      });
      return;
    }

    try {
      const downloadFileName =
        fileName || extractFilenameFromPath(filePath) || "download";

      const blob = await downloadCertificateFile(filePath);
      const blobUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      let errorMessage = "Failed to download file.";
      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = Array.isArray(error.response.data.detail)
            ? error.response.data.detail.map((d: any) => d.msg || d).join(", ")
            : error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: errorMessage,
      });
    }
  };

  const handleView = async (id: number) => {
    try {
      const cert = certificates.find((d) => getCertificateId(d) === id);
      if (cert) {
        setViewingCertificate(cert);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error("Error viewing certificate:", error);
    }
  };

  const handleEdit = (id: number) => {
    const cert = certificates.find((d) => getCertificateId(d) === id);
    if (!cert) return;

    setEditingCertificate(cert);

    // Populate form data
    setFormData({
      certificateName:
        cert.certificateName ??
        (cert as any).documentName ??
        (cert as any).document ??
        "",
      description: cert.description ?? "",
      issueDate: cert.issueDate ?? "",
      expiryDate: cert.expiryDate ?? "",
      webLink: cert.webLink ?? "",
      warningDays: cert.warningDays != null ? String(cert.warningDays) : "",
      status: cert.status ?? "Active",
    });

    setUploadFile(null);
    setUploadFileName("");
    setShowEditModal(true);
  };

  const handleDelete = async (id: number) => {
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
      await deleteCertificateMonitoring(id);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The certificate has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCertificates();
    } catch (error: any) {
      console.error("Error deleting certificate:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to delete certificate.";
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: errorMessage,
      });
    }
  };

  const handleAddCertificate = () => {
    setFormData({
      certificateName: "",
      description: "",
      issueDate: "",
      expiryDate: "",
      warningDays: "",
      webLink: "",
      status: "Active",
    });
    setUploadFile(null);
    setUploadFileName("");
    setEditingCertificate(null);
    setShowEditModal(false);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validation
      if (!formData.certificateName?.trim()) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Please enter Certificate Name.",
        });
        setTimeout(() => setIsSaving(false), 360);
        return;
      }

      // Build API payload for /api/v1/documents-on-board/
      const warningDaysVal =
        formData.warningDays?.trim() !== ""
          ? Number(formData.warningDays)
          : null;
      const name = formData.certificateName.trim();
      const payload: Record<string, unknown> = {
        document_name: name,
        certificate_name: name,
        description: formData.description?.trim() || null,
        issue_date: formData.issueDate || null,
        expiry_date: formData.expiryDate || null,
        web_link: formData.webLink?.trim() || null,
        warning_days:
          warningDaysVal !== null && !isNaN(warningDaysVal)
            ? warningDaysVal
            : null,
        status: formData.status,
      };

      // When editing and not uploading a new file, send existing file_path (string) so backend keeps it
      const existingFilePath = editingCertificate
        ? getCertificateFilePath(editingCertificate)
        : null;
      if (!uploadFile && existingFilePath) {
        payload.file_path = existingFilePath;
      }

      // Always use FormData so backend receives consistent multipart; upload_file is optional (append only when user selected a file)
      const formDataObj = new FormData();
      formDataObj.append("json_data", JSON.stringify(payload));
      if (uploadFile) {
        formDataObj.append("upload_file", uploadFile);
      }
      const requestData = formDataObj;

      // Execute create or update
      if (editingCertificate) {
        // Ensure we have a valid ID (support both 'id' and 'document_id' from API)
        const certificateId = getCertificateId(editingCertificate);
        if (!certificateId) {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Certificate ID is missing or invalid. Cannot update certificate.",
          });
          setTimeout(() => setIsSaving(false), 360);
          return;
        }
        await updateCertificateMonitoring(
          certificateId,
          requestData as FormData | CertificateMonitoringUpdate
        );
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Certificate updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createCertificateMonitoring(
          requestData as FormData | CertificateMonitoringCreate
        );
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Certificate created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      // Reset form and close modals
      resetForm();
      // Refresh list with loading spinner
      await refreshCertificates();
    } catch (error: any) {
      console.error("Error saving certificate:", error);

      // Extract error message
      let errorMessage = "Failed to save certificate. Please try again.";
      const detail = error.response?.data?.detail;

      if (detail) {
        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation errors
          errorMessage = detail
            .map((e: any) => {
              const field = e.loc?.slice(1).join(".") || "field";
              const msg = e.msg || e.message || "Invalid value";
              return `${field}: ${msg}`;
            })
            .join("\n");
        } else if (detail.message) {
          errorMessage = detail.message;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: "error",
        title: "Error!",
        text: errorMessage,
        width: "600px",
      });
    } finally {
      setTimeout(() => setIsSaving(false), 360);
    }
  };

  // Reset form state
  const resetForm = () => {
    setFormData({
      certificateName: "",
      description: "",
      issueDate: "",
      expiryDate: "",
      warningDays: "",
      webLink: "",
      status: "Active",
    });
    setUploadFile(null);
    setUploadFileName("");
    setEditingCertificate(null);
    setShowAddModal(false);
    setShowEditModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Certificate Monitoring
          </h2>
          <p className="text-gray-600 mt-1">
            Aircraft certificate tracking and expiry management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            onClick={handleAddCertificate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Certificate
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Certificates</p>
              <p className="text-3xl font-semibold text-gray-900">
                {totalCertificates}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-5 border border-green-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Active</p>
              <p className="text-3xl font-semibold text-gray-900">
                {activeCount}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Expiring Soon</p>
              <p className="text-3xl font-semibold text-gray-900">
                {expiringSoonCount}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-5 border border-red-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Expired</p>
              <p className="text-3xl font-semibold text-gray-900">
                {expiredCount}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Records Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Section Header */}
        <div className="bg-blue-600 px-6 py-4 rounded-t-lg">
          <h3 className="text-lg font-semibold text-white">
            Certificate Records
          </h3>
        </div>

        {/* Search: Certificate */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1.5">
                Searches: Certificate name
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by certificate name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                  title="Search by certificate name"
                  aria-label="Search by certificate name"
                  className="w-full h-10 pl-10 pr-9 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                />
                {searchQuery && !loading && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {loading && (
                  <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort("document")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        CERTIFICATE
                        {sortBy === "document" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort("expiryDate")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        EXPIRY DATE
                        {sortBy === "expiryDate" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      DAYS LEFT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort("status")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        STATUS
                        {sortBy === "status" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCertificates.length === 0 ? (
                    <tr key="empty">
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500 text-sm"
                      >
                        No certificates found
                      </td>
                    </tr>
                  ) : (
                    sortedCertificates.map((cert, index) => {
                      const daysLeft = computeDaysLeft(cert.expiryDate);
                      const status = computeStatus(daysLeft, cert.warningDays);
                      const certId = getCertificateId(cert);
                      return (
                        <tr
                          key={certId ?? `cert-${index}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(cert as any).certificateName ??
                              (cert as any).documentName ??
                              (cert as any).document ??
                              "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cert.expiryDate || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDaysLeft(daysLeft, status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => certId && handleView(certId)}
                                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                title="View"
                                disabled={!certId}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => certId && handleEdit(certId)}
                                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                title="Edit"
                                disabled={!certId}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => certId && handleDelete(certId)}
                                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                                disabled={!certId}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    disabled={loading}
                    className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  {certificates.length > 0
                    ? (currentPage - 1) * itemsPerPage + 1
                    : 0}{" "}
                  to {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                  {totalRecords} entries
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay with blur */}
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={resetForm}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCertificate ? "Edit Certificate" : "Add New Entry"}
              </h2>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {/* CERTIFICATE MONITORING Header */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">
                    CERTIFICATE MONITORING
                  </h3>
                </div>

                {/* Certificate Name - Full Width */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Certificate Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.certificateName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        certificateName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="e.g. Certificate of Airworthiness"
                    required
                  />
                </div>

                {/* Description - Full Width */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm resize-none"
                    placeholder="e.g. Issued by CAAP confirming the aircraft is airworthy for commercial operations"
                  />
                </div>

                {/* Two-column layout for Issue Date and Expiry Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Issue Date */}
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, issueDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Two-column layout for Warning Days and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Warning Days */}
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Warning Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.warningDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warningDays: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                      placeholder="e.g., 30"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as CertificateStatus,
                        })
                      }
                      disabled={false}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    >
                      {statusEnum.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Existing file + Download (Edit only, when upload_file / filePath exists) */}
                {showEditModal &&
                  editingCertificate &&
                  getCertificateFilePath(editingCertificate) && (
                    <div>
                      <label className="block text-gray-700 text-sm mb-1.5">
                        Existing File
                      </label>
                      <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                        <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-900 truncate">
                          {extractFilenameFromPath(
                            getCertificateFilePath(editingCertificate)!
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadFile(
                              getCertificateFilePath(editingCertificate)
                            )
                          }
                          className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-50 transition-colors text-sm font-medium flex items-center gap-2 flex-shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}

                {/* File Upload */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Attach File{" "}
                    <span className="text-gray-500 font-normal">
                      (optional)
                    </span>
                  </label>
                  {uploadFile || uploadFileName ? (
                    <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-900 truncate">
                        {uploadFileName}
                      </span>
                      {editingCertificate &&
                        getCertificateFilePath(editingCertificate) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadFile(
                                getCertificateFilePath(editingCertificate)
                              )
                            }
                            className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-50 transition-colors text-sm font-medium flex items-center gap-2 flex-shrink-0"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(file);
                        }}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="file-upload"
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

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Web Link{" "}
                    <span className="text-gray-500 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={formData.webLink}
                    onChange={(e) =>
                      setFormData({ ...formData, webLink: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* Footer with Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 relative">
              {isSaving && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-b-lg">
                  <Spinner />
                </div>
              )}
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                {editingCertificate ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal - same design as Add Certificate modal */}
      {showViewModal && viewingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay with blur - same as Add Certificate */}
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => {
              setShowViewModal(false);
              setViewingCertificate(null);
            }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                View Certificate
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCertificate(null);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Certificate Name
                  </label>
                  <p className="text-gray-900">
                    {(viewingCertificate.certificateName ??
                      (viewingCertificate as any).documentName) ||
                      "-"}
                  </p>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Description
                  </label>
                  <p className="text-gray-900">
                    {viewingCertificate.description || "-"}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      Issue Date
                    </label>
                    <p className="text-gray-900">
                      {viewingCertificate.issueDate || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      Expiry Date
                    </label>
                    <p className="text-gray-900">
                      {viewingCertificate.expiryDate || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      Warning Days
                    </label>
                    <p className="text-gray-900">
                      {viewingCertificate.warningDays !== null &&
                      viewingCertificate.warningDays !== undefined
                        ? viewingCertificate.warningDays
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      Days Left
                    </label>
                    <p className="text-gray-900">
                      {formatDaysLeft(
                        computeDaysLeft(viewingCertificate.expiryDate),
                        computeStatus(
                          computeDaysLeft(viewingCertificate.expiryDate),
                          viewingCertificate.warningDays
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Status
                  </label>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                      computeStatus(
                        computeDaysLeft(viewingCertificate.expiryDate),
                        viewingCertificate.warningDays
                      )
                    )}`}
                  >
                    {computeStatus(
                      computeDaysLeft(viewingCertificate.expiryDate),
                      viewingCertificate.warningDays
                    )}
                  </span>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Web Link
                  </label>
                  {viewingCertificate.webLink ??
                  (viewingCertificate as any).web_link ? (
                    <a
                      href={
                        (viewingCertificate.webLink ??
                          (viewingCertificate as any).web_link) ||
                        "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {viewingCertificate.webLink ??
                        (viewingCertificate as any).web_link}
                    </a>
                  ) : (
                    <p className="text-gray-900">—</p>
                  )}
                </div>

                {getCertificateFilePath(viewingCertificate) && (
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">
                      File
                    </label>
                    <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate flex-1">
                        {extractFilenameFromPath(
                          getCertificateFilePath(viewingCertificate)!
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadFile(
                            getCertificateFilePath(viewingCertificate)
                          )
                        }
                        className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-50 transition-colors text-sm font-medium flex items-center gap-2 flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Footer - same pattern as Add Certificate modal */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingCertificate(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
