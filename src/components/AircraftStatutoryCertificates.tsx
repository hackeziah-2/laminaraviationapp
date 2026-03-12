import {
  Search,
  Download,
  Plus,
  ExternalLink,
  X,
  Loader,
  Upload,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import {
  getAircraftStatutoryCertificates,
  createAircraftStatutoryCertificate,
  updateAircraftStatutoryCertificate,
  deleteAircraftStatutoryCertificate,
  downloadStatutoryCertificateFile,
  type AircraftStatutoryCertificate as CertificateType,
} from "../api/aircraftStatutoryCertificatesApi";
import { getAircrafts } from "../api/aircraftApi";
import { Spinner } from "./ui/spinner";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-gray-500 text-sm mb-0.5">{label}</span>
      <span className="text-gray-900 text-sm">{value || "—"}</span>
    </div>
  );
}

/** Backend filter values for aircraft-statutory-certificates */
const CERTIFICATE_TYPE_FILTER = {
  COA: "COA",
  COR: "COR",
  NTC: "NTC",
  PITOT_STATIC: "PITOT_STATIC",
  TRANSPONDER: "TRANSPONDER",
  ELT: "ELT",
  WEIGHT_BALANCE: "WEIGHT_BALANCE",
  COMPASS_SWING: "COMPASS_SWING",
  MARKING_RESERVATION: "MARKING_RESERVATION",
  BINARY_CODE_24BIT: "BINARY_CODE_24BIT",
  IBRD_CORPAS: "IBRD_CORPAS",
} as const;

const CERTIFICATE_TYPE_OPTIONS = Object.entries(CERTIFICATE_TYPE_FILTER).map(
  ([key, value]) => ({
    value,
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  })
);

function getCertificateTypeLabel(value: string | undefined): string {
  if (!value || !value.trim()) return "—";
  const opt = CERTIFICATE_TYPE_OPTIONS.find(
    (o) => o.value === value || o.value.toUpperCase() === value.toUpperCase()
  );
  return opt ? opt.label : value;
}

