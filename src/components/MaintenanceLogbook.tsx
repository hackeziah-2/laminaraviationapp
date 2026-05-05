import {
  ArrowLeft,
  Search,
  Download,
  Printer,
  Plus,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
  Check,
  Loader,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getAccountsByDesignation,
  getAllAccounts,
  Account,
} from "../api/accountApi";
import { getAircraftById } from "../api/aircraftApi";
import { Aircraft } from "../types/Aircraft";
import { toCamel } from "../utility/utils";
import {
  getEngineLogbooks,
  getAirframeLogbooks,
  getAvionicsLogbooks,
  getPropellerLogbooks,
  getEngineLogbookById,
  getAirframeLogbookById,
  getAvionicsLogbookById,
  getPropellerLogbookById,
  createEngineLogbook,
  createAirframeLogbook,
  createAvionicsLogbook,
  createPropellerLogbook,
  updateEngineLogbook,
  updateAirframeLogbook,
  updateAvionicsLogbook,
  updatePropellerLogbook,
  deleteEngineLogbook,
  deleteAirframeLogbook,
  deleteAvionicsLogbook,
  deletePropellerLogbook,
  EngineLogbook,
  AirframeLogbook,
  AvionicsLogbook,
  PropellerLogbook,
  EngineLogbookCreate,
  AirframeLogbookCreate,
  AvionicsLogbookCreate,
  PropellerLogbookCreate,
  type ComponentPart,
  type Mechanic,
} from "../api/logbooksApi";
import { Spinner } from "./ui/spinner";
import { DataTablePagination } from "./ui/DataTablePagination";
import { snakeAllKeys } from "../utility/utils";
import apiClient from "../api/index";
import { useUserPermissions } from "../hooks/useUserPermissions";

interface LogEntry {
  id: number;
  date: string;
  workOrder: string;
  description: string;
  maintenanceType: string;
  technician: string;
  hours: number;
  status: "Completed" | "In Progress" | "Pending";
  category: "AIRFRAME" | "AVIONICS" | "ENGINE" | "PROPELLER";
}

interface AirframeLogEntry {
  id: number;
  date: string;
  tachTime: number;
  sequenceNo: string;
  airframeTime: number;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

interface AvionicsLogEntry {
  id: number;
  date: string;
  sequenceNo: string;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

interface EngineLogEntry {
  id: number;
  date: string;
  tachTime: number;
  sequenceNo: string;
  engineTime: number;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

interface PropellerLogEntry {
  id: number;
  date: string;
  sequenceNo: string;
  propellerTime: number;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

type Category = "AIRFRAME" | "AVIONICS" | "ENGINE" | "PROPELLER";

// Prefer nested mechanic object (json_data pattern), then accountsMap, then flat mechanicName/licenseNumber
function getMechanicDisplay(
  entry: {
    mechanic?: Mechanic;
    mechanicFk?: number;
    mechanicName?: string;
    licenseNumber?: string;
  },
  accountsMap?: Map<number, { fullName: string; licenseNo: string }>
): string {
  if (entry.mechanic) {
    const name = [
      entry.mechanic.firstName,
      entry.mechanic.middleName,
      entry.mechanic.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const lic = entry.mechanic.licenseNo || "";
    return lic ? `${name}-${lic}` : name || "-";
  }
  if (entry.mechanicFk && accountsMap?.has(entry.mechanicFk)) {
    const a = accountsMap.get(entry.mechanicFk)!;
    return `${a.fullName}-${a.licenseNo}`;
  }
  if (entry.mechanicName && entry.licenseNumber)
    return `${entry.mechanicName}-${entry.licenseNumber}`;
  return entry.mechanicName || entry.licenseNumber || "-";
}

export function MaintenanceLogbook() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canUpdate, canCreate, canDelete } = useUserPermissions();
  const aircraftId = parseInt(id || "1");

  const handleBack = () => {
    navigate("/profile");
  };

  const [activeCategory, setActiveCategory] = useState<Category>("AIRFRAME");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State for logbook entries
  const [airframeLogEntries, setAirframeLogEntries] = useState<
    AirframeLogbook[]
  >([]);
  const [avionicsLogEntries, setAvionicsLogEntries] = useState<
    AvionicsLogbook[]
  >([]);
  const [engineLogEntries, setEngineLogEntries] = useState<EngineLogbook[]>([]);
  const [propellerLogEntries, setPropellerLogEntries] = useState<
    PropellerLogbook[]
  >([]);

  // State for totals and pagination
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accounts map for mechanic lookup
  const [accountsMap, setAccountsMap] = useState<Map<number, Account>>(
    new Map()
  );

  // Aircraft state
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);

  // Selected entries for view modal
  const [selectedAirframeEntry, setSelectedAirframeEntry] =
    useState<AirframeLogbook | null>(null);
  const [selectedAvionicsEntry, setSelectedAvionicsEntry] =
    useState<AvionicsLogbook | null>(null);
  const [selectedEngineEntry, setSelectedEngineEntry] =
    useState<EngineLogbook | null>(null);
  const [selectedPropellerEntry, setSelectedPropellerEntry] =
    useState<PropellerLogbook | null>(null);

  // File view modal state
  const [showImageViewModal, setShowImageViewModal] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [viewingFilePath, setViewingFilePath] = useState<string | null>(null);

  // Modal states
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<
    EngineLogbook | AirframeLogbook | AvionicsLogbook | PropellerLogbook | null
  >(null);

  // Fetch aircraft information
  useEffect(() => {
    const fetchAircraft = async () => {
      if (!aircraftId) return;
      try {
        const response = await getAircraftById(aircraftId);
        setAircraft(toCamel(response.data));
      } catch (err) {
        console.error("Error fetching aircraft:", err);
      }
    };
    fetchAircraft();
  }, [aircraftId]);

