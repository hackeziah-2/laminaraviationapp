import {
  Search,
  Download,
  Plus,
  X,
  Loader,
  Loader2,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  Check,
  History,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import {
  getAircraftStatutoryCertificates,
  createAircraftStatutoryCertificate,
  updateAircraftStatutoryCertificate,
  deleteAircraftStatutoryCertificate,
  getAircraftStatutoryCertificateHistoryPaged,
  type AircraftStatutoryCertificate as CertificateType,
  type AircraftStatutoryCertificateHistoryRow,
} from "../api/aircraftStatutoryCertificatesApi";
import { getAircrafts } from "../api/aircraftApi";
import { Spinner } from "./ui/spinner";
import { DataTablePagination } from "./ui/DataTablePagination";
import { LinkButton } from "./ui/LinkButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useUserPermissions } from "../hooks/useUserPermissions";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-gray-500 text-sm mb-0.5">{label}</span>
      <span className="text-gray-900 text-sm">{value || "—"}</span>
    </div>
  );
}

const ASC_HISTORY_PAGE_SIZE = 10;

const ASC_EXPORT_HEADERS = [
  "Registration",
  "Model",
  "MSN",
  "Date of Expiration",
  "Web Link",
] as const;

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
    const url =
      v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
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
    const url =
      v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
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
  const { canUpdate, canCreate, canDelete } = useUserPermissions();
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

  const [historyTarget, setHistoryTarget] = useState<{
    ascHistoryId: number;
    subtitle: string;
  } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRows, setHistoryRows] = useState<
    AircraftStatutoryCertificateHistoryRow[]
  >([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formData, setFormData] = useState({
    aircraftId: "",
    certificateType: "",
    expiryDate: "",
    webLink: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Aircraft Registry searchable dropdown
  const [aircraftSearchTerm, setAircraftSearchTerm] = useState("");
  const [isAircraftDropdownOpen, setIsAircraftDropdownOpen] = useState(false);
  const [selectedAircraftDisplay, setSelectedAircraftDisplay] = useState("");
  const aircraftDropdownRef = useRef<HTMLDivElement>(null);

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

  const fetchAircrafts = useCallback(async (search = "") => {
    setLoadingAircrafts(true);
    try {
      const response = await getAircrafts(1, 100, search, "");
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

  // Refetch aircrafts when dropdown is open and search term changes (debounced)
  const aircraftSearchDebounceRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  useEffect(() => {
    if (!isAircraftDropdownOpen) return;
    if (aircraftSearchDebounceRef.current)
      clearTimeout(aircraftSearchDebounceRef.current);
    aircraftSearchDebounceRef.current = setTimeout(() => {
      fetchAircrafts(aircraftSearchTerm);
    }, 300);
    return () => {
      if (aircraftSearchDebounceRef.current) {
        clearTimeout(aircraftSearchDebounceRef.current);
        aircraftSearchDebounceRef.current = null;
      }
    };
  }, [isAircraftDropdownOpen, aircraftSearchTerm, fetchAircrafts]);

  // Filter aircrafts by registration (client-side for instant list while typing)
  const filteredAircrafts = useMemo(() => {
    const q = aircraftSearchTerm.trim().toLowerCase();
    if (!q) return aircrafts;
    return aircrafts.filter((ac) => {
      const reg = (ac.registration ?? "").toLowerCase();
      const type = (ac.aircraftType ?? ac.manufacturer ?? ac.model ?? "")
        .toString()
        .toLowerCase();
      return reg.includes(q) || type.includes(q);
    });
  }, [aircrafts, aircraftSearchTerm]);

  const getSelectedAircraftDisplay = useCallback(() => {
    if (!formData.aircraftId) return "";
    const ac = aircrafts.find((a) => String(a.id) === formData.aircraftId);
    if (!ac) return "";
    return ac.aircraftType
      ? `${ac.registration ?? ""} (${ac.aircraftType})`
      : (ac.registration ?? "") +
          (ac.manufacturer && ac.model
            ? ` (${ac.manufacturer} ${ac.model})`
            : "");
  }, [formData.aircraftId, aircrafts]);

  const handleAircraftSelect = useCallback(
    (id: number, registration: string, aircraftType?: string) => {
      setFormData((prev) => ({ ...prev, aircraftId: String(id) }));
      setSelectedAircraftDisplay(
        aircraftType ? `${registration} (${aircraftType})` : registration
      );
      setAircraftSearchTerm("");
      setIsAircraftDropdownOpen(false);
    },
    []
  );

  // Close aircraft dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aircraftDropdownRef.current &&
        !aircraftDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAircraftDropdownOpen(false);
      }
    };
    if (isAircraftDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAircraftDropdownOpen]);

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

  /** Path param for aircraft-statutory-certificates-history/{asc_history}/paged */
  const getAscHistoryId = (c: CertificateType): number | null => {
    const fromApi = c.ascHistory;
    if (fromApi != null && fromApi > 0) return fromApi;
    const raw = (c as any).asc_history;
    if (raw != null && !isNaN(Number(raw)) && Number(raw) > 0)
      return Number(raw);
    return getCertId(c);
  };

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

  const openHistoryModal = (cert: CertificateType) => {
    const ascId = getAscHistoryId(cert);
    if (!ascId) {
      Swal.fire({
        icon: "warning",
        title: "Unavailable",
        text: "History is not available for this record.",
      });
      return;
    }
    setHistoryTarget({
      ascHistoryId: ascId,
      subtitle: getRegistration(cert),
    });
    setHistoryPage(1);
  };

  const closeHistoryModal = () => {
    setHistoryTarget(null);
    setHistoryRows([]);
    setHistoryTotal(0);
    setHistoryTotalPages(1);
    setHistoryPage(1);
  };

  useEffect(() => {
    if (!historyTarget) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const res = await getAircraftStatutoryCertificateHistoryPaged(
          historyTarget.ascHistoryId,
          historyPage,
          ASC_HISTORY_PAGE_SIZE
        );
        if (cancelled) return;
        setHistoryRows(res.items);
        setHistoryTotal(res.total);
        setHistoryTotalPages(Math.max(1, res.pages));
      } catch (error: any) {
        if (cancelled) return;
        setHistoryRows([]);
        setHistoryTotal(0);
        setHistoryTotalPages(1);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error?.message ?? "Failed to load history.",
        });
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyTarget?.ascHistoryId, historyPage]);

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

  const handleAscExport = async (format: "csv" | "xlsx") => {
    const exportLimit = Math.max(totalRecords, 1);
    setExportLoading(true);
    try {
      const filters: { certificate_type?: string } = {};
      if (filterCertificateType.trim())
        filters.certificate_type = filterCertificateType.trim();
      const response = await getAircraftStatutoryCertificates(
        1,
        exportLimit,
        searchDebounced,
        Object.keys(filters).length ? filters : undefined
      );
      let list = [...response.items];
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
      if (!list.length) {
        await Swal.fire({
          icon: "info",
          title: "No data to export",
          text: "There are no certificates matching the current filters.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
      const escapeCsvValue = (value: string) =>
        `"${String(value).replace(/"/g, '""')}"`;
      const webStr = (c: CertificateType) =>
        String(c.webLink ?? "").trim();
      const dateStr = (c: CertificateType) => {
        const raw = c.expiryDate;
        if (!raw) return "";
        const disp = formatExpiry(raw);
        return disp === "—" ? "" : disp;
      };
      const dataRows = list.map((c) => [
        getRegistration(c),
        getMakeModel(c),
        getMsn(c),
        dateStr(c),
        webStr(c),
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      const baseName = `aircraft_statutory_certificates_export_${stamp}`;
      if (format === "csv") {
        const headerLine = [...ASC_EXPORT_HEADERS]
          .map(escapeCsvValue)
          .join(",");
        const csvLines = [
          headerLine,
          ...dataRows.map((cells) => cells.map(escapeCsvValue).join(",")),
        ];
        const csvBlob = new Blob(["\uFEFF" + csvLines.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(csvBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseName}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const aoa: string[][] = [[...ASC_EXPORT_HEADERS], ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Certificates");
        XLSX.writeFile(wb, `${baseName}.xlsx`);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not export certificates.";
      await Swal.fire({
        icon: "error",
        title: "Export failed",
        text: message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleAddCertificate = () => {
    setFormData({
      aircraftId: "",
      certificateType: "",
      expiryDate: "",
      webLink: "",
    });
    setSelectedAircraftDisplay("");
    setAircraftSearchTerm("");
    setIsAircraftDropdownOpen(false);
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
    const acId =
      c.aircraftId != null
        ? String(c.aircraftId)
        : ac && (ac as any).id
        ? String((ac as any).id)
        : "";
    setFormData({
      aircraftId: acId,
      certificateType:
        (c as any).certificateType ??
        (c as any).certificate_type ??
        c.certificateType ??
        "",
      expiryDate: toDateInputValue(rawExpiry),
      webLink: (c as any).webLink ?? c.webLink ?? "",
    });
    const reg =
      (ac && (ac as any).registration) ?? (c as any).registration ?? "";
    const type =
      (ac && ((ac as any).aircraftType ?? (ac as any).aircraft_type)) ?? "";
    setSelectedAircraftDisplay(type ? `${reg} (${type})` : reg);
    setAircraftSearchTerm("");
    setIsAircraftDropdownOpen(false);
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
    setSelectedAircraftDisplay("");
    setAircraftSearchTerm("");
    setIsAircraftDropdownOpen(false);
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

      const formDataObj = new FormData();
      formDataObj.append("json_data", JSON.stringify(payload));
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
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      const text =
        status === 409 ? detail ?? "Failed to save." : "Failed to save.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text,
      });
    } finally {
      setTimeout(() => setIsSaving(false), 360);
    }
  };

  const isModalOpen = showAddModal || showEditModal;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Aircraft Statutory Certificates
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Certificate expiry tracking and document management.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={exportLoading || loading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:pointer-events-none"
              >
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-gray-600" />
                )}
                <span className="text-gray-700 hidden sm:inline">Export</span>
                <ChevronDown className="w-4 h-4 shrink-0 text-gray-600 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="min-w-[11rem] border border-gray-200 bg-white p-1 text-gray-900 shadow-xl"
            >
              <DropdownMenuItem
                disabled={exportLoading || loading}
                onSelect={() => void handleAscExport("csv")}
                className="bg-white text-gray-900 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
              >
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportLoading || loading}
                onSelect={() => void handleAscExport("xlsx")}
                className="bg-white text-gray-900 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
              >
                Export XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreate("regulatory-compliance") && (
            <button
              type="button"
              onClick={handleAddCertificate}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Blue Banner */}
      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          AIRCRAFT STATUTORY CERTIFICATES
        </span>
        <span className="text-sm" />
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              Search Certificates
            </label>
            <input
              type="text"
              placeholder="Search by registration, model, or MSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 disabled:opacity-60"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Certificate Type
            </label>
            <select
              value={filterCertificateType}
              onChange={(e) => {
                setFilterCertificateType(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8 disabled:opacity-60"
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
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => toggleSort("registration")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    REGISTRATION
                    {sortBy === "registration" && (
                      <span className="text-blue-600">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => toggleSort("makeModel")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    MAKE/MODEL
                    {sortBy === "makeModel" && (
                      <span className="text-blue-600">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => toggleSort("msn")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    MSN
                    {sortBy === "msn" && (
                      <span className="text-blue-600">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  CERTIFICATE TYPE
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => toggleSort("expiryDate")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    />
                    DATE OF EXPIRATION
                    {sortBy === "expiryDate" && (
                      <span className="text-blue-600">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  WEB LINK
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  HISTORY
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12">
                    <Spinner />
                  </td>
                </tr>
              ) : filteredCertificates.length > 0 ? (
                filteredCertificates.map((cert, index) => {
                  const certId = getCertId(cert);
                  const isWithhold =
                    (cert as CertificateType).isWithhold ??
                    (cert as { is_withhold?: boolean }).is_withhold ??
                    false;
                  const rowBg = isWithhold
                    ? "bg-red-100 hover:bg-red-200"
                    : "hover:bg-gray-50";
                  const cellClass = `px-6 py-3.5 whitespace-nowrap text-sm ${
                    isWithhold ? "text-red-900" : "text-gray-900"
                  }`;
                  return (
                    <tr
                      key={certId ?? `cert-${index}`}
                      className={`${rowBg} transition-colors`}
                    >
                      <td className={`${cellClass} font-medium`}>
                        {getRegistration(cert)}
                      </td>
                      <td className={cellClass}>{getMakeModel(cert)}</td>
                      <td className={cellClass}>{getMsn(cert)}</td>
                      <td className={cellClass}>
                        {getCertificateTypeLabel(cert.certificateType)}
                      </td>
                      <td className={cellClass}>
                        {formatExpiry(cert.expiryDate)}
                      </td>
                      <td className={cellClass}>
                        {(cert as any).webLink ?? (cert as any).web_link ? (
                          <LinkButton
                            href={
                              (cert as any).webLink ?? (cert as any).web_link
                            }
                          />
                        ) : (
                          <span
                            className={
                              isWithhold ? "text-red-600" : "text-gray-400"
                            }
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className={cellClass}>
                        <button
                          type="button"
                          onClick={() => openHistoryModal(cert)}
                          disabled={!getAscHistoryId(cert)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                          title="View change history"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>
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
                          {canUpdate("regulatory-compliance") && (
                            <button
                              type="button"
                              onClick={() => handleEdit(cert)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {certId && canDelete("regulatory-compliance") && (
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
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No certificates found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          currentPage={currentPage}
          totalPages={Math.max(1, totalPages)}
          onPageChange={setCurrentPage}
          totalItems={totalRecords}
          totalLabel="certificates"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          disabled={loading}
        />
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
                <span className="block text-gray-500 text-sm mb-1">
                  Web Link
                </span>
                {viewingCertificate.webLink ??
                (viewingCertificate as any).web_link ? (
                  <LinkButton
                    href={
                      viewingCertificate.webLink ??
                      (viewingCertificate as any).web_link
                    }
                    className="text-sm"
                  />
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

      {/* Certificate history (paged) */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={closeHistoryModal}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Certificate history
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {historyTarget.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {historyLoading ? (
                <div className="py-12 flex justify-center">
                  <Spinner />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Date of expiration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Web link
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Created at
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No history entries
                          </td>
                        </tr>
                      ) : (
                        historyRows.map((row, idx) => (
                          <tr
                            key={`${row.createdAt ?? ""}-${idx}`}
                            className="hover:bg-gray-50/80"
                          >
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                              {formatExpiry(row.dateOfExpiration)}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {row.webLink ? (
                                <LinkButton
                                  href={row.webLink}
                                  className="text-sm"
                                />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                              {formatExpiry(row.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 bg-white px-6 py-3">
              <DataTablePagination
                currentPage={historyPage}
                totalPages={Math.max(1, historyTotalPages)}
                onPageChange={setHistoryPage}
                totalItems={historyTotal}
                totalLabel="entries"
                itemsPerPage={ASC_HISTORY_PAGE_SIZE}
                disabled={historyLoading}
                showRangeText
              />
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
                <div className="relative" ref={aircraftDropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        isAircraftDropdownOpen
                          ? aircraftSearchTerm
                          : selectedAircraftDisplay ||
                            getSelectedAircraftDisplay()
                      }
                      onChange={(e) => {
                        setAircraftSearchTerm(e.target.value);
                        setIsAircraftDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setIsAircraftDropdownOpen(true);
                        setAircraftSearchTerm("");
                      }}
                      placeholder="Search by registration..."
                      disabled={loadingAircrafts}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    />
                    <button
                      type="button"
                      onClick={() => setIsAircraftDropdownOpen((open) => !open)}
                      disabled={loadingAircrafts}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-70"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isAircraftDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                  {isAircraftDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {loadingAircrafts ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          Loading aircrafts...
                        </div>
                      ) : filteredAircrafts.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {aircraftSearchTerm
                            ? "No aircraft found"
                            : "No aircraft available"}
                        </div>
                      ) : (
                        <ul className="py-1">
                          {filteredAircrafts.map((ac) => {
                            const display = ac.aircraftType
                              ? `${ac.registration ?? ""} (${ac.aircraftType})`
                              : (ac.registration ?? "") +
                                (ac.manufacturer && ac.model
                                  ? ` (${ac.manufacturer} ${ac.model})`
                                  : "");
                            const isSelected =
                              formData.aircraftId === String(ac.id);
                            return (
                              <li
                                key={ac.id}
                                onClick={() =>
                                  handleAircraftSelect(
                                    ac.id,
                                    ac.registration ?? "",
                                    ac.aircraftType ??
                                      (ac.manufacturer && ac.model
                                        ? `${ac.manufacturer} ${ac.model}`
                                        : undefined)
                                  )
                                }
                                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between text-sm ${
                                  isSelected ? "bg-blue-50" : ""
                                }`}
                              >
                                <span className="text-gray-900">{display}</span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
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
                {formData.webLink.trim() &&
                  !isValidWebLink(formData.webLink) && (
                    <p className="mt-1 text-xs text-red-600">
                      Enter a valid link only (e.g. https://example.com)
                    </p>
                  )}
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
              {((!editingCertificate &&
                canCreate("regulatory-compliance")) ||
                (editingCertificate &&
                  canUpdate("regulatory-compliance"))) && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                  Save Document
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
