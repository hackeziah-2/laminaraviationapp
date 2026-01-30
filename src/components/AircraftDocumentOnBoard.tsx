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
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getAircraftDocumentsOnBoard,
  createAircraftDocumentOnBoard,
  updateAircraftDocumentOnBoard,
  deleteAircraftDocumentOnBoard,
  downloadDocumentOnBoardFile,
  DocumentOnBoard as DocumentOnBoardType,
  DocumentStatus,
  type DocumentOnBoardUpdate,
} from "../api/documentsOnBoardApi";
import { Spinner } from "./ui/spinner";
import { getAircraftById } from "../api/aircraftApi";

/**
 * Document On Board for a specific aircraft.
 * Route: /profile/{aircraft_id}/document_on_board (e.g. profile/2/document_on_board)
 * aircraft_id is read from the URL via useParams (:id) and used for all API calls.
 * API: api/v1/aircraft/{aircraft_id}/documents-on-board/paged?limit=10&page=1 (list), etc.
 */
export function AircraftDocumentOnBoard() {
  const { aircraft_id } = useParams<{ aircraft_id: string }>();
  const navigate = useNavigate();
  // aircraft_id from route: profile/{aircraft_id}/document_on_board
  const aircraftId =
    aircraft_id != null ? parseInt(aircraft_id, 10) : undefined;
  const isValidAircraft =
    aircraftId != null && !isNaN(aircraftId) && aircraftId > 0;

  const [aircraftRegistration, setAircraftRegistration] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortBy, setSortBy] = useState<"document" | "expiryDate" | "status">("document");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [documents, setDocuments] = useState<DocumentOnBoardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<DocumentOnBoardType | null>(null);
  const [viewingDocument, setViewingDocument] =
    useState<DocumentOnBoardType | null>(null);

  const [formData, setFormData] = useState({
    documentName: "",
    description: "",
    issueDate: "",
    expiryDate: "",
    warningDays: "",
    status: "Active" as DocumentStatus,
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [statusEnum] = useState<DocumentStatus[]>([
    "Active",
    "Expired",
    "Expiring Soon",
    "Inactive",
  ]);

  // Fetch aircraft name for header
  useEffect(() => {
    if (!isValidAircraft) return;
    getAircraftById(aircraftId)
      .then((res) => {
        const data = res.data as
          | { data?: { registration?: string }; registration?: string }
          | undefined;
        setAircraftRegistration(
          data?.data?.registration ?? data?.registration ?? "Aircraft"
        );
      })
      .catch(() => setAircraftRegistration("Aircraft"));
  }, [aircraftId, isValidAircraft]);

  const fetchDocuments = useCallback(async () => {
    if (!isValidAircraft || aircraftId == null) return;
    setLoading(true);
    try {
      // GET api/v1/aircraft/{aircraft_id}/documents-on-board/paged?limit=10&page=1 (aircraft_id from route)
      const response = await getAircraftDocumentsOnBoard(
        aircraftId,
        currentPage,
        itemsPerPage,
        searchDebounced
      );
      setDocuments(response.items);
      setTotalRecords(response.total);
      setTotalPages(response.pages);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
      setTotalRecords(0);
      setTotalPages(0);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to load documents.",
      });
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [
    aircraftId,
    currentPage,
    itemsPerPage,
    searchDebounced,
    isValidAircraft,
  ]);

  const refreshDocuments = useCallback(async () => {
    if (!isValidAircraft || aircraftId == null) return;
    setLoading(true);
    try {
      const response = await getAircraftDocumentsOnBoard(
        aircraftId,
        currentPage,
        itemsPerPage,
        searchDebounced
      );
      setDocuments(response.items);
      setTotalRecords(response.total);
      setTotalPages(response.pages);
    } catch (error: any) {
      console.error("Error refreshing documents:", error);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [
    aircraftId,
    currentPage,
    itemsPerPage,
    searchDebounced,
    isValidAircraft,
  ]);

  useEffect(() => {
    if (isValidAircraft) fetchDocuments();
  }, [fetchDocuments, isValidAircraft]);

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

  const computeDaysLeft = (
    expiryDate: string | null | undefined
  ): number | null => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.floor(
      (expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
    );
  };

  const computeStatus = (
    daysLeft: number | null,
    warningDays: number | null | undefined
  ): "Expired" | "Expiring Soon" | "Active" => {
    if (daysLeft === null) return "Active";
    if (daysLeft < 0) return "Expired";
    if (daysLeft <= (warningDays ?? 30)) return "Expiring Soon";
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

  const sortedDocuments = useMemo(() => {
    const list = [...documents];
    list.sort((a, b) => {
      const daysLeftA = computeDaysLeft(a.expiryDate);
      const daysLeftB = computeDaysLeft(b.expiryDate);
      const statusA = computeStatus(daysLeftA, a.warningDays);
      const statusB = computeStatus(daysLeftB, b.warningDays);
      const docNameA = ((a as any).documentName ?? (a as any).document ?? "").toLowerCase();
      const docNameB = ((b as any).documentName ?? (b as any).document ?? "").toLowerCase();
      const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
      const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
      let cmp = 0;
      if (sortBy === "document") {
        cmp = docNameA.localeCompare(docNameB);
      } else if (sortBy === "expiryDate") {
        cmp = dateA - dateB;
      } else {
        cmp = (STATUS_SORT_ORDER[statusA] ?? 4) - (STATUS_SORT_ORDER[statusB] ?? 4);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [documents, sortBy, sortDir]);

  const totalDocuments = totalRecords;
  const activeCount = documents.filter((d) => {
    const days = computeDaysLeft(d.expiryDate);
    return computeStatus(days, d.warningDays) === "Active";
  }).length;
  const expiringSoonCount = documents.filter((d) => {
    const days = computeDaysLeft(d.expiryDate);
    return computeStatus(days, d.warningDays) === "Expiring Soon";
  }).length;
  const expiredCount = documents.filter((d) => {
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
    if (status === "Expired" || daysLeft < 0)
      return `${Math.abs(daysLeft)} days overdue`;
    return `${daysLeft} days left`;
  };

  const getDocumentId = (doc: DocumentOnBoardType | null): number | null => {
    if (!doc) return null;
    const id = doc.id ?? (doc as any).documentId ?? (doc as any).document_id;
    return id != null && !isNaN(Number(id)) ? Number(id) : null;
  };

  const getDocumentFilePath = (
    doc: DocumentOnBoardType | null
  ): string | null => {
    if (!doc) return null;
    const path =
      (doc as any).filePath ?? doc.uploadFile ?? (doc as any).upload_file;
    return path && typeof path === "string" ? path : null;
  };

  const extractFilenameFromPath = (filePath: string) => {
    let cleanPath = filePath.includes("/")
      ? filePath.split("/").pop() || filePath
      : filePath;
    return cleanPath.split("?")[0];
  };

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
      const name = fileName || extractFilenameFromPath(filePath) || "download";
      const blob = await downloadDocumentOnBoardFile(filePath);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: error.message || "Failed to download file.",
      });
    }
  };

  const handleView = (docId: number) => {
    const doc = documents.find((d) => getDocumentId(d) === docId);
    if (doc) {
      setViewingDocument(doc);
      setShowViewModal(true);
    }
  };

  const handleEdit = (docId: number) => {
    const doc = documents.find((d) => getDocumentId(d) === docId);
    if (!doc) return;
    setEditingDocument(doc);
    setFormData({
      documentName: doc.documentName ?? (doc as any).document ?? "",
      description: doc.description ?? "",
      issueDate: doc.issueDate ?? "",
      expiryDate: doc.expiryDate ?? "",
      warningDays: doc.warningDays != null ? String(doc.warningDays) : "",
      status: doc.status ?? "Active",
    });
    setUploadFile(null);
    setUploadFileName("");
    setShowEditModal(true);
  };

  const handleDelete = async (docId: number) => {
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
      await deleteAircraftDocumentOnBoard(aircraftId!, docId);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The document has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchDocuments();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text:
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Failed to delete document.",
      });
    }
  };

  const handleAddDocument = () => {
    setFormData({
      documentName: "",
      description: "",
      issueDate: "",
      expiryDate: "",
      warningDays: "",
      status: "Active",
    });
    setUploadFile(null);
    setUploadFileName("");
    setEditingDocument(null);
    setShowEditModal(false);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!isValidAircraft) return;
    if (!formData.documentName?.trim()) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Document Name is required.",
      });
      return;
    }
    setIsSaving(true);
    try {
      const warningDaysVal =
        formData.warningDays?.trim() !== ""
          ? Number(formData.warningDays)
          : null;
      const payload: Record<string, unknown> = {
        document_name: formData.documentName.trim(),
        description: formData.description?.trim() || null,
        issue_date: formData.issueDate || null,
        expiry_date: formData.expiryDate || null,
        warning_days:
          warningDaysVal !== null && !isNaN(warningDaysVal)
            ? warningDaysVal
            : null,
        status: formData.status,
      };

      const existingFilePath = editingDocument
        ? getDocumentFilePath(editingDocument)
        : null;
      if (!uploadFile && existingFilePath) {
        payload.file_path = existingFilePath;
      }

      let requestData: FormData | Record<string, unknown>;
      if (uploadFile) {
        const fd = new FormData();
        fd.append("json_data", JSON.stringify(payload));
        fd.append("upload_file", uploadFile);
        requestData = fd;
      } else {
        requestData = payload;
      }

      if (editingDocument) {
        const documentId = getDocumentId(editingDocument);
        if (!documentId) {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Document ID is missing.",
          });
          setTimeout(() => setIsSaving(false), 360);
          return;
        }
        await updateAircraftDocumentOnBoard(
          aircraftId!,
          documentId,
          requestData as FormData | DocumentOnBoardUpdate
        );
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Document updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createAircraftDocumentOnBoard(
          aircraftId!,
          requestData as FormData | Record<string, unknown>
        );
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Document created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      resetForm();
      refreshDocuments();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      let msg = "Failed to save document.";
      if (typeof detail === "string") msg = detail;
      else if (Array.isArray(detail))
        msg = detail.map((d: any) => d.msg || d).join(", ");
      Swal.fire({ icon: "error", title: "Error!", text: msg });
    } finally {
      setTimeout(() => setIsSaving(false), 360);
    }
  };

  const resetForm = () => {
    setFormData({
      documentName: "",
      description: "",
      issueDate: "",
      expiryDate: "",
      warningDays: "",
      status: "Active",
    });
    setUploadFile(null);
    setUploadFileName("");
    setEditingDocument(null);
    setShowAddModal(false);
    setShowEditModal(false);
  };

  const handleFileChange = (file: File | null) => {
    setUploadFile(file);
    setUploadFileName(file ? file.name : "");
  };

  const handleRemoveFile = () => {
    setUploadFile(null);
    setUploadFileName("");
  };

  if (!isValidAircraft) {
    return (
      <div className="p-6">
        <p className="text-red-600">
          Invalid aircraft. Please select an aircraft from the fleet.
        </p>
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Fleet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/profile/`)}
            className="inline-flex items-center gap-2 text-gray-800 hover:text-gray-600 transition-colors focus:outline-none focus:ring-0"
            aria-label="Back to aircraft profile"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" />
          </button>
          <div className="h-6 w-px bg-gray-200" aria-hidden />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Aircraft Documents On Boardqq
            </h2>
            <p className="text-gray-600 mt-1">
              {aircraftRegistration
                ? `Documents for aircraft ${aircraftRegistration}`
                : "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            onClick={handleAddDocument}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Documents</p>
              <p className="text-3xl font-semibold text-gray-900">
                {totalDocuments}
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

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="bg-blue-600 px-6 py-4 rounded-t-lg">
          <h3 className="text-lg font-semibold text-white">Document Records</h3>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1.5">Searches: Document</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by document name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                  title="Searches document name only"
                  aria-label="Search by document name"
                  className="w-full h-10 pl-10 pr-9 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50 bg-white"
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
                        DOCUMENT
                        {sortBy === "document"
                          ? sortDir === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5" />
                            : <ArrowDown className="w-3.5 h-3.5" />
                          : null}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort("expiryDate")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        EXPIRY DATE
                        {sortBy === "expiryDate"
                          ? sortDir === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5" />
                            : <ArrowDown className="w-3.5 h-3.5" />
                          : null}
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
                        {sortBy === "status"
                          ? sortDir === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5" />
                            : <ArrowDown className="w-3.5 h-3.5" />
                          : null}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedDocuments.length === 0 ? (
                    <tr key="empty">
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500 text-sm"
                      >
                        No documents found for this aircraft
                      </td>
                    </tr>
                  ) : (
                    sortedDocuments.map((doc, index) => {
                      const daysLeft = computeDaysLeft(doc.expiryDate);
                      const status = computeStatus(daysLeft, doc.warningDays);
                      const docId = getDocumentId(doc);
                      return (
                        <tr
                          key={docId ?? `doc-${index}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(doc as any).documentName ??
                              (doc as any).document ??
                              "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doc.expiryDate || "-"}
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
                                onClick={() => docId && handleView(docId)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="View"
                                disabled={!docId}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => docId && handleEdit(docId)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Edit"
                                disabled={!docId}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => docId && handleDelete(docId)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                                disabled={!docId}
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
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <span className="text-sm text-gray-700">
                  Showing{" "}
                  {documents.length > 0
                    ? (currentPage - 1) * itemsPerPage + 1
                    : 0}{" "}
                  to {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                  {totalRecords} entries
                </span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        } disabled:opacity-50`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded disabled:opacity-50"
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
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={resetForm}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDocument ? "Edit Document" : "Add New Entry"}
              </h2>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">
                  DOCUMENT ON BOARD
                </h3>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Aircraft
                </label>
                <p className="text-gray-900 font-medium">
                  {aircraftRegistration || `ID: ${aircraftId}`}
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.documentName}
                  onChange={(e) =>
                    setFormData({ ...formData, documentName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="e.g. Certificate of Airworthiness"
                  required
                />
              </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="e.g., 30"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as DocumentStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {statusEnum.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showEditModal &&
                editingDocument &&
                getDocumentFilePath(editingDocument) && (
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Existing File
                    </label>
                    <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-900 truncate">
                        {extractFilenameFromPath(
                          getDocumentFilePath(editingDocument)!
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadFile(
                            getDocumentFilePath(editingDocument)
                          )
                        }
                        className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-50 text-sm font-medium flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                )}

              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Attach File
                </label>
                {uploadFile || uploadFileName ? (
                  <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-900 truncate">
                      {uploadFileName}
                    </span>
                    {editingDocument &&
                      getDocumentFilePath(editingDocument) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadFile(
                              getDocumentFilePath(editingDocument)
                            )
                          }
                          className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-50 text-sm font-medium flex items-center gap-2"
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="file-upload-aircraft-doc"
                      className="hidden"
                      onChange={(e) =>
                        handleFileChange(e.target.files?.[0] || null)
                      }
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="file-upload-aircraft-doc"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Choose file or drag here
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3 relative">
              {isSaving && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-b-lg">
                  <Spinner />
                </div>
              )}
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                {editingDocument ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => {
              setShowViewModal(false);
              setViewingDocument(null);
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                View Document
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingDocument(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Aircraft
                </label>
                <p className="text-gray-900">
                  {aircraftRegistration || `ID: ${aircraftId}`}
                </p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Document Name
                </label>
                <p className="text-gray-900">
                  {viewingDocument.documentName ??
                    (viewingDocument as any).document ??
                    "-"}
                </p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Description
                </label>
                <p className="text-gray-900">
                  {viewingDocument.description || "-"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Issue Date
                  </label>
                  <p className="text-gray-900">
                    {viewingDocument.issueDate || "-"}
                  </p>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Expiry Date
                  </label>
                  <p className="text-gray-900">
                    {viewingDocument.expiryDate || "-"}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Days Left
                </label>
                <p className="text-gray-900">
                  {formatDaysLeft(
                    computeDaysLeft(viewingDocument.expiryDate),
                    computeStatus(
                      computeDaysLeft(viewingDocument.expiryDate),
                      viewingDocument.warningDays
                    )
                  )}
                </p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Status
                </label>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                    computeStatus(
                      computeDaysLeft(viewingDocument.expiryDate),
                      viewingDocument.warningDays
                    )
                  )}`}
                >
                  {computeStatus(
                    computeDaysLeft(viewingDocument.expiryDate),
                    viewingDocument.warningDays
                  )}
                </span>
              </div>
              {getDocumentFilePath(viewingDocument) && (
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    File
                  </label>
                  <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate flex-1">
                      {extractFilenameFromPath(
                        getDocumentFilePath(viewingDocument)!
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(getDocumentFilePath(viewingDocument))
                      }
                      className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-50 text-sm font-medium flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingDocument(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm"
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