/** Validate Web Link: empty is allowed (optional); otherwise must be a valid URL (http/https). */
function isValidWebLink(value: string | null | undefined): boolean {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return true;
  try {
    const url = v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Normalize Web Link for API: returns valid URL string or null. Adds https:// if missing. */
function normalizeWebLink(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  try {
    const url = v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/** Normalize any date string to YYYY-MM-DD for <input type="date"> and API payload */
function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const trimmed = dateStr.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AircraftStatutoryCertificates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortBy, setSortBy] = useState<
    "registration" | "makeModel" | "msn" | "expiryDate"
  >("expiryDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [certificates, setCertificates] = useState<CertificateType[]>([]);
  const [aircrafts, setAircrafts] = useState<any[]>([]);
  const [filterCertificateType, setFilterCertificateType] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAircrafts, setLoadingAircrafts] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCertificate, setEditingCertificate] =
    useState<CertificateType | null>(null);
  const [viewingCertificate, setViewingCertificate] =
    useState<CertificateType | null>(null);

  const [formData, setFormData] = useState({
    aircraftId: "",
    certificateType: "",
    expiryDate: "",
    webLink: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const statutoryFileInputRef = useRef<HTMLInputElement>(null);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const filters: { certificate_type?: string } = {};
      if (filterCertificateType.trim())
        filters.certificate_type = filterCertificateType.trim();
      const response = await getAircraftStatutoryCertificates(
        currentPage,
        itemsPerPage,
        searchDebounced,
        Object.keys(filters).length ? filters : undefined
      );
      setCertificates(response.items);
      setTotalRecords(response.total);
      setTotalPages(response.pages);
    } catch (error: any) {
      console.error("Error fetching certificates:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.message ?? "Failed to load certificates.",
      });
      setCertificates([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [currentPage, itemsPerPage, searchDebounced, filterCertificateType]);

  const fetchAircrafts = useCallback(async () => {
    setLoadingAircrafts(true);
    try {
      const response = await getAircrafts(1, 10, "", "");
      const data = response?.data ?? response;
      const list =
        data?.results ??
        data?.items ??
        data?.data ??
        (Array.isArray(data) ? data : []);
      setAircrafts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching aircrafts:", error);
      setAircrafts([]);
    } finally {
      setLoadingAircrafts(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  useEffect(() => {
    fetchAircrafts();
  }, [fetchAircrafts]);

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

  const getCertId = (c: CertificateType | null): number | null => {
    if (!c) return null;
    const id = c.id ?? (c as any).documentId ?? (c as any).document_id;
    return id != null && !isNaN(Number(id)) ? Number(id) : null;
  };

  const getFilePath = (c: CertificateType | null): string | null => {
    if (!c) return null;
    const path =
      c.filePath ?? (c as any).uploadFile ?? (c as any).upload_file ?? (c as any).file_path;
    if (typeof path !== "string" || !path.trim()) return null;
    return path.trim();
  };

  const hasUploadedFile = (c: CertificateType | null): boolean =>
    Boolean(getFilePath(c));

  const getRegistration = (c: CertificateType): string => {
    const ac = c.aircraft;
    if (ac && typeof ac === "object" && (ac as any).registration)
      return (ac as any).registration;
    return (c as any).registration ?? c.registration ?? "-";
  };

  const getMakeModel = (c: CertificateType): string => {
    const ac = c.aircraft;
    if (ac && typeof ac === "object") {
      const type =
        (ac as any).aircraftType ??
        (ac as any).manufacturer ??
        (ac as any).model;
      if (type) return type;
      if ((ac as any).manufacturer && (ac as any).model)
        return `${(ac as any).manufacturer} ${(ac as any).model}`.trim();
    }
    return (c as any).makeModel ?? (c as any).make_model ?? c.makeModel ?? "-";
  };

  const getMsn = (c: CertificateType): string => {
    const ac = c.aircraft;
    if (ac && typeof ac === "object" && (ac as any).msn) return (ac as any).msn;
    return (c as any).msn ?? c.msn ?? "-";
  };

  const formatExpiry = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          });
    } catch {
      return dateStr;
    }
  };

  const extractFilename = (filePath: string): string => {
    let p = filePath;
    if (p.includes("/")) p = p.split("/").pop() || p;
    p = p.split("?")[0];
    return p;
  };

  const handleDownloadFile = async (
    filePath: string | null | undefined,
    fileName?: string,
    certificateId?: number | null
  ) => {
    if (!filePath && (certificateId == null || certificateId <= 0)) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "File path is not available.",
      });
      return;
    }
    try {
      const blob = await downloadStatutoryCertificateFile(
        filePath || "",
        certificateId
      );
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || (filePath ? extractFilename(filePath) : "certificate") || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: error?.message ?? "Failed to download.",
      });
    }
  };

  const filteredCertificates = useMemo(() => {
    let list = [...certificates];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          getRegistration(c).toLowerCase().includes(q) ||
          getMakeModel(c).toLowerCase().includes(q) ||
          getMsn(c).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const regA = getRegistration(a);
      const regB = getRegistration(b);
      const mmA = getMakeModel(a);
      const mmB = getMakeModel(b);
      const msnA = getMsn(a);
      const msnB = getMsn(b);
      const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
      const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
      let cmp = 0;
      if (sortBy === "registration") cmp = regA.localeCompare(regB);
      else if (sortBy === "makeModel") cmp = mmA.localeCompare(mmB);
      else if (sortBy === "msn") cmp = msnA.localeCompare(msnB);
      else cmp = expA - expB;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [certificates, searchQuery, sortBy, sortDir]);

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const handleAddCertificate = () => {
    setFormData({
      aircraftId: "",
      certificateType: "",
      expiryDate: "",
      webLink: "",
    });
    setUploadFile(null);
    setUploadFileName("");
    if (statutoryFileInputRef.current) statutoryFileInputRef.current.value = "";
    setEditingCertificate(null);
    setShowEditModal(false);
    setShowAddModal(true);
  };

  const handleView = (c: CertificateType) => {
    setViewingCertificate(c);
  };

  const handleEdit = (c: CertificateType) => {
    const id = getCertId(c);
    if (!id) return;
    setEditingCertificate(c);
    const ac = c.aircraft;
    const rawExpiry =
      (c as any).expiryDate ??
      c.expiryDate ??
      (c as any).expiry_date ??
      (c as any).date_of_expiration ??
      "";
    setFormData({
      aircraftId:
        c.aircraftId != null
          ? String(c.aircraftId)
          : ac && (ac as any).id
          ? String((ac as any).id)
          : "",
      certificateType:
        (c as any).certificateType ??
        (c as any).certificate_type ??
        c.certificateType ??
        "",
      expiryDate: toDateInputValue(rawExpiry),
      webLink: (c as any).webLink ?? c.webLink ?? "",
    });
    setUploadFile(null);
    setUploadFileName("");
    if (statutoryFileInputRef.current) statutoryFileInputRef.current.value = "";
    setShowAddModal(false);
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
      await deleteAircraftStatutoryCertificate(id);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The certificate has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCertificates();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.message ?? "Failed to delete.",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      aircraftId: "",
      certificateType: "",
      expiryDate: "",
      webLink: "",
    });
    setUploadFile(null);
    setUploadFileName("");
    if (statutoryFileInputRef.current) statutoryFileInputRef.current.value = "";
    setEditingCertificate(null);
    setShowAddModal(false);
    setShowEditModal(false);
  };

  const handleSave = async () => {
    const certType = formData.certificateType?.trim();
    if (!certType) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please select Certificate Type.",
      });
      return;
    }
    const aircraftId = formData.aircraftId
      ? Number(formData.aircraftId)
      : undefined;
    if (!aircraftId && !editingCertificate) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please select an Aircraft.",
      });
      return;
    }
    if (!isValidWebLink(formData.webLink)) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Web Link must be a valid URL (e.g. https://example.com). Paste a link only.",
      });
      return;
    }
    const expiryValue = toDateInputValue(formData.expiryDate);
    if (!expiryValue || !expiryValue.trim()) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Date of Expiration is required.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const aircraftFk =
        aircraftId ??
        editingCertificate?.aircraftId ??
        (editingCertificate?.aircraft as any)?.id ??
        null;
      const expiryForApi = toDateInputValue(formData.expiryDate) || null;
      const payload: Record<string, unknown> = {
        certificate_type: certType,
        category_type: certType,
        aircraft_fk: aircraftFk != null ? Number(aircraftFk) : null,
        expiry_date: expiryForApi,
        date_of_expiration: expiryForApi,
        web_link: normalizeWebLink(formData.webLink),
      };
      if (
        editingCertificate &&
        getFilePath(editingCertificate) &&
        !uploadFile
      ) {
        payload.file_path = getFilePath(editingCertificate);
      }

      // Always send FormData with json_data so backend receives it; upload_file is optional (append only when user selected a file).
      const formDataObj = new FormData();
      formDataObj.append("json_data", JSON.stringify(payload));
      if (uploadFile instanceof File) {
        formDataObj.append("upload_file", uploadFile);
      }
      if (editingCertificate) {
        const certId = getCertId(editingCertificate);
        if (!certId) throw new Error("Invalid certificate ID");
        await updateAircraftStatutoryCertificate(certId, formDataObj);
      } else {
        await createAircraftStatutoryCertificate(formDataObj);
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: editingCertificate
          ? "Certificate updated successfully."
          : "Certificate created successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      resetForm();
      await fetchCertificates();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.message ?? "Failed to save.",
      });
    } finally {
      setTimeout(() => setIsSaving(false), 360);
    }
  };

  const handleFileChange = (file: File | null) => {
    setUploadFile(file);
    setUploadFileName(file ? file.name : "");
    if (!file && statutoryFileInputRef.current) {
      statutoryFileInputRef.current.value = "";
    }
  };

  const isModalOpen = showAddModal || showEditModal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Aircraft Statutory Certificates
          </h2>
          <p className="text-gray-600 mt-1">
            Certificate expiry tracking and document management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            onClick={handleAddCertificate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Certificate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">Search Aircraft</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by registration, model, or MSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className="w-full h-10 pl-10 pr-9 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {loading && (
                <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">
              Filter: Certificate Type
            </p>
            <select
              value={filterCertificateType}
              onChange={(e) => {
                setFilterCertificateType(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loading}
              className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
            >
              <option value="">All Types</option>
              {CERTIFICATE_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
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
                        onClick={() => toggleSort("registration")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        REGISTRATION
                        {sortBy === "registration" &&
                          (sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort("makeModel")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        MAKE/MODEL
                        {sortBy === "makeModel" &&
                          (sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort("msn")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        MSN
                        {sortBy === "msn" &&
                          (sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      CERTIFICATE TYPE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort("expiryDate")}
                        className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                      >
                        DATE OF EXPIRATION
                        {sortBy === "expiryDate" &&
                          (sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      FILE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      WEB LINK
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCertificates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-gray-500 text-sm"
                      >
                        No certificates found
                      </td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert, index) => {
                      const certId = getCertId(cert);
                      const filePath = getFilePath(cert);
                      return (
                        <tr
                          key={certId ?? `cert-${index}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getRegistration(cert)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getMakeModel(cert)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getMsn(cert)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getCertificateTypeLabel(cert.certificateType)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatExpiry(cert.expiryDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {hasUploadedFile(cert) && filePath ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadFile(
                                    filePath,
                                    extractFilename(filePath),
                                    certId
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {(cert as any).webLink ?? (cert as any).web_link ? (
                              <a
                                href={
                                  (cert as any).webLink ?? (cert as any).web_link
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1"
                              >
                                [LINK]
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleView(cert)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                                title="View details"
                                aria-label="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(cert)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {certId && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(certId)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                  aria-label="Delete"
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
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                {totalRecords} certificate(s)
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1.5 text-sm text-gray-700">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages || 1, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Details Modal */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => setViewingCertificate(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                View Certificate Details
              </h2>
              <button
                type="button"
                onClick={() => setViewingCertificate(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <DetailRow
                label="Aircraft Registration"
                value={getRegistration(viewingCertificate)}
              />
              <DetailRow
                label="Make/Model"
                value={getMakeModel(viewingCertificate)}
              />
              <DetailRow label="MSN" value={getMsn(viewingCertificate)} />
              <DetailRow
                label="Certificate Type"
                value={
                  (viewingCertificate as any).certificateType ??
                  (viewingCertificate as any).certificate_type ??
                  viewingCertificate.certificateType ??
                  "—"
                }
              />
              <DetailRow
                label="Expiry Date"
                value={formatExpiry(viewingCertificate.expiryDate)}
              />
              <div>
                <span className="block text-gray-500 text-sm mb-1">File</span>
                {hasUploadedFile(viewingCertificate) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const path = getFilePath(viewingCertificate);
                      const id = getCertId(viewingCertificate);
                      if (path || id != null)
                        handleDownloadFile(path || "", path ? extractFilename(path) : undefined, id);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                ) : (
                  <span className="text-gray-600 text-sm">No file uploaded</span>
                )}
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-1">
                  Web Link
                </span>
                {viewingCertificate.webLink ??
                (viewingCertificate as any).web_link ? (
                  <a
                    href={
                      viewingCertificate.webLink ??
                      (viewingCertificate as any).web_link
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                  >
                    [LINK]
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-gray-600 text-sm">—</span>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingCertificate(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={resetForm}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCertificate
                  ? "Edit Certificate"
                  : "Add New Certificate"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Aircraft Registry <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.aircraftId}
                  onChange={(e) =>
                    setFormData({ ...formData, aircraftId: e.target.value })
                  }
                  disabled={loadingAircrafts}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Aircraft</option>
                  {aircrafts.map((ac) => (
                    <option key={ac.id} value={ac.id}>
                      {ac.registration}{" "}
                      {ac.aircraftType
                        ? `(${ac.aircraftType})`
                        : ac.manufacturer && ac.model
                        ? `(${ac.manufacturer} ${ac.model})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Certificate Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.certificateType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      certificateType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  {CERTIFICATE_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Date of Expiration <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
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
                  Web Link{" "}
                  <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.webLink}
                  onChange={(e) =>
                    setFormData({ ...formData, webLink: e.target.value })
                  }
                  placeholder="https://example.com"
                  className={`w-full px-3 py-2 border rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.webLink.trim() && !isValidWebLink(formData.webLink)
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-gray-300"
                  }`}
                />
                {formData.webLink.trim() && !isValidWebLink(formData.webLink) && (
                  <p className="mt-1 text-xs text-red-600">
                    Enter a valid link only (e.g. https://example.com)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Upload Document{" "}
                  <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <div>
                  <input
                    ref={statutoryFileInputRef}
                    type="file"
                    id="statutory-cert-file"
                    className="hidden"
                    onChange={(e) =>
                      handleFileChange(e.target.files?.[0] ?? null)
                    }
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
                  />
                  <label
                    htmlFor="statutory-cert-file"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between text-sm"
                  >
                    <span
                      className={
                        uploadFileName ? "text-gray-900" : "text-gray-400"
                      }
                    >
                      {uploadFileName || "Choose file or N/A"}
                    </span>
                    <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </label>
                  {uploadFileName && (
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="text-xs text-red-600 hover:text-red-700 mt-1"
                    >
                      Remove file
                    </button>
                  )}
                  {editingCertificate &&
                    getFilePath(editingCertificate) &&
                    !uploadFile && (
                      <div className="flex flex-col gap-1 mt-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                          onClick={() =>
                            handleDownloadFile(
                              getFilePath(editingCertificate),
                              extractFilename(
                                getFilePath(editingCertificate)!
                              ),
                              getCertId(editingCertificate)
                            )
                          }
                        >
                          <Download className="w-4 h-4 flex-shrink-0" />
                          Download current file
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              {isSaving && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-b-lg">
                  <Spinner />
                </div>
              )}
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                Save Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