  // Fetch all accounts for mechanic lookup
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accountsList = await getAllAccounts();
        // Create a map for quick lookup
        const map = new Map<number, Account>();
        accountsList.forEach((account) => {
          map.set(account.id, account);
        });
        setAccountsMap(map);
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch logbook entries from API using useCallback
  const fetchLogbooks = useCallback(async () => {
    if (!aircraftId) return;

    setLoading(true);
    setError(null);

    try {
      switch (activeCategory) {
        case "AIRFRAME":
          const airframeResponse = await getAirframeLogbooks(
            currentPage,
            itemsPerPage,
            searchQuery,
            aircraftId
          );
          setAirframeLogEntries(airframeResponse.items);
          setTotalRecords(airframeResponse.total);
          setTotalPages(airframeResponse.pages);
          break;
        case "AVIONICS":
          const avionicsResponse = await getAvionicsLogbooks(
            currentPage,
            itemsPerPage,
            searchQuery,
            aircraftId
          );
          setAvionicsLogEntries(avionicsResponse.items);
          setTotalRecords(avionicsResponse.total);
          setTotalPages(avionicsResponse.pages);
          break;
        case "ENGINE":
          const engineResponse = await getEngineLogbooks(
            currentPage,
            itemsPerPage,
            searchQuery,
            aircraftId
          );
          setEngineLogEntries(engineResponse.items);
          setTotalRecords(engineResponse.total);
          setTotalPages(engineResponse.pages);
          break;
        case "PROPELLER":
          const propellerResponse = await getPropellerLogbooks(
            currentPage,
            itemsPerPage,
            searchQuery,
            aircraftId
          );
          setPropellerLogEntries(propellerResponse.items);
          setTotalRecords(propellerResponse.total);
          setTotalPages(propellerResponse.pages);
          break;
      }
    } catch (err: any) {
      console.error("Error fetching logbooks:", err);
      setError("Failed to load logbook entries");
      setAirframeLogEntries([]);
      setAvionicsLogEntries([]);
      setEngineLogEntries([]);
      setPropellerLogEntries([]);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [activeCategory, currentPage, searchQuery, aircraftId, itemsPerPage]);

  // Reset to page 1 when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Fetch logbooks when dependencies change
  useEffect(() => {
    fetchLogbooks();
  }, [fetchLogbooks]);

  // Reset to page 1 when search query or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  // Get current entries based on active category
  const getCurrentEntries = () => {
    switch (activeCategory) {
      case "AIRFRAME":
        return airframeLogEntries;
      case "AVIONICS":
        return avionicsLogEntries;
      case "ENGINE":
        return engineLogEntries;
      case "PROPELLER":
        return propellerLogEntries;
      default:
        return [];
    }
  };

  const currentEntries = getCurrentEntries();

  // Format date from YYYY-MM-DD to DD/MMM/YYYY
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ];
      const day = date.getDate().toString().padStart(2, "0");
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Handle delete entry
  const handleDelete = async (entryId: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        switch (activeCategory) {
          case "AIRFRAME":
            await deleteAirframeLogbook(entryId);
            break;
          case "AVIONICS":
            await deleteAvionicsLogbook(entryId);
            break;
          case "ENGINE":
            await deleteEngineLogbook(entryId);
            break;
          case "PROPELLER":
            await deletePropellerLogbook(entryId);
            break;
        }

        Swal.fire("Deleted!", "The entry has been deleted.", "success");

        // Set loading to true immediately to show spinner during refresh
        setLoading(true);

        // Refresh the list using fetchLogbooks callback
        await fetchLogbooks();
      } catch (err: any) {
        console.error("Error deleting entry:", err);
        Swal.fire("Error!", "Failed to delete the entry.", "error");
      }
    }
  };

  // Handle edit entry
  const handleEdit = async (entryId: number) => {
    try {
      let entry:
        | EngineLogbook
        | AirframeLogbook
        | AvionicsLogbook
        | PropellerLogbook
        | null = null;

      switch (activeCategory) {
        case "AIRFRAME":
          entry = await getAirframeLogbookById(entryId);
          break;
        case "AVIONICS":
          entry = await getAvionicsLogbookById(entryId);
          break;
        case "ENGINE":
          entry = await getEngineLogbookById(entryId);
          break;
        case "PROPELLER":
          entry = await getPropellerLogbookById(entryId);
          break;
      }

      if (entry) {
        setEditingEntry(entry);
        setShowEditEntryModal(true);
      }
    } catch (err: any) {
      console.error("Error fetching entry:", err);
      Swal.fire("Error!", "Failed to load entry details.", "error");
    }
  };

  // Handle view entry
  const handleView = async (entryId: number) => {
    try {
      switch (activeCategory) {
        case "AIRFRAME":
          const airframeEntry = await getAirframeLogbookById(entryId);
          setSelectedAirframeEntry(airframeEntry);
          break;
        case "AVIONICS":
          const avionicsEntry = await getAvionicsLogbookById(entryId);
          setSelectedAvionicsEntry(avionicsEntry);
          break;
        case "ENGINE":
          const engineEntry = await getEngineLogbookById(entryId);
          setSelectedEngineEntry(engineEntry);
          break;
        case "PROPELLER":
          const propellerEntry = await getPropellerLogbookById(entryId);
          setSelectedPropellerEntry(propellerEntry);
          break;
      }
    } catch (err: any) {
      console.error("Error fetching entry:", err);
      Swal.fire("Error!", "Failed to load entry details.", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 border border-green-300";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      case "Pending":
        return "bg-orange-100 text-orange-800 border border-orange-300";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const categories: Category[] = [
    "AIRFRAME",
    "AVIONICS",
    "ENGINE",
    "PROPELLER",
  ];

  // Get count for each category (use totalRecords for active category, fetch others if needed)
  const getCategoryCount = (category: Category) => {
    if (category === activeCategory) {
      return totalRecords;
    }
    // For inactive categories, return 0 or fetch count separately if needed
    return 0;
  };

  // Form state for Add/Edit modal
  const [formData, setFormData] = useState({
    date: "",
    sequenceNo: "",
    tachTime: "",
    airframeTime: "",
    engineTime: "",
    propellerTime: "",
    // Engine fields
    engineTsn: "",
    engineTso: "",
    engineTbo: "",
    // Propeller fields
    propellerTsn: "",
    propellerTso: "",
    propellerTbo: "",
    // Avionics fields
    airframeTsn: "",
    component: "",
    partNo: "",
    serialNo: "",
    description: "",
    mechanicFk: "",
    mechanicName: "",
    licenseNumber: "",
    signature: "",
  });

  // Mechanic accounts dropdown state
  const [mechanicAccounts, setMechanicAccounts] = useState<Account[]>([]);
  const [mechanicSearchTerm, setMechanicSearchTerm] = useState("");
  const [isMechanicDropdownOpen, setIsMechanicDropdownOpen] = useState(false);
  const [loadingMechanicAccounts, setLoadingMechanicAccounts] = useState(false);
  const [debouncedMechanicSearch, setDebouncedMechanicSearch] = useState("");
  const mechanicDropdownRef = useRef<HTMLDivElement>(null);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [existingUploadFile, setExistingUploadFile] = useState<string | null>(
    null
  );

  // Component records (for Airframe, Avionics, Engine – Create/Update/Read) – matches backend component_parts schema
  interface ComponentRecordRow {
    id: string; // for UI list keys
    dbId?: number; // the real backend ID
    qty: string;
    unit: string;
    nomenclature: string;
    removedPartNo: string;
    removedSerialNo: string;
    installedPartNo: string;
    installedSerialNo: string;
    ataChapter: string;
  }
  const [componentRecords, setComponentRecords] = useState<
    ComponentRecordRow[]
  >([]);
  const addComponentRecord = () => {
    setComponentRecords((prev) => [
      ...prev,
      {
        id: `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        qty: "",
        unit: "",
        nomenclature: "",
        removedPartNo: "",
        removedSerialNo: "",
        installedPartNo: "",
        installedSerialNo: "",
        ataChapter: "",
      },
    ]);
  };
  const removeComponentRecord = (id: string) => {
    setComponentRecords((prev) => prev.filter((r) => r.id !== id));
  };
  const updateComponentRecord = (
    id: string,
    field: keyof ComponentRecordRow,
    value: string
  ) => {
    setComponentRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Debounce mechanic search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMechanicSearch(mechanicSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [mechanicSearchTerm]);

  // Fetch mechanic accounts when dropdown opens or search changes
  useEffect(() => {
    if (isMechanicDropdownOpen) {
      fetchMechanicAccounts(debouncedMechanicSearch);
    }
  }, [debouncedMechanicSearch, isMechanicDropdownOpen]);

  // Fetch mechanic accounts
  const fetchMechanicAccounts = async (search: string = "") => {
    setLoadingMechanicAccounts(true);
    try {
      const accounts = await getAccountsByDesignation(
        ["Maintenance Engineer", "Mechanic"],
        search
      );
      console.log("Fetched mechanic accounts:", accounts);
      setMechanicAccounts(accounts);
    } catch (err) {
      console.error("Error fetching mechanic accounts:", err);
      setMechanicAccounts([]);
    } finally {
      setTimeout(() => setLoadingMechanicAccounts(false), 360);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mechanicDropdownRef.current &&
        !mechanicDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMechanicDropdownOpen(false);
      }
    };

    if (isMechanicDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMechanicDropdownOpen]);

  // Get selected mechanic display text (matching ATL pattern)
  const getSelectedMechanic = () => {
    if (!formData.mechanicFk) return "";
    const selectedAccount = mechanicAccounts.find(
      (account) => account.id.toString() === formData.mechanicFk
    );
    if (selectedAccount) {
      return `${selectedAccount.fullName}-${selectedAccount.licenseNo}`;
    }
    // Fallback to formData values if account not found in list yet
    if (formData.mechanicName || formData.licenseNumber) {
      return `${formData.mechanicName || ""}${
        formData.mechanicName && formData.licenseNumber ? "-" : ""
      }${formData.licenseNumber || ""}`;
    }
    return "";
  };

  // Helper function to construct file URL
  const getFileUrl = (filePath: string | undefined | null): string | null => {
    if (!filePath) return null;
    const baseUrl =
      (import.meta as any).env?.VITE_API_URL || "http://localhost:8000/api/v1";
    if (filePath.startsWith("http")) {
      return filePath;
    }
    // If it's a relative path, construct full URL
    if (filePath.startsWith("/")) {
      return `${baseUrl}${filePath}`;
    } else if (filePath.startsWith("uploads/")) {
      return `${baseUrl}/${filePath}`;
    } else {
      return `${baseUrl}/uploads/${filePath}`;
    }
  };

  // Helper function to get file type from extension
  const getFileType = (filePath: string | undefined | null): string => {
    if (!filePath) return "unknown";
    const extension = filePath.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    } else if (["doc", "docx"].includes(extension)) {
      return "document";
    }
    return "unknown";
  };

  // Helper function to extract filename from file path
  const extractFilenameFromPath = (filePath: string): string => {
    // Remove leading slashes and base URL if present
    let cleanPath = filePath;

    // If it's a full URL, extract just the path
    if (filePath.includes("/")) {
      // Get the last part after the last slash
      cleanPath = filePath.split("/").pop() || filePath;
    }

    // Remove query parameters if any
    cleanPath = cleanPath.split("?")[0];

    return cleanPath;
  };

  const getExistingUploadDisplayName = (
    filePath: string | undefined | null
  ): string => {
    if (!filePath) return "";
    return extractFilenameFromPath(filePath);
  };

  // Helper function to handle file download
  const handleFileDownload = async (
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
      // Extract filename from path
      const downloadFileName =
        fileName || extractFilenameFromPath(filePath) || "download";

      // Extract the file path for the download endpoint
      // Remove base URL, leading slashes, and "uploads/" prefix if present
      let filePathForEndpoint = filePath;

      // If it's a full URL, extract the path part
      if (filePath.startsWith("http")) {
        const url = new URL(filePath);
        filePathForEndpoint = url.pathname;
      }

      // Remove leading slash and base path prefixes
      filePathForEndpoint = filePathForEndpoint.replace(/^\/+/, "");
      filePathForEndpoint = filePathForEndpoint.replace(/^api\/v1\//, "");
      filePathForEndpoint = filePathForEndpoint.replace(/^uploads\//, "");

      // Construct download endpoint: /api/v1/logbooks/download/{filename:path}
      const downloadEndpoint = `logbooks/download/${filePathForEndpoint}`;

      // Use apiClient to download the file (handles authentication automatically)
      const response = await apiClient.get(downloadEndpoint, {
        responseType: "blob",
        headers: {
          Accept: "application/octet-stream",
        },
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("Error downloading file:", error);

      // Show error message
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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (showAddEntryModal || showEditEntryModal) {
      // Always fetch mechanic accounts when modal opens
      fetchMechanicAccounts("");

      if (editingEntry) {
        // Populate form with editing entry data
        setFormData({
          date: editingEntry.date || "",
          sequenceNo: editingEntry.sequenceNo || "",
          tachTime: (editingEntry as any).tachTime?.toString() || "",
          airframeTime:
            (editingEntry as AirframeLogbook).airframeTime?.toString() || "",
          engineTime: (editingEntry as any).engineTime?.toString() || "",
          propellerTime: (editingEntry as any).propellerTime?.toString() || "",
          // Engine fields
          engineTsn: (editingEntry as any).engineTsn?.toString() || "",
          engineTso: (editingEntry as any).engineTso?.toString() || "",
          engineTbo: (editingEntry as any).engineTbo?.toString() || "",
          // Propeller fields
          propellerTsn: (editingEntry as any).propellerTsn?.toString() || "",
          propellerTso: (editingEntry as any).propellerTso?.toString() || "",
          propellerTbo: (editingEntry as any).propellerTbo?.toString() || "",
          // Avionics fields
          airframeTsn: (editingEntry as any).airframeTsn?.toString() || "",
          component: (editingEntry as any).component || "",
          partNo: (editingEntry as any).partNo || "",
          serialNo: (editingEntry as any).serialNo || "",
          description: editingEntry.description || "",
          mechanicFk: editingEntry.mechanicFk?.toString() || "",
          mechanicName: (
            editingEntry as AirframeLogbook | AvionicsLogbook | EngineLogbook
          ).mechanic
            ? [
                (editingEntry as any).mechanic?.firstName,
                (editingEntry as any).mechanic?.middleName,
                (editingEntry as any).mechanic?.lastName,
              ]
                .filter(Boolean)
                .join(" ")
                .trim()
            : editingEntry.mechanicName || "",
          licenseNumber:
            (editingEntry as any).mechanic?.licenseNo ??
            editingEntry.licenseNumber ??
            "",
          signature: editingEntry.signature || "",
        });
        // Set existing file info for editing
        const existingFile = (editingEntry as any).uploadFile;
        setExistingUploadFile(existingFile || null);
        if (existingFile) {
          // Extract filename from path if it's a URL
          const fileName = existingFile.includes("/")
            ? existingFile.split("/").pop() || "Existing file"
            : existingFile;
          setUploadFileName(fileName);
        } else {
          setUploadFileName("");
        }
        setUploadFile(null); // No new file selected yet
        const entryWithParts = editingEntry as
          | AirframeLogbook
          | AvionicsLogbook
          | EngineLogbook;
        const parts = entryWithParts.componentParts;
        if (Array.isArray(parts) && parts.length > 0) {
          setComponentRecords(
            parts.map((p: ComponentPart, i: number) => {
              const sn = p as unknown as Record<string, unknown>;
              return {
                id: `cr-edit-${i}-${p.id ?? i}`,
                dbId: p.id,
                qty: String(p.qty ?? ""),
                unit: p.unit ?? "",
                nomenclature: p.nomenclature ?? "",
                removedPartNo: String(
                  p.removedPartNo ?? sn.removed_part_no ?? ""
                ),
                removedSerialNo: String(
                  p.removedSerialNo ?? sn.removed_serial_no ?? ""
                ),
                installedPartNo: String(
                  p.installedPartNo ?? sn.installed_part_no ?? ""
                ),
                installedSerialNo: String(
                  p.installedSerialNo ?? sn.installed_serial_no ?? ""
                ),
                ataChapter: String(p.ataChapter ?? sn.ata_chapter ?? ""),
              };
            })
          );
        } else {
          setComponentRecords([]);
        }
      } else {
        // Reset form for new entry
        setFormData({
          date: "",
          sequenceNo: "",
          tachTime: "",
          airframeTime: "",
          engineTime: "",
          propellerTime: "",
          // Engine fields
          engineTsn: "",
          engineTso: "",
          engineTbo: "",
          // Propeller fields
          propellerTsn: "",
          propellerTso: "",
          propellerTbo: "",
          // Avionics fields
          airframeTsn: "",
          component: "",
          partNo: "",
          serialNo: "",
          description: "",
          mechanicFk: "",
          mechanicName: "",
          licenseNumber: "",
          signature: "",
        });
        setMechanicSearchTerm("");
        setIsMechanicDropdownOpen(false);
        setUploadFile(null);
        setUploadFileName("");
        setExistingUploadFile(null);
        setComponentRecords([]);
      }
    } else {
      // Reset when modal closes
      setMechanicAccounts([]);
      setComponentRecords([]);
      setMechanicSearchTerm("");
      setIsMechanicDropdownOpen(false);
      setUploadFile(null);
      setUploadFileName("");
      setExistingUploadFile(null);
    }
  }, [showAddEntryModal, showEditEntryModal, editingEntry]);

  // Handle save entry
  const handleSaveEntry = async () => {
    setIsSaving(true);
    try {
      // Validate file if uploaded
      if (uploadFile) {
        // Check file size (10MB = 10 * 1024 * 1024 bytes)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (uploadFile.size > maxSize) {
          Swal.fire({
            icon: "error",
            title: "File Too Large",
            text: "File size must be less than 10MB. Please choose a smaller file.",
          });
          return;
        }

        // Check file type
        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/jpeg",
          "image/jpg",
          "image/png",
        ];
        const allowedExtensions = [
          ".pdf",
          ".doc",
          ".docx",
          ".jpg",
          ".jpeg",
          ".png",
        ];
        const fileExtension =
          "." + uploadFile.name.split(".").pop()?.toLowerCase();

        if (
          !allowedTypes.includes(uploadFile.type) &&
          !allowedExtensions.includes(fileExtension)
        ) {
          Swal.fire({
            icon: "error",
            title: "Invalid File Type",
            text: "Please upload a PDF, DOC, DOCX, JPG, or PNG file.",
          });
          return;
        }
      }

      // Get selected mechanic account details
      const selectedMechanic = mechanicAccounts.find(
        (account) => account.id.toString() === formData.mechanicFk
      );

      // aircraft_fk is required for create and must be sent for update (backend expects it)
      const baseData: any = {
        sequenceNo: formData.sequenceNo || undefined,
        description: formData.description || undefined,
        mechanicFk: formData.mechanicFk
          ? parseInt(formData.mechanicFk)
          : undefined,
        mechanicName:
          selectedMechanic?.fullName || formData.mechanicName || undefined,
        licenseNumber:
          selectedMechanic?.licenseNo || formData.licenseNumber || undefined,
        signature: formData.signature || undefined,
      };

      // Include aircraft_fk for both create and update (required by backend)
      baseData.aircraftFk =
        editingEntry != null
          ? (editingEntry as any).aircraftFk ??
            (editingEntry as any).aircraft_fk ??
            aircraftId
          : aircraftId;

      // Only include date when creating (not updating); backend may not allow date updates
      if (!editingEntry) {
        if (formData.date && formData.date.trim() !== "") {
          baseData.date = formData.date;
        }
      }

      let data: any;

      switch (activeCategory) {
        case "AIRFRAME":
          data = {
            ...baseData,
            tachTime: formData.tachTime
              ? parseFloat(formData.tachTime)
              : undefined,
            airframeTime: formData.airframeTime
              ? parseFloat(formData.airframeTime)
              : undefined,
          };
          break;
        case "AVIONICS":
          data = {
            ...baseData,
            airframeTsn: formData.airframeTsn
              ? parseFloat(formData.airframeTsn)
              : undefined,
            component: formData.component || undefined,
            partNo: formData.partNo || undefined,
            serialNo: formData.serialNo || undefined,
          };
          break;
        case "ENGINE":
          data = {
            ...baseData,
            engineTsn: formData.engineTsn
              ? parseFloat(formData.engineTsn)
              : undefined,
            tachTime: formData.tachTime
              ? parseFloat(formData.tachTime)
              : undefined,
            engineTso: formData.engineTso
              ? parseFloat(formData.engineTso)
              : undefined,
            engineTbo: formData.engineTbo
              ? parseFloat(formData.engineTbo)
              : undefined,
          };
          break;
        case "PROPELLER":
          data = {
            ...baseData,
            propellerTsn: formData.propellerTsn
              ? parseFloat(formData.propellerTsn)
              : undefined,
            tachTime: formData.tachTime
              ? parseFloat(formData.tachTime)
              : undefined,
            propellerTso: formData.propellerTso
              ? parseFloat(formData.propellerTso)
              : undefined,
            propellerTbo: formData.propellerTbo
              ? parseFloat(formData.propellerTbo)
              : undefined,
          };
          break;
      }

      // Remove undefined and null values, but keep empty strings for optional fields
      // Keep 0 values for numbers as they are valid
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([key, v]) => {
          if (v === undefined || v === null) return false;
          // Keep numbers including 0
          if (typeof v === "number") return true;
          // Keep boolean values
          if (typeof v === "boolean") return true;
          // For strings, filter out empty strings except for specific text fields
          if (typeof v === "string") {
            // Keep empty strings for description, component, partNo, serialNo, signature, sequenceNo
            if (
              [
                "description",
                "component",
                "partNo",
                "serialNo",
                "signature",
                "sequenceNo",
              ].includes(key)
            ) {
              return true;
            }
            // Filter out empty strings for other fields
            return v.trim() !== "";
          }
          return true;
        })
      );

      // If mechanic_fk is present, don't send mechanic_name and license_number
      // The backend should derive these from mechanic_fk
      if (cleanData.mechanicFk) {
        delete cleanData.mechanicName;
        delete cleanData.licenseNumber;
      }

      // Convert to snake_case
      const apiDataSnake = snakeAllKeys(cleanData);

      // Build component_parts for Airframe, Avionics, Engine (always send key so backend persists it)
      const isComponentCategory =
        activeCategory === "AIRFRAME" ||
        activeCategory === "AVIONICS" ||
        activeCategory === "ENGINE";
      // Backend schema: qty (number), unit, nomenclature, removed_part_no, removed_serial_no, installed_part_no, installed_serial_no, ata_chapter
      const componentPartsPayload = isComponentCategory
        ? componentRecords.map((r) => {
            const payload: Record<string, any> = {
              qty: (() => {
                const n = parseFloat(r.qty);
                return Number.isFinite(n) ? n : 0;
              })(),
              unit: r.unit || "",
              nomenclature: r.nomenclature || "",
              removed_part_no: r.removedPartNo || "",
              removed_serial_no: r.removedSerialNo || "",
              installed_part_no: r.installedPartNo || "",
              installed_serial_no: r.installedSerialNo || "",
              ata_chapter: r.ataChapter || "",
            };
            if (r.dbId !== undefined) {
              payload.id = r.dbId;
            }
            return payload;
          })
        : [];

      if (isComponentCategory) {
        (apiDataSnake as Record<string, unknown>).component_parts =
          componentPartsPayload;
      }

      // For JSON updates (no file), ensure we don't send empty strings except for allowed fields (only top-level; do not touch component_parts)
      if (!uploadFile) {
        const allowedEmptyStringFields = [
          "description",
          "component",
          "part_no",
          "serial_no",
          "signature",
          "sequence_no",
        ];
        Object.keys(apiDataSnake).forEach((key) => {
          const value = apiDataSnake[key];
          if (key === "component_parts") return; // keep component_parts as-is
          if (
            typeof value === "string" &&
            value.trim() === "" &&
            !allowedEmptyStringFields.includes(key)
          ) {
            delete apiDataSnake[key];
          }
        });
      }

      // Backend expects FormData with json_data only (component_parts inside json_data)
      const formDataObj = new FormData();
      formDataObj.append("json_data", JSON.stringify(apiDataSnake));
      if (uploadFile) {
        formDataObj.append("upload_file", uploadFile);
      }

      if (editingEntry) {
        switch (activeCategory) {
          case "AIRFRAME":
            await updateAirframeLogbook(editingEntry.id, formDataObj as any);
            break;
          case "AVIONICS":
            await updateAvionicsLogbook(editingEntry.id, formDataObj as any);
            break;
          case "ENGINE":
            await updateEngineLogbook(editingEntry.id, formDataObj as any);
            break;
          case "PROPELLER":
            await updatePropellerLogbook(editingEntry.id, formDataObj as any);
            break;
        }
        Swal.fire(
          "Success!",
          `${activeCategory} logbook entry updated successfully.`,
          "success"
        );
      } else {
        switch (activeCategory) {
          case "AIRFRAME":
            await createAirframeLogbook(formDataObj as any);
            break;
          case "AVIONICS":
            await createAvionicsLogbook(formDataObj as any);
            break;
          case "ENGINE":
            await createEngineLogbook(formDataObj as any);
            break;
          case "PROPELLER":
            await createPropellerLogbook(formDataObj as any);
            break;
        }
        Swal.fire(
          "Success!",
          `${activeCategory} logbook entry created successfully.`,
          "success"
        );
      }

      if (uploadFile) {
        setUploadFile(null);
        setUploadFileName("");
        setExistingUploadFile(null);
        const fileInput = document.getElementById(
          "upload-file-input"
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }

      // Reset form and close modal after successful save (for all tabs and operations)
      setShowAddEntryModal(false);
      setShowEditEntryModal(false);
      setEditingEntry(null);
      setComponentRecords([]);
      setUploadFile(null);
      setUploadFileName("");
      setExistingUploadFile(null);
      const fileInput = document.getElementById(
        "upload-file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Set loading to true immediately to show spinner during refresh
      setLoading(true);

      // Reload entries to show updated data using fetchLogbooks callback
      // This will maintain loading state and show the spinner during refresh
      // Works for all tabs: AIRFRAME, AVIONICS, ENGINE, PROPELLER
      await fetchLogbooks();
    } catch (err: any) {
      console.error("Error saving entry:", err);

      // Extract error message properly
      let errorMessage = "Failed to save entry";

      if (err.response?.data) {
        const errorData = err.response.data;

        // Handle different error response formats
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Handle validation errors array
          const messages = errorData.detail.map((item: any) => {
            if (typeof item === "string") return item;
            if (item.msg) return item.msg;
            if (item.loc && item.msg)
              return `${item.loc.join(".")}: ${item.msg}`;
            return JSON.stringify(item);
          });
          errorMessage = messages.join("\n");
        } else if (errorData.detail && typeof errorData.detail === "object") {
          errorMessage = JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "Error!",
        text: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900">Maintenance Logbook</h2>
            <p className="text-gray-500 mt-1">
              Registration: {aircraft?.registration || "-"}
            </p>
          </div>
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
          {canCreate("logbook") && (
            <button
              onClick={() => setShowAddEntryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              disabled={loading}
              className={`flex-1 px-6 py-4 text-sm transition-colors relative ${
                activeCategory === category
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-center gap-2">
                {loading && activeCategory === category && (
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                )}
                <span>{category}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by description, date, or mechanic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logbook List View */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : error ? (
          <div className="px-5 py-8 text-center text-red-600 text-sm">
            {error}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left text-gray-900 text-xs">
                      Date
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs">
                      Description
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs">
                      Mechanic Name
                    </th>

                    <th className="px-5 py-3 text-left text-gray-900 text-xs">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-gray-500 text-sm font-medium"
                      >
                        No Data Found
                      </td>
                    </tr>
                  ) : (
                    currentEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-4 text-gray-900 text-sm">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-5 py-4 text-gray-900 text-sm">
                          {entry.description || "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-600 text-sm">
                          {getMechanicDisplay(entry, accountsMap)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(entry.id);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canUpdate("logbook") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(entry.id);
                                }}
                                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete("logbook") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(entry.id);
                                }}
                                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalRecords}
              totalLabel="records"
              onPageChange={setCurrentPage}
              showRangeText={true}
              disabled={loading}
            />
          </>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedAirframeEntry && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const currentIndex = airframeLogEntries.findIndex(
                      (e) => e.id === selectedAirframeEntry.id
                    );
                    if (currentIndex > 0) {
                      const prevEntry = airframeLogEntries[currentIndex - 1];
                      try {
                        const full = await getAirframeLogbookById(prevEntry.id);
                        setSelectedAirframeEntry(full);
                      } catch {
                        setSelectedAirframeEntry(prevEntry);
                      }
                    }
                  }}
                  disabled={
                    airframeLogEntries.findIndex(
                      (e) => e.id === selectedAirframeEntry.id
                    ) === 0 || airframeLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    const currentIndex = airframeLogEntries.findIndex(
                      (e) => e.id === selectedAirframeEntry.id
                    );
                    if (currentIndex < airframeLogEntries.length - 1) {
                      const nextEntry = airframeLogEntries[currentIndex + 1];
                      try {
                        const full = await getAirframeLogbookById(nextEntry.id);
                        setSelectedAirframeEntry(full);
                      } catch {
                        setSelectedAirframeEntry(nextEntry);
                      }
                    }
                  }}
                  disabled={
                    airframeLogEntries.findIndex(
                      (e) => e.id === selectedAirframeEntry.id
                    ) ===
                      airframeLogEntries.length - 1 ||
                    airframeLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setSelectedAirframeEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">
                    AIRFRAME LOGBOOK
                  </h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">
                      {formatDate(selectedAirframeEntry.date)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">
                      {selectedAirframeEntry.sequenceNo || "-"}
                    </div>
                  </div>
                </div>

                {/* Tach Time and Airframe Time Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Tach Time:</div>
                    <div className="text-gray-900">
                      {selectedAirframeEntry.tachTime}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">
                      Airframe Time:
                    </div>
                    <div className="text-gray-900">
                      {selectedAirframeEntry.airframeTime}
                    </div>
                  </div>
                </div>

                {/* COMPONENT RECORD (Read) */}
                <div className="border-b border-gray-300 p-4">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                    <h3 className="text-white font-semibold">
                      COMPONENT RECORD
                    </h3>
                  </div>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full border-collapse min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            QTY
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            UNIT
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            NOMENCLATURE
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            REMOVED P/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            REMOVED S/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            INSTALLED P/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            INSTALLED S/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            ATA CHAPTER
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const parts =
                            selectedAirframeEntry.componentParts ??
                            (selectedAirframeEntry as any).component_parts ??
                            [];
                          return Array.isArray(parts) && parts.length > 0 ? (
                            parts.map((p: ComponentPart, i: number) => {
                              const sn = p as unknown as Record<
                                string,
                                unknown
                              >;
                              return (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.qty ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.unit ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.nomenclature ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.removedPartNo ??
                                        sn.removed_part_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.removedSerialNo ??
                                        sn.removed_serial_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.installedPartNo ??
                                        sn.installed_part_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.installedSerialNo ??
                                        sn.installed_serial_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.ataChapter ?? sn.ata_chapter ?? "-"
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm"
                              >
                                No component records.
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected
                    at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedAirframeEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">
                      Mechanic Name/License Number:
                    </div>
                    <div className="text-gray-900">
                      {getMechanicDisplay(selectedAirframeEntry, accountsMap)}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">
                        Signature/Stamp
                      </div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">
                          {selectedAirframeEntry.signature}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach File View */}
              <div className="mt-6">
                {selectedAirframeEntry.uploadFile ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleFileDownload(selectedAirframeEntry.uploadFile)
                      }
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-green-600"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">No Upload</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AVIONICS Detail View Modal */}
      {selectedAvionicsEntry && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const currentIndex = avionicsLogEntries.findIndex(
                      (e) => e.id === selectedAvionicsEntry.id
                    );
                    if (currentIndex > 0) {
                      const prevEntry = avionicsLogEntries[currentIndex - 1];
                      try {
                        const full = await getAvionicsLogbookById(prevEntry.id);
                        setSelectedAvionicsEntry(full);
                      } catch {
                        setSelectedAvionicsEntry(prevEntry);
                      }
                    }
                  }}
                  disabled={
                    avionicsLogEntries.findIndex(
                      (e) => e.id === selectedAvionicsEntry.id
                    ) === 0 || avionicsLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    const currentIndex = avionicsLogEntries.findIndex(
                      (e) => e.id === selectedAvionicsEntry.id
                    );
                    if (currentIndex < avionicsLogEntries.length - 1) {
                      const nextEntry = avionicsLogEntries[currentIndex + 1];
                      try {
                        const full = await getAvionicsLogbookById(nextEntry.id);
                        setSelectedAvionicsEntry(full);
                      } catch {
                        setSelectedAvionicsEntry(nextEntry);
                      }
                    }
                  }}
                  disabled={
                    avionicsLogEntries.findIndex(
                      (e) => e.id === selectedAvionicsEntry.id
                    ) ===
                      avionicsLogEntries.length - 1 ||
                    avionicsLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setSelectedAvionicsEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">
                    AVIONICS LOGBOOK
                  </h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">
                      {formatDate(selectedAvionicsEntry.date)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">
                      {selectedAvionicsEntry.sequenceNo || "-"}
                    </div>
                  </div>
                </div>

                {/* COMPONENT RECORD (Read) */}
                <div className="border-b border-gray-300 p-4">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                    <h3 className="text-white font-semibold">
                      COMPONENT RECORD
                    </h3>
                  </div>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full border-collapse min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            QTY
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            UNIT
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            NOMENCLATURE
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            REMOVED P/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            REMOVED S/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            INSTALLED P/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            INSTALLED S/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            ATA CHAPTER
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const parts =
                            selectedAvionicsEntry.componentParts ??
                            (selectedAvionicsEntry as any).component_parts ??
                            [];
                          return Array.isArray(parts) && parts.length > 0 ? (
                            parts.map((p: ComponentPart, i: number) => {
                              const sn = p as unknown as Record<
                                string,
                                unknown
                              >;
                              return (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.qty ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.unit ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.nomenclature ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.removedPartNo ??
                                        sn.removed_part_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.removedSerialNo ??
                                        sn.removed_serial_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.installedPartNo ??
                                        sn.installed_part_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.installedSerialNo ??
                                        sn.installed_serial_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.ataChapter ?? sn.ata_chapter ?? "-"
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm"
                              >
                                No component records.
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected
                    at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedAvionicsEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">
                      Mechanic Name/License Number:
                    </div>
                    <div className="text-gray-900">
                      {getMechanicDisplay(selectedAvionicsEntry, accountsMap)}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">
                        Signature/Stamp
                      </div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">
                          {selectedAvionicsEntry.signature}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach File View */}
              <div className="mt-6">
                {selectedAvionicsEntry.uploadFile ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleFileDownload(selectedAvionicsEntry.uploadFile)
                      }
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-green-600"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENGINE Detail View Modal */}
      {selectedEngineEntry && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const currentIndex = engineLogEntries.findIndex(
                      (e) => e.id === selectedEngineEntry.id
                    );
                    if (currentIndex > 0) {
                      const prevEntry = engineLogEntries[currentIndex - 1];
                      try {
                        const full = await getEngineLogbookById(prevEntry.id);
                        setSelectedEngineEntry(full);
                      } catch {
                        setSelectedEngineEntry(prevEntry);
                      }
                    }
                  }}
                  disabled={
                    engineLogEntries.findIndex(
                      (e) => e.id === selectedEngineEntry.id
                    ) === 0 || engineLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    const currentIndex = engineLogEntries.findIndex(
                      (e) => e.id === selectedEngineEntry.id
                    );
                    if (currentIndex < engineLogEntries.length - 1) {
                      const nextEntry = engineLogEntries[currentIndex + 1];
                      try {
                        const full = await getEngineLogbookById(nextEntry.id);
                        setSelectedEngineEntry(full);
                      } catch {
                        setSelectedEngineEntry(nextEntry);
                      }
                    }
                  }}
                  disabled={
                    engineLogEntries.findIndex(
                      (e) => e.id === selectedEngineEntry.id
                    ) ===
                      engineLogEntries.length - 1 ||
                    engineLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setSelectedEngineEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">
                    ENGINE LOGBOOK
                  </h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">
                      {formatDate(selectedEngineEntry.date)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">
                      {selectedEngineEntry.sequenceNo || "-"}
                    </div>
                  </div>
                </div>

                {/* Tach Time and Engine Time Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Tach Time:</div>
                    <div className="text-gray-900">
                      {selectedEngineEntry.tachTime}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">
                      Engine Time:
                    </div>
                    <div className="text-gray-900">
                      {(selectedEngineEntry as any).engineTime ||
                        selectedEngineEntry.tachTime ||
                        "-"}
                    </div>
                  </div>
                </div>

                {/* COMPONENT RECORD (Read) */}
                <div className="border-b border-gray-300 p-4">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                    <h3 className="text-white font-semibold">
                      COMPONENT RECORD
                    </h3>
                  </div>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full border-collapse min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            QTY
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            UNIT
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            NOMENCLATURE
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            REMOVED P/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            REMOVED S/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            INSTALLED P/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            INSTALLED S/N
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                            ATA CHAPTER
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const parts =
                            selectedEngineEntry.componentParts ??
                            (selectedEngineEntry as any).component_parts ??
                            [];
                          return Array.isArray(parts) && parts.length > 0 ? (
                            parts.map((p: ComponentPart, i: number) => {
                              const sn = p as unknown as Record<
                                string,
                                unknown
                              >;
                              return (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.qty ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.unit ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {p.nomenclature ?? "-"}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.removedPartNo ??
                                        sn.removed_part_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.removedSerialNo ??
                                        sn.removed_serial_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.installedPartNo ??
                                        sn.installed_part_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.installedSerialNo ??
                                        sn.installed_serial_no ??
                                        "-"
                                    )}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-gray-900">
                                    {String(
                                      p.ataChapter ?? sn.ata_chapter ?? "-"
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm"
                              >
                                No component records.
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected
                    at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedEngineEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">
                      Mechanic Name/License Number:
                    </div>
                    <div className="text-gray-900">
                      {getMechanicDisplay(selectedEngineEntry, accountsMap)}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">
                        Signature/Stamp
                      </div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">
                          {selectedEngineEntry.signature}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach File View */}
              <div className="mt-6">
                {selectedEngineEntry.uploadFile ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleFileDownload(selectedEngineEntry.uploadFile)
                      }
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-green-600"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROPELLER Detail View Modal */}
      {selectedPropellerEntry && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const currentIndex = propellerLogEntries.findIndex(
                      (e) => e.id === selectedPropellerEntry.id
                    );
                    if (currentIndex > 0) {
                      setSelectedPropellerEntry(
                        propellerLogEntries[currentIndex - 1]
                      );
                    }
                  }}
                  disabled={
                    propellerLogEntries.findIndex(
                      (e) => e.id === selectedPropellerEntry.id
                    ) === 0 || propellerLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const currentIndex = propellerLogEntries.findIndex(
                      (e) => e.id === selectedPropellerEntry.id
                    );
                    if (currentIndex < propellerLogEntries.length - 1) {
                      setSelectedPropellerEntry(
                        propellerLogEntries[currentIndex + 1]
                      );
                    }
                  }}
                  disabled={
                    propellerLogEntries.findIndex(
                      (e) => e.id === selectedPropellerEntry.id
                    ) ===
                      propellerLogEntries.length - 1 ||
                    propellerLogEntries.length === 0
                  }
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setSelectedPropellerEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">
                    PROPELLER LOGBOOK
                  </h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">
                      {formatDate(selectedPropellerEntry.date)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">
                      {selectedPropellerEntry.sequenceNo || "-"}
                    </div>
                  </div>
                </div>

                {/* Propeller Time Row */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-1">
                    Propeller Time:
                  </div>
                  <div className="text-gray-900">
                    {(selectedPropellerEntry as any).propellerTime ||
                      selectedPropellerEntry.tachTime ||
                      "-"}
                  </div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected
                    at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedPropellerEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">
                      Mechanic Name/License Number:
                    </div>
                    <div className="text-gray-900">
                      {getMechanicDisplay(selectedPropellerEntry, accountsMap)}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">
                        Signature/Stamp
                      </div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">
                          {selectedPropellerEntry.signature}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach File View */}
              <div className="mt-6">
                {selectedPropellerEntry.uploadFile ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleFileDownload(selectedPropellerEntry.uploadFile)
                      }
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-green-600"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File View Modal */}
      {showImageViewModal && imageUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50"
          onClick={() => {
            setShowImageViewModal(false);
            setImageUrl("");
            setViewingFilePath(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                View Document
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (viewingFilePath) {
                      handleFileDownload(viewingFilePath);
                    } else {
                      // Fallback: try to extract from URL
                      const filePath = imageUrl.split("/").pop() || "";
                      if (filePath) {
                        handleFileDownload(filePath);
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors text-green-600"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowImageViewModal(false);
                    setImageUrl("");
                    setViewingFilePath(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {(() => {
                const fileType = getFileType(imageUrl);
                if (fileType === "image") {
                  return (
                    <img
                      src={imageUrl}
                      alt="Uploaded file"
                      className="max-w-full h-auto rounded-lg mx-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%236b7280'%3EImage not found%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  );
                } else if (fileType === "pdf") {
                  return (
                    <iframe
                      src={imageUrl}
                      className="w-full h-[calc(90vh-120px)] rounded-lg border border-gray-200"
                      title="PDF Viewer"
                    />
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center h-[calc(90vh-120px)] text-center">
                      <div className="mb-4">
                        <Download className="w-16 h-16 text-gray-400 mx-auto" />
                      </div>
                      <p className="text-gray-600 mb-4">
                        This file type cannot be previewed in the browser.
                      </p>
                      <button
                        onClick={() => {
                          if (viewingFilePath) {
                            handleFileDownload(viewingFilePath);
                          } else {
                            // Fallback: try to extract from URL
                            const filePath = imageUrl.split("/").pop() || "";
                            if (filePath) {
                              handleFileDownload(filePath);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download File
                      </button>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Entry Modal */}
      {(showAddEntryModal || showEditEntryModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay with blur */}
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => {
              setShowAddEntryModal(false);
              setShowEditEntryModal(false);
              setEditingEntry(null);
            }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEntry ? "Edit Entry" : "Add New Entry"}
              </h2>
              <button
                onClick={() => {
                  setShowAddEntryModal(false);
                  setShowEditEntryModal(false);
                  setEditingEntry(null);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {activeCategory} LOGBOOK
                  </h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Date:
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Seq. No.
                    </label>
                    <input
                      type="text"
                      value={formData.sequenceNo}
                      onChange={(e) =>
                        setFormData({ ...formData, sequenceNo: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-red-700 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* Fields Row - Dynamic based on category */}
                {activeCategory === "AIRFRAME" && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1.5">
                        Tach Time:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.tachTime}
                        onChange={(e) =>
                          setFormData({ ...formData, tachTime: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1.5">
                        Airframe Time:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.airframeTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            airframeTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                  </div>
                )}
                {activeCategory === "ENGINE" && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Engine TSN:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.engineTsn}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              engineTsn: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Tach Time:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.tachTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tachTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Engine TSO:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.engineTso}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              engineTso: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Engine TBO:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.engineTbo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              engineTbo: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                  </>
                )}
                {activeCategory === "AVIONICS" && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Airframe TSN:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.airframeTsn}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              airframeTsn: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Component:
                        </label>
                        <input
                          type="text"
                          value={formData.component}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              component: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Part No:
                        </label>
                        <input
                          type="text"
                          value={formData.partNo}
                          onChange={(e) =>
                            setFormData({ ...formData, partNo: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Serial No:
                        </label>
                        <input
                          type="text"
                          value={formData.serialNo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              serialNo: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                  </>
                )}
                {activeCategory === "PROPELLER" && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Propeller TSN:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.propellerTsn}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              propellerTsn: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Tach Time:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.tachTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tachTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Propeller TSO:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.propellerTso}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              propellerTso: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5">
                          Propeller TBO:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.propellerTbo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              propellerTbo: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* COMPONENT RECORD – Airframe, Avionics, Engine only */}
                {(activeCategory === "AIRFRAME" ||
                  activeCategory === "AVIONICS" ||
                  activeCategory === "ENGINE") && (
                  <div className="mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                        <h3 className="text-white font-semibold">
                          COMPONENT RECORD
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                QTY
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                UNIT
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                NOMENCLATURE
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                REMOVED P/N
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                REMOVED S/N
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                INSTALLED P/N
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                INSTALLED S/N
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                ATA CHAPTER
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                                DELETE?
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {componentRecords.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm"
                                >
                                  No component records added. Click &quot;Add
                                  another Component&quot; to add one.
                                </td>
                              </tr>
                            ) : (
                              componentRecords.map((record) => (
                                <tr
                                  key={record.id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.qty}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "qty",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.unit}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "unit",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.nomenclature}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "nomenclature",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.removedPartNo}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "removedPartNo",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.removedSerialNo}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "removedSerialNo",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.installedPartNo}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "installedPartNo",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.installedSerialNo}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "installedSerialNo",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2">
                                    <input
                                      type="text"
                                      value={record.ataChapter}
                                      onChange={(e) =>
                                        updateComponentRecord(
                                          record.id,
                                          "ataChapter",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeComponentRecord(record.id)
                                      }
                                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                        <button
                          type="button"
                          onClick={addComponentRecord}
                          className="mt-3 flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add another Component
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description Section */}
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm mb-1.5">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </label>
                  <p className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected
                    at the back page of this logbook sequence)
                  </p>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400 resize-none"
                  />
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-700 mb-1 block">
                      Mechanic Name/License Number:
                    </label>
                    <div className="relative" ref={mechanicDropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            isMechanicDropdownOpen
                              ? mechanicSearchTerm
                              : getSelectedMechanic()
                          }
                          onChange={(e) => {
                            setMechanicSearchTerm(e.target.value);
                            setIsMechanicDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setIsMechanicDropdownOpen(true);
                            setMechanicSearchTerm("");
                            // Fetch accounts if not already loaded
                            if (mechanicAccounts.length === 0) {
                              fetchMechanicAccounts("");
                            }
                          }}
                          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                          placeholder="Search mechanic..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsMechanicDropdownOpen(!isMechanicDropdownOpen);
                            if (!isMechanicDropdownOpen) {
                              setMechanicSearchTerm("");
                              // Fetch accounts if opening and not already loaded
                              if (mechanicAccounts.length === 0) {
                                fetchMechanicAccounts("");
                              }
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto text-gray-400"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isMechanicDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                      {isMechanicDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {loadingMechanicAccounts ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              Loading mechanics...
                            </div>
                          ) : (
                            (() => {
                              // Debug: Log accounts for troubleshooting
                              if (mechanicAccounts.length > 0) {
                                console.log(
                                  "Mechanic accounts available:",
                                  mechanicAccounts.length
                                );
                              }

                              // Client-side filtering for better UX
                              const filtered = mechanicAccounts.filter(
                                (account) => {
                                  if (!mechanicSearchTerm.trim()) return true;
                                  const searchLower = mechanicSearchTerm
                                    .toLowerCase()
                                    .trim();
                                  const fullName = account.fullName || "";
                                  const licenseNo = account.licenseNo || "";
                                  return (
                                    fullName
                                      .toLowerCase()
                                      .includes(searchLower) ||
                                    licenseNo
                                      .toLowerCase()
                                      .includes(searchLower)
                                  );
                                }
                              );

                              if (filtered.length === 0) {
                                return (
                                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                    {mechanicSearchTerm.trim()
                                      ? "No mechanics found"
                                      : mechanicAccounts.length === 0
                                      ? "No mechanics available"
                                      : "No mechanics found"}
                                  </div>
                                );
                              }

                              return (
                                <ul className="py-1">
                                  {filtered.map((account) => (
                                    <li
                                      key={account.id}
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          mechanicFk: account.id.toString(),
                                        });
                                        setMechanicSearchTerm("");
                                        setIsMechanicDropdownOpen(false);
                                      }}
                                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                        formData.mechanicFk ===
                                        account.id.toString()
                                          ? "bg-blue-50"
                                          : ""
                                      }`}
                                    >
                                      <span className="text-gray-900 text-sm">
                                        {account.fullName}-{account.licenseNo}
                                      </span>
                                      {formData.mechanicFk ===
                                        account.id.toString() && (
                                        <Check className="w-4 h-4 text-blue-600" />
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-full">
                      <label className="block text-gray-700 text-sm mb-1.5">
                        Signature/Stamp
                      </label>
                      <input
                        type="text"
                        value={formData.signature}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            signature: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400 text-center"
                        placeholder="Signature/Stamp"
                      />
                    </div>
                  </div>
                </div>

                {/* Attach Image Section */}
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Attach Image:
                  </label>
                  <input
                    type="file"
                    id="upload-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                      setUploadFileName(file ? file.name : "");
                      // Clear existing file when new file is selected
                      if (file) {
                        setExistingUploadFile(null);
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="upload-file-input"
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-between bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span
                        className={
                          uploadFileName ? "text-gray-900" : "text-gray-400"
                        }
                      >
                        {uploadFileName ||
                          (existingUploadFile
                            ? "Existing file (click to change)"
                            : "Choose file or drag here")}
                      </span>
                    </div>
                    {uploadFileName && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                          setUploadFileName("");
                          setExistingUploadFile(null);
                          const input = document.getElementById(
                            "upload-file-input"
                          ) as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                  </p>
                  {existingUploadFile && !uploadFile && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Uploaded file</p>
                        <p className="truncate text-sm text-gray-900">
                          {getExistingUploadDisplayName(existingUploadFile)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleFileDownload(
                            existingUploadFile,
                            getExistingUploadDisplayName(existingUploadFile)
                          )
                        }
                        className="shrink-0 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded hover:bg-white transition-colors text-green-600"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 relative">
              {isSaving && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-b-lg">
                  <Spinner />
                </div>
              )}
              <button
                onClick={() => {
                  setShowAddEntryModal(false);
                  setShowEditEntryModal(false);
                  setEditingEntry(null);
                }}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {((!editingEntry && canCreate("logbook")) ||
                (editingEntry && canUpdate("logbook"))) && (
                <button
                  onClick={handleSaveEntry}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                  {editingEntry ? "Update Entry" : "Save Entry"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
