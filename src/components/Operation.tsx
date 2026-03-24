import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  FileText,
  Search,
  Pencil,
  Eye,
  RefreshCw,
} from "lucide-react";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { EditTechnicalLogbookEntryModal } from "./EditTechnicalLogbookEntryModal";
import { ViewTechnicalLogbookEntryModal } from "./ViewTechnicalLogbookEntryModal";
import {
  getAircraftTechnicalLogs,
  deleteAircraftTechnicalLog,
  importAircraftTechnicalLogExcel,
  AircraftTechnicalLog,
} from "../api/aircraftTechnicalLogApi";
import { getAircraftById } from "../api/aircraftApi";
import apiClient from "../api/index";
import Swal from "sweetalert2";
import { Spinner } from "./ui/spinner";
import { Aircraft } from "../types/Aircraft";
import {
  toCamel,
  formatTimeZulu,
  computeTotalBlockTime,
  computeTotalFlightHoursDecimal,
} from "../utility/utils";
import { getAllAccounts, Account } from "../api/accountApi";

type GroupByOption =
  | "allColumns"
  | "fuelAndOilData"
  | "maintenancePlanning"
  | "reliabilityMonitoring";

const STICKY_SEQ_CLASS =
  "px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px] w-[140px]";
const STICKY_SEQ_CELL_CLASS =
  "px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium";

/** Fleet Time Monitoring table: API may return FOR_REVIEW or "FOR REVIEW" */
function formatFleetWorkStatus(status: string | undefined): string {
  if (!status || status.trim() === "") return "-";
  return status.replace(/_/g, " ");
}

const FLEET_WORK_STATUS_BASE_TD =
  "px-3 py-3 text-sm border-r border-gray-200 whitespace-nowrap";

const FLEET_WORK_STATUS_KEYS = [
  "FOR_REVIEW",
  "REJECTED_MAINTENANCE",
  "APPROVED",
  "AWAITING_ATTACHMENT",
  "REJECTED_QUALITY",
  "PENDING",
  "COMPLETED",
] as const;

type FleetWorkStatusKey = (typeof FLEET_WORK_STATUS_KEYS)[number];

/** Normalize API / display variants to a single enum key for styling */
function normalizeFleetWorkStatusKey(
  status: string | undefined
): FleetWorkStatusKey | "" {
  if (!status || status.trim() === "") return "";
  const key = status
    .trim()
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
  return (FLEET_WORK_STATUS_KEYS as readonly string[]).includes(key)
    ? (key as FleetWorkStatusKey)
    : "";
}

/** Tailwind default palette (50 / 800) — inline styles so colors work with the bundled CSS (many bg/text utilities are not emitted). */
const FLEET_WORK_STATUS_STYLE: Record<FleetWorkStatusKey, CSSProperties> = {
  FOR_REVIEW: { backgroundColor: "#fffbeb", color: "#92400e" },
  REJECTED_MAINTENANCE: { backgroundColor: "#fef2f2", color: "#991b1b" },
  APPROVED: { backgroundColor: "#ecfdf5", color: "#065f46" },
  AWAITING_ATTACHMENT: { backgroundColor: "#f0f9ff", color: "#075985" },
  REJECTED_QUALITY: { backgroundColor: "#fff1f2", color: "#9f1239" },
  PENDING: { backgroundColor: "#f5f3ff", color: "#5b21b6" },
  COMPLETED: { backgroundColor: "#f0fdf4", color: "#166534" },
};

function getFleetWorkStatusCellProps(status: string | undefined): {
  className: string;
  style: CSSProperties | undefined;
} {
  const key = normalizeFleetWorkStatusKey(status);
  if (!key) {
    return {
      className: `${FLEET_WORK_STATUS_BASE_TD} bg-white text-gray-900`,
      style: undefined,
    };
  }
  return {
    className: FLEET_WORK_STATUS_BASE_TD,
    style: FLEET_WORK_STATUS_STYLE[key],
  };
}

export function Operation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = parseInt(id || "1");

  const handleBack = () => {
    navigate("/profile");
  };

  const handleViewReliability = (recordId: number) => {
    navigate(`/profile/${id}/operation/reliability/${recordId}`);
  };

  /** Download file via GET /api/v1/{folder}/download/{filename} */
  const handleDownloadFile = async (
    folder: string,
    filename: string,
    displayName?: string
  ) => {
    if (!filename || !filename.trim()) return;
    let filePath = filename.trim().replace(/^\/+/, "");
    filePath = filePath.replace(/^api\/v1\//, "");
    const endpoint = `${folder}/download/${filePath}`;
    try {
      const response = await apiClient.get(endpoint, {
        responseType: "blob",
        headers: { Accept: "application/octet-stream" },
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = displayName || filePath.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      await Swal.fire({
        icon: "error",
        title: "Download failed",
        text:
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to download file.",
      });
    }
  };

  /** Infer MIME from filename when server returns octet-stream (so JPG/PDF are viewable) */
  const getMimeFromFilename = (path: string): string | null => {
    const ext = (path.split("/").pop() || path).split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "gif") return "image/gif";
    if (ext === "webp") return "image/webp";
    return null;
  };

  /** View file in popup modal */
  const [showFileViewModal, setShowFileViewModal] = useState(false);
  const [fileViewBlobUrl, setFileViewBlobUrl] = useState<string | null>(null);
  const [fileViewMimeType, setFileViewMimeType] = useState<string | null>(null);
  const [fileViewLoading, setFileViewLoading] = useState(false);
  const [fileViewError, setFileViewError] = useState<string | null>(null);

  const handleViewFile = async (folder: string, filename: string) => {
    if (!filename || !filename.trim()) return;
    setFileViewLoading(true);
    setFileViewError(null);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setShowFileViewModal(true);
    let filePath = filename.trim().replace(/^\/+/, "");
    filePath = filePath.replace(/^api\/v1\//, "");
    const endpoint = `${folder}/download/${filePath}`;
    try {
      const response = await apiClient.get(endpoint, {
        responseType: "blob",
        headers: { Accept: "application/octet-stream" },
      });
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const serverType =
        blob.type || (response as any).headers?.["content-type"] || null;
      const isOctetStream =
        !serverType || serverType === "application/octet-stream";
      const mimeType = isOctetStream
        ? getMimeFromFilename(filePath)
        : serverType;
      setFileViewBlobUrl(url);
      setFileViewMimeType(mimeType ?? null);
      setFileViewError(null);
    } catch (err: any) {
      console.error("View file error:", err);
      setFileViewError(
        err?.response?.data?.detail || err?.message || "Failed to open file."
      );
      setFileViewBlobUrl(null);
      setFileViewMimeType(null);
    } finally {
      setFileViewLoading(false);
    }
  };

  const closeFileViewModal = () => {
    if (fileViewBlobUrl) {
      window.URL.revokeObjectURL(fileViewBlobUrl);
    }
    setShowFileViewModal(false);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setFileViewError(null);
  };

  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEntry, setSelectedEntry] =
    useState<AircraftTechnicalLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [fleetTimeRecords, setFleetTimeRecords] = useState<
    AircraftTechnicalLog[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [accountsMap, setAccountsMap] = useState<Map<number, Account>>(
    new Map()
  );
  const [groupBy, setGroupBy] = useState<GroupByOption>("allColumns");
  const [sequenceSort, setSequenceSort] = useState<"asc" | "desc">("asc");
  const [importLoading, setImportLoading] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Helpers for airframe/engine/propeller from nested or flat API (ATL fields)
  type ComputedRow =
    | {
        airframeRunTime: number | null;
        airframeAftt: number | null;
        engineRunTime: number | null;
        engineTsn: number | null;
        engineTso: number | null;
        engineTbo: number | null;
        propellerRunTime: number | null;
        propellerTsn: number | null;
        propellerTso: number | null;
        propellerTbo: number | null;
      }
    | undefined;
  const getAirframeDisplay = (
    r: AircraftTechnicalLog,
    computed?: ComputedRow
  ) => {
    const run =
      computed?.airframeRunTime != null
        ? Number(computed.airframeRunTime).toFixed(2)
        : (r as any).airframe?.hrsTime != null ||
          (r as any).airframe?.run != null
        ? toFormat2(
            Number((r as any).airframe?.hrsTime ?? (r as any).airframe?.run)
          )
        : r.airframeRunTime != null || r.airframeTotalTime != null
        ? toFormat2(Number(r.airframeRunTime ?? r.airframeTotalTime))
        : (r as any).airframeRun != null
        ? toFormat2(Number((r as any).airframeRun))
        : "-";
    const aftt =
      computed?.airframeAftt != null
        ? Number(computed.airframeAftt).toFixed(2)
        : r.airframeAftt != null || (r as any).airframeTotalTime != null
        ? toFormat2(Number(r.airframeAftt ?? (r as any).airframeTotalTime))
        : "-";
    return `${run} / ${aftt}`;
  };
  const getEngineDisplay = (
    r: AircraftTechnicalLog,
    computed?: ComputedRow
  ) => {
    const run =
      computed?.engineRunTime != null
        ? Number(computed.engineRunTime).toFixed(2)
        : (r as any).engine?.hrsTime != null || (r as any).engine?.run != null
        ? toFormat2(
            Number((r as any).engine?.hrsTime ?? (r as any).engine?.run)
          )
        : r.engineRunTime != null || r.engineTotalTime != null
        ? toFormat2(Number(r.engineRunTime ?? r.engineTotalTime))
        : (r as any).engineRun != null
        ? toFormat2(Number((r as any).engineRun))
        : "-";
    const tsn =
      computed?.engineTsn != null
        ? Number(computed.engineTsn).toFixed(2)
        : (r as any).engine?.tsn != null || r.engineTsn != null
        ? toFormat2(Number((r as any).engine?.tsn ?? r.engineTsn))
        : "-";
    const tso =
      computed?.engineTso != null
        ? Number(computed.engineTso).toFixed(2)
        : (r as any).engine?.tso != null || r.engineTso != null
        ? toFormat2(Number((r as any).engine?.tso ?? r.engineTso))
        : "-";
    const tbo =
      computed?.engineTbo != null
        ? Number(computed.engineTbo).toFixed(2)
        : (r as any).engine?.tbo != null || r.engineTbo != null
        ? toFormat2(Number((r as any).engine?.tbo ?? r.engineTbo))
        : "-";
    return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
  };
  const getPropellerDisplay = (
    r: AircraftTechnicalLog,
    computed?: ComputedRow
  ) => {
    const run =
      computed?.propellerRunTime != null
        ? Number(computed.propellerRunTime).toFixed(2)
        : (r as any).propeller?.hrsTime != null ||
          (r as any).propeller?.run != null
        ? toFormat2(
            Number((r as any).propeller?.hrsTime ?? (r as any).propeller?.run)
          )
        : r.propellerRunTime != null || r.propellerTotalTime != null
        ? toFormat2(Number(r.propellerRunTime ?? r.propellerTotalTime))
        : (r as any).propellerRun != null
        ? toFormat2(Number((r as any).propellerRun))
        : "-";
    const tsn =
      computed?.propellerTsn != null
        ? Number(computed.propellerTsn).toFixed(2)
        : (r as any).propeller?.tsn != null || r.propellerTsn != null
        ? toFormat2(Number((r as any).propeller?.tsn ?? r.propellerTsn))
        : "-";
    const tso =
      computed?.propellerTso != null
        ? Number(computed.propellerTso).toFixed(2)
        : (r as any).propeller?.tso != null || r.propellerTso != null
        ? toFormat2(Number((r as any).propeller?.tso ?? r.propellerTso))
        : "-";
    const tbo =
      computed?.propellerTbo != null
        ? Number(computed.propellerTbo).toFixed(2)
        : (r as any).propeller?.tbo != null || r.propellerTbo != null
        ? toFormat2(Number((r as any).propeller?.tbo ?? r.propellerTbo))
        : "-";
    return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
  };

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

  // Fetch all accounts for lookup
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

  // Fetch ATL records from API
  useEffect(() => {
    const fetchRecords = async () => {
      if (!aircraftId) return;

      setLoading(true);
      setError(null);
      try {
        const sortParam =
          sequenceSort === "asc" ? "sequence_no" : "-sequence_no";
        const response = await getAircraftTechnicalLogs(
          currentPage,
          itemsPerPage,
          searchQuery,
          aircraftId,
          sortParam
        );
        setFleetTimeRecords(response.items);
        setTotalRecords(response.total);
        setTotalPages(response.pages);
      } catch (err: any) {
        console.error("Error fetching ATL records:", err);
        setError("Failed to load fleet time records");
        setFleetTimeRecords([]);
      } finally {
        setTimeout(() => setLoading(false), 360);
      }
    };

    fetchRecords();
  }, [
    aircraftId,
    currentPage,
    itemsPerPage,
    searchQuery,
    refreshKey,
    sequenceSort,
  ]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedRecords = fleetTimeRecords;

  // List view computations: Engine Run = Airframe Run; TSN/TSO = Previous + Run; TBO = limit - current TSO (same for propeller)
  const toNum = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  /** Format computation result always as 2 decimal places (.2f) */
  const toFormat2 = (v: unknown): string => {
    const n = v != null && v !== "" ? Number(v) : null;
    return n != null && Number.isFinite(n) ? n.toFixed(2) : "-";
  };
  const computedEnginePropellerList = useMemo(() => {
    const list: Array<{
      airframeRunTime: number | null;
      airframeAftt: number | null;
      engineRunTime: number | null;
      engineTsn: number | null;
      engineTso: number | null;
      engineTbo: number | null;
      propellerRunTime: number | null;
      propellerTsn: number | null;
      propellerTso: number | null;
      propellerTbo: number | null;
    }> = [];
    const engineLimit =
      aircraft != null
        ? toNum(
            (aircraft as any).engineLifeTimeLimit ??
              (aircraft as any).life_time_limit_engine
          ) ?? null
        : null;
    const propellerLimit =
      aircraft != null
        ? toNum(
            (aircraft as any).propellerLifeTimeLimit ??
              (aircraft as any).life_time_limit_propeller
          ) ?? null
        : null;

    for (let i = 0; i < paginatedRecords.length; i++) {
      const r = paginatedRecords[i];
      const airframeRun =
        toNum(r.airframeRunTime) ??
        toNum(r.airframeTotalTime) ??
        (r.tachometerStart != null && r.tachometerEnd != null
          ? r.tachometerEnd - r.tachometerStart
          : null);
      const engineRunTime = airframeRun;
      const propellerRunTime = airframeRun;

      // Airframe AFTT = Previous Airframe AFTT + Airframe current run time
      let airframeAftt: number | null;
      if (i === 0) {
        airframeAftt =
          toNum(r.airframeAftt) ?? (airframeRun != null ? airframeRun : null);
      } else {
        const prev = list[i - 1];
        airframeAftt =
          prev.airframeAftt != null && airframeRun != null
            ? prev.airframeAftt + airframeRun
            : prev.airframeAftt ?? toNum(r.airframeAftt);
      }

      let engineTsn: number | null;
      let engineTso: number | null;
      let propellerTsn: number | null;
      let propellerTso: number | null;

      if (i === 0) {
        engineTsn =
          toNum(r.engineTsn) ?? (engineRunTime != null ? engineRunTime : null);
        engineTso =
          toNum(r.engineTso) ?? (engineRunTime != null ? engineRunTime : null);
        propellerTsn =
          toNum(r.propellerTsn) ??
          (propellerRunTime != null ? propellerRunTime : null);
        propellerTso =
          toNum(r.propellerTso) ??
          (propellerRunTime != null ? propellerRunTime : null);
      } else {
        const prev = list[i - 1];
        engineTsn =
          prev.engineTsn != null && engineRunTime != null
            ? prev.engineTsn + engineRunTime
            : prev.engineTsn ?? toNum(r.engineTsn);
        engineTso =
          prev.engineTso != null && engineRunTime != null
            ? prev.engineTso + engineRunTime
            : prev.engineTso ?? toNum(r.engineTso);
        propellerTsn =
          prev.propellerTsn != null && propellerRunTime != null
            ? prev.propellerTsn + propellerRunTime
            : prev.propellerTsn ?? toNum(r.propellerTsn);
        propellerTso =
          prev.propellerTso != null && propellerRunTime != null
            ? prev.propellerTso + propellerRunTime
            : prev.propellerTso ?? toNum(r.propellerTso);
      }

      // Engine TBO = life_time_limit_engine - ENGINE CURRENT TSO
      const engineTbo =
        engineLimit != null && engineTso != null
          ? engineLimit - engineTso
          : toNum(r.engineTbo) ?? null;
      // Propeller TBO = life_time_limit_propeller - Propeller current TSO
      const propellerTbo =
        propellerLimit != null && propellerTso != null
          ? propellerLimit - propellerTso
          : toNum(r.propellerTbo) ?? null;

      list.push({
        airframeRunTime: airframeRun,
        airframeAftt,
        engineRunTime,
        engineTsn,
        engineTso,
        engineTbo,
        propellerRunTime,
        propellerTsn,
        propellerTso,
        propellerTbo,
      });
    }
    return list;
  }, [paginatedRecords, aircraft]);

  const handleAddToReliability = (record: AircraftTechnicalLog) => {
    // This would typically send data to backend to create reliability record
    console.log("Adding record to reliability tracking:", record);
    Swal.fire({
      icon: "success",
      title: "Added",
      text: `Record #${record.sequenceNo ?? record.id} added to reliability tracking`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleSeeReliability = (record: AircraftTechnicalLog) => {
    handleViewReliability(record.id);
  };

  const handleDeleteAtl = async (record: AircraftTechnicalLog) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete ATL Entry",
      html: `Are you sure you want to delete entry <strong>${
        record.sequenceNo ?? record.id
      }</strong>? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAircraftTechnicalLog(record.id);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "ATL entry has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      refreshPage();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const msg =
        e?.response?.data?.detail ?? e?.message ?? "Failed to delete entry.";
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: msg,
      });
    }
  };

  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !aircraftId) return;
    setImportLoading(true);
    try {
      await importAircraftTechnicalLogExcel(file, aircraftId);
      await refreshPage();
      await Swal.fire({
        icon: "success",
        title: "Import complete",
        text: "Aircraft Technical Log entries have been imported successfully.",
        confirmButtonColor: "#2563eb",
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        err?.message ??
        "Import failed.";
      await Swal.fire({
        icon: "error",
        title: "Import failed",
        text: typeof message === "string" ? message : "Failed to import file.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Refresh aircraft + records so list view recomputes (Engine TSN/TSO/TBO, Propeller, Airframe AFTT, etc.)
  const refreshPage = async () => {
    if (!aircraftId) return;
    setLoading(true);
    setError(null);
    try {
      const [aircraftRes, recordsRes] = await Promise.all([
        getAircraftById(aircraftId),
        getAircraftTechnicalLogs(
          currentPage,
          itemsPerPage,
          searchQuery,
          aircraftId,
          sequenceSort === "asc" ? "sequence_no" : "-sequence_no"
        ),
      ]);
      setAircraft(toCamel(aircraftRes.data));
      setFleetTimeRecords(recordsRes.items);
      setTotalRecords(recordsRes.total);
      setTotalPages(recordsRes.pages);
    } catch (err: any) {
      console.error("Error refreshing:", err);
      setError("Failed to load data");
      setFleetTimeRecords([]);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900 text-lg sm:text-xl">
              Operation Management
            </h2>
          </div>
        </div>
      </div>

      {/* Fleet Time Monitoring */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Fleet Time Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h3 className="text-gray-900 text-base sm:text-lg">
                Fleet Time Monitoring:{" "}
                <b>{aircraft?.registration || "Loading..."}</b>
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Model:{" "}
                {aircraft
                  ? `${aircraft.model || ""}`
                  : "Loading aircraft details..."}
              </p>
              {aircraft && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-500 text-sm mt-1.5">
                  <span>
                    Engine Life Time Limit:{" "}
                    {(aircraft as any).engineLifeTimeLimit != null ||
                    (aircraft as any).life_time_limit_engine != null
                      ? String(
                          (aircraft as any).engineLifeTimeLimit ??
                            (aircraft as any).life_time_limit_engine
                        )
                      : "-"}
                  </span>
                  <span>
                    Propeller Life Time Limit:{" "}
                    {(aircraft as any).propellerLifeTimeLimit != null ||
                    (aircraft as any).life_time_limit_propeller != null
                      ? String(
                          (aircraft as any).propellerLifeTimeLimit ??
                            (aircraft as any).life_time_limit_propeller
                        )
                      : "-"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshPage}
                disabled={loading}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh list and recalculate computed values"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <input
                type="file"
                ref={importFileInputRef}
                onChange={handleImportFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                aria-label="Import ATL from Excel"
              />
              <button
                type="button"
                onClick={handleImportClick}
                disabled={importLoading}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Import Aircraft Technical Log from Excel"
              >
                <Upload
                  className={`w-4 h-4 ${importLoading ? "animate-pulse" : ""}`}
                />
                <span className="hidden sm:inline">
                  {importLoading ? "Importing…" : "Import"}
                </span>
              </button>
              <button
                onClick={() => {
                  const engineLimit =
                    aircraft?.engineLifeTimeLimit ??
                    (aircraft as any)?.life_time_limit_engine;
                  const propellerLimit =
                    aircraft?.propellerLifeTimeLimit ??
                    (aircraft as any)?.life_time_limit_propeller;
                  const engineMissing =
                    engineLimit == null ||
                    engineLimit === "" ||
                    Number(engineLimit) === 0;
                  const propellerMissing =
                    propellerLimit == null ||
                    propellerLimit === "" ||
                    Number(propellerLimit) === 0;
                  if (engineMissing || propellerMissing) {
                    Swal.fire({
                      icon: "warning",
                      title: "Aircraft limits required",
                      html: "Engine Life Time Limit and Propeller Life Time Limit must be set (not 0 or empty) in <strong>Aircraft Details</strong> before creating an ATL entry.<br/><br/>",
                      confirmButtonColor: "#2563eb",
                    });
                    return;
                  }
                  setShowAddRecordModal(true);
                }}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Record</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Current Tach</p>
              <p className="text-gray-900 text-2xl">
                {fleetTimeRecords.length > 0 &&
                fleetTimeRecords[0].tachometerEnd
                  ? `${fleetTimeRecords[0].tachometerEnd.toFixed(1)} Hrs`
                  : "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Total Flight Records</p>
              <p className="text-gray-900 text-2xl">{totalRecords} records</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Last Updated</p>
              <p className="text-gray-900 text-sm">
                {fleetTimeRecords.length > 0 && fleetTimeRecords[0].updatedAt
                  ? new Date(fleetTimeRecords[0].updatedAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : "-"}
              </p>
            </div>
          </div>

          {/* Fleet Time Records Section Title */}
          <div className="bg-blue-600 rounded px-5 py-3">
            <h4 className="text-white text-sm font-medium">
              Fleet Time Records
            </h4>
          </div>

          {/* Search Section + Group by */}
          <div>
            <h5 className="text-gray-700 text-sm font-medium mb-3">
              Search Entries
            </h5>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by sequence number, tach time..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="group-by"
                  className="text-gray-700 text-sm font-medium whitespace-nowrap"
                >
                  Group by
                </label>
                <select
                  id="group-by"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                  className="px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-sm text-gray-900 min-w-[200px]"
                >
                  <option value="allColumns">All Columns</option>
                  <option value="fuelAndOilData">Fuel and Oil Data</option>
                  <option value="maintenancePlanning">
                    Maintenance Planning
                  </option>
                  <option value="reliabilityMonitoring">
                    Reliability Monitoring
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Fleet Time Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Spinner />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      // Trigger refetch
                      const fetchRecords = async () => {
                        if (!aircraftId) return;
                        setLoading(true);
                        setError(null);
                        try {
                          const response = await getAircraftTechnicalLogs(
                            currentPage,
                            itemsPerPage,
                            searchQuery,
                            aircraftId
                          );
                          setFleetTimeRecords(response.items);
                          setTotalRecords(response.total);
                          setTotalPages(response.pages);
                        } catch (err: any) {
                          console.error("Error fetching ATL records:", err);
                          setError("Failed to load fleet time records");
                          setFleetTimeRecords([]);
                        } finally {
                          setTimeout(() => setLoading(false), 360);
                        }
                      };
                      fetchRecords();
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                {groupBy === "allColumns" && (
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse table-fixed">
                        <thead>
                          <tr>
                            <th
                              rowSpan={2}
                              className={`${STICKY_SEQ_CLASS} cursor-pointer select-none hover:bg-gray-300 transition-colors`}
                              onClick={() => {
                                setSequenceSort((s) =>
                                  s === "asc" ? "desc" : "asc"
                                );
                                setCurrentPage(1);
                              }}
                              title={
                                sequenceSort === "asc"
                                  ? "Sort descending"
                                  : "Sort ascending"
                              }
                            >
                              <span className="flex items-center gap-1">
                                <b>SEQUENCE NO</b>
                                {sequenceSort === "asc" ? (
                                  <ChevronUp className="w-4 h-4 inline" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 inline" />
                                )}
                              </span>
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              WORK
                              <br />
                              STATUS
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              NATURE OF
                              <br />
                              FLIGHT
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              NEXT INSP.
                              <br />
                              DATE
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              TACH TIME
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              OFF BLOCKS/ORIGIN
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ON BLOCKS/DESTINATION
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              Total Flight hours
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              NO. OF
                              <br />
                              LAND-
                              <br />
                              INGS
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              HOBBS METER
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              TACHOMETER
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              AIRFRAME
                            </th>
                            <th
                              colSpan={4}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ENGINE
                            </th>
                            <th
                              colSpan={4}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              PROPELLER
                            </th>
                            <th
                              colSpan={6}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              FUEL
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              OIL
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              REMARKS
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              REMARK PERSON
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ACTION/S
                              <br />
                              TAKEN
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ACTION TAKEN
                              <br />
                              PERSON
                            </th>
                            <th
                              colSpan={6}
                              rowSpan={2}
                              className="px-3 py-3 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap align-middle"
                            >
                              COMPONENT RECORD
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              RETURN TO SERVICE
                            </th>
                            <th
                              colSpan={5}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              PILOT'S ACCEPTANCE
                            </th>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              START
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              END
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TOTAL
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TACH START
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TACH END
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TOTAL
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              HRS
                              <br />
                              RUN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              AFTT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              HRS
                              <br />
                              RUN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TBO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              HRS
                              <br />
                              RUN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TBO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              UPLIFT QTY
                              <br />
                              LEFT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              RIGHT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              PRIOR DEP.
                              <br />
                              LEFT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              RIGHT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              AFTER ON-BLKS
                              <br />
                              LEFT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              RIGHT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              UPLIFT
                              <br />
                              QTY
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              PRIOR DEP.
                              <br />
                              QRE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              AFTER
                              <br />
                              ON-BLKS
                            </th>

                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              NAME
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              NAME
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              WHITE ATL
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DFP
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {paginatedRecords.length === 0 ? (
                            <tr>
                              <td
                                colSpan={51}
                                className="px-6 py-12 text-center text-gray-500"
                              >
                                {searchQuery
                                  ? `No records found matching "${searchQuery}"`
                                  : "No records available"}
                              </td>
                            </tr>
                          ) : (
                            paginatedRecords.map((record, rowIndex) => (
                              <tr
                                key={record.id}
                                className="hover:bg-gray-50/50 transition-colors"
                              >
                                <td className={STICKY_SEQ_CELL_CLASS}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {record.sequenceNo || "-"}
                                    </span>
                                    <div className="flex items-center gap-1 text-blue-600 mt-1">
                                      <button
                                        onClick={() => {
                                          setSelectedEntry(record);
                                          setShowViewModal(true);
                                        }}
                                        className="hover:text-blue-700 hover:underline transition-colors text-xs"
                                        title="View"
                                      >
                                        View
                                      </button>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => {
                                          setSelectedEntry(record);
                                          setShowEditModal(true);
                                        }}
                                        className="hover:text-blue-700 hover:underline transition-colors text-xs"
                                        title="Edit"
                                      >
                                        Edit
                                      </button>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => handleDeleteAtl(record)}
                                        className="text-red-600 hover:underline text-xs"
                                        title="Delete"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td
                                  {...getFleetWorkStatusCellProps(
                                    record.workStatus
                                  )}
                                >
                                  {formatFleetWorkStatus(record.workStatus)}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.natureOfFlight === "VOID"
                                    ? "VOID"
                                    : record.natureOfFlight?.trim()
                                    ? record.natureOfFlight
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.nextInspectionDue || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.tachTimeDue
                                    ? record.tachTimeDue.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.originDate
                                    ? new Date(record.originDate)
                                        .toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                        .replace(/ /g, "-")
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatTimeZulu(record.originTime)}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.destinationDate
                                    ? new Date(record.destinationDate)
                                        .toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                        .replace(/ /g, "-")
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatTimeZulu(record.destinationTime)}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {computeTotalBlockTime(
                                    record.originTime,
                                    record.destinationTime
                                  )}
                                </td>

                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.numberOfLandings || "-"}
                                </td>

                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.hobbsMeterStart != null
                                    ? record.hobbsMeterStart.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.hobbsMeterEnd != null
                                    ? record.hobbsMeterEnd.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.hobbsMeterStart != null &&
                                  record.hobbsMeterEnd != null
                                    ? (
                                        record.hobbsMeterEnd -
                                        record.hobbsMeterStart
                                      ).toFixed(1)
                                    : record.hobbsMeterTotal != null
                                    ? record.hobbsMeterTotal.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.tachometerStart != null
                                    ? record.tachometerStart.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.tachometerEnd != null
                                    ? record.tachometerEnd.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.tachometerStart != null &&
                                  record.tachometerEnd != null
                                    ? (
                                        record.tachometerEnd -
                                        record.tachometerStart
                                      ).toFixed(1)
                                    : record.tachometerTotal != null
                                    ? record.tachometerTotal.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.airframeRunTime ??
                                      record.airframeRunTime
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.airframeAftt ?? record.airframeAftt
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.engineRunTime ?? record.engineRunTime
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.engineTsn ?? record.engineTsn
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.engineTso ?? record.engineTso
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.engineTbo ?? record.engineTbo
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.propellerRunTime ??
                                      record.propellerRunTime
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.propellerTsn ?? record.propellerTsn
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.propellerTso ?? record.propellerTso
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    computedEnginePropellerList[rowIndex]
                                      ?.propellerTbo ?? record.propellerTbo
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftUpliftQty || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightUpliftQty || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftPriorDeparture || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightPriorDeparture || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftAfterOnBlks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightAfterOnBlks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyUpliftQty || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyPriorDeparture || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyAfterOnBlks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.remarks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.maintenanceFk &&
                                  accountsMap.has(record.maintenanceFk)
                                    ? `${
                                        accountsMap.get(record.maintenanceFk)!
                                          .fullName
                                      }-${
                                        accountsMap.get(record.maintenanceFk)!
                                          .licenseNo
                                      }`
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.actionsTaken || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.maintenanceFk &&
                                  accountsMap.has(record.maintenanceFk)
                                    ? `${
                                        accountsMap.get(record.maintenanceFk)!
                                          .fullName
                                      }-${
                                        accountsMap.get(record.maintenanceFk)!
                                          .licenseNo
                                      }`
                                    : "-"}
                                </td>
                                <td
                                  colSpan={6}
                                  className="px-0 py-0 align-top border-r border-gray-200 bg-white"
                                >
                                  <table className="w-full border-collapse min-w-full">
                                    <thead>
                                      <tr className="bg-gray-200">
                                        <th
                                          colSpan={2}
                                          className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300"
                                        >
                                          PARTS REMOVED
                                        </th>
                                        <th
                                          colSpan={2}
                                          className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300"
                                        >
                                          PARTS INSTALLED
                                        </th>
                                        <th
                                          rowSpan={2}
                                          className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300 align-middle"
                                        >
                                          NOMENCLATURE
                                        </th>
                                        <th
                                          rowSpan={2}
                                          className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300 align-middle"
                                        >
                                          ATA CHAPTER
                                        </th>
                                      </tr>
                                      <tr className="bg-white">
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                          P/N
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                          S/N
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                          P/N
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                          S/N
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {record.componentParts &&
                                      record.componentParts.length > 0 ? (
                                        record.componentParts.map(
                                          (part: any, idx: number) => (
                                            <tr
                                              key={idx}
                                              className={
                                                idx % 2 === 0
                                                  ? "bg-white"
                                                  : "bg-gray-50"
                                              }
                                            >
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.removedPartNo ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.removedSerialNo ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.installedPartNo ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.installedSerialNo ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.nomenclature ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.ataChapter ??
                                                  part.ata_chapter ??
                                                  "-"}
                                              </td>
                                            </tr>
                                          )
                                        )
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={6}
                                            className="px-2 py-2 text-center text-gray-500 text-sm border border-gray-200"
                                          >
                                            -
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.rtsSignedBy &&
                                  accountsMap.has(record.rtsSignedBy) ? (
                                    <>
                                      {
                                        accountsMap.get(record.rtsSignedBy)!
                                          .fullName
                                      }
                                      <br />
                                      {
                                        accountsMap.get(record.rtsSignedBy)!
                                          .licenseNo
                                      }
                                    </>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {record.rtsDate || "-"}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {formatTimeZulu(record.rtsTime)}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {(() => {
                                    const pilotId =
                                      record.pilotAcceptedBy ?? record.pilotFk;
                                    return pilotId &&
                                      accountsMap.has(pilotId) ? (
                                      <>
                                        {accountsMap.get(pilotId)!.fullName}
                                        <br />
                                        {accountsMap.get(pilotId)!.licenseNo}
                                      </>
                                    ) : (
                                      "-"
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {record.pilotAcceptDate?.trim()
                                    ? record.pilotAcceptDate
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {record.pilotAcceptTime?.trim()
                                    ? formatTimeZulu(record.pilotAcceptTime)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {record.whiteAtl &&
                                  record.whiteAtl.trim() !== "" ? (
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleDownloadFile(
                                            "white_atl",
                                            record.whiteAtl!,
                                            record.whiteAtl!.split("/").pop() ||
                                              "white_atl"
                                          )
                                        }
                                      >
                                        <Download className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">
                                          Download
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleViewFile(
                                            "white_atl",
                                            record.whiteAtl!
                                          )
                                        }
                                      >
                                        <Eye className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">View</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-900">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm bg-white">
                                  {record.dfp && record.dfp.trim() !== "" ? (
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleDownloadFile(
                                            "dfp",
                                            record.dfp!,
                                            record.dfp!.split("/").pop() ||
                                              "dfp"
                                          )
                                        }
                                      >
                                        <Download className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">
                                          Download
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleViewFile("dfp", record.dfp!)
                                        }
                                      >
                                        <Eye className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">View</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-900">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Fuel and Oil Data */}
                {groupBy === "fuelAndOilData" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className={STICKY_SEQ_CLASS}>ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NATURE OF FLIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            OFF BLOCKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ON BLOCKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            TOTAL FLIGHT TIME
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            FUEL UPLIFT QTY (L) / (R)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            OIL UPLIFT QTY
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            REMARKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NAME AND LICENSE
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-5 py-8 text-center text-gray-500 text-sm"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className={STICKY_SEQ_CELL_CLASS}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {record.sequenceNo || "-"}
                                  </span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-1">
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowViewModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      View
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowEditModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => handleDeleteAtl(record)}
                                      className="text-red-600 hover:underline text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.natureOfFlight === "VOID"
                                  ? "VOID"
                                  : record.natureOfFlight?.trim()
                                  ? record.natureOfFlight
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.originDate
                                  ? new Date(record.originDate)
                                      .toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                      .replace(/ /g, "-")
                                  : "-"}
                                {record.originTime
                                  ? ` ${formatTimeZulu(record.originTime)}`
                                  : ""}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.destinationDate
                                  ? new Date(record.destinationDate)
                                      .toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                      .replace(/ /g, "-")
                                  : "-"}
                                {record.destinationTime
                                  ? ` ${formatTimeZulu(record.destinationTime)}`
                                  : ""}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {computeTotalBlockTime(
                                  record.originTime,
                                  record.destinationTime
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyLeftUpliftQty ?? "-"} /{" "}
                                {record.fuelQtyRightUpliftQty ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.oilQtyUpliftQty ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.remarks || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {record.maintenanceFk &&
                                accountsMap.has(record.maintenanceFk)
                                  ? `${
                                      accountsMap.get(record.maintenanceFk)!
                                        .fullName
                                    } - ${
                                      accountsMap.get(record.maintenanceFk)!
                                        .licenseNo
                                    }`
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Maintenance Planning — separate columns: OFF BLOCKS, ON BLOCKS, AIRFRAME RUN/AFTT, ENGINE RUN/TSN/TSO/TBO, PROPELLER RUN/TSN/TSO/TBO */}
                {groupBy === "maintenancePlanning" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className={`${STICKY_SEQ_CLASS} rounded-tl-lg`}>
                            ATL SEQ
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NATURE OF FLIGHT
                          </th>

                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            DATE | OFF BLOCKS
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            DATE | ON BLOCKS
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AIRFRAME RUN
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AIRFRAME AFTT
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ENGINE RUN
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ENGINE TSN
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ENGINE TSO
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ENGINE TBO
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PROPELLER RUN
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PROPELLER TSN
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PROPELLER TSO
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap rounded-tr-lg">
                            PROPELLER TBO
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={16}
                              className="px-5 py-8 text-center text-gray-500 text-sm"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record, rowIndex) => {
                            const comp = computedEnginePropellerList[rowIndex];
                            return (
                              <tr key={record.id} className="hover:bg-gray-50">
                                <td className={STICKY_SEQ_CELL_CLASS}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {record.sequenceNo || "-"}
                                    </span>
                                    <div className="flex items-center gap-1 text-blue-600 mt-1">
                                      <button
                                        onClick={() => {
                                          setSelectedEntry(record);
                                          setShowViewModal(true);
                                        }}
                                        className="hover:underline text-xs"
                                      >
                                        View
                                      </button>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => {
                                          setSelectedEntry(record);
                                          setShowEditModal(true);
                                        }}
                                        className="hover:underline text-xs"
                                      >
                                        Edit
                                      </button>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => handleDeleteAtl(record)}
                                        className="text-red-600 hover:underline text-xs"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {record.natureOfFlight === "VOID"
                                    ? "VOID"
                                    : record.natureOfFlight?.trim()
                                    ? record.natureOfFlight
                                    : "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200 whitespace-nowrap">
                                  {record.originDate
                                    ? new Date(record.originDate)
                                        .toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                        .replace(/ /g, "-")
                                    : "-"}
                                  {record.originTime
                                    ? ` ${formatTimeZulu(record.originTime)}`
                                    : ""}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200 whitespace-nowrap">
                                  {record.destinationDate
                                    ? new Date(record.destinationDate)
                                        .toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                        .replace(/ /g, "-")
                                    : "-"}
                                  {record.destinationTime
                                    ? ` ${formatTimeZulu(
                                        record.destinationTime
                                      )}`
                                    : ""}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.airframeRunTime != null
                                    ? toFormat2(comp.airframeRunTime)
                                    : getAirframeDisplay(record, comp)?.split(
                                        " / "
                                      )?.[0] ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.airframeAftt != null
                                    ? toFormat2(comp.airframeAftt)
                                    : getAirframeDisplay(record, comp)?.split(
                                        " / "
                                      )?.[1] ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.engineRunTime != null
                                    ? toFormat2(comp.engineRunTime)
                                    : getEngineDisplay(record, comp)
                                        ?.split(" / ")?.[0]
                                        ?.replace("RUN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.engineTsn != null
                                    ? toFormat2(comp.engineTsn)
                                    : getEngineDisplay(record, comp)
                                        ?.split(" / ")?.[1]
                                        ?.replace("TSN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.engineTso != null
                                    ? toFormat2(comp.engineTso)
                                    : getEngineDisplay(record, comp)
                                        ?.split(" / ")?.[2]
                                        ?.replace("TSO ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.engineTbo != null
                                    ? toFormat2(comp.engineTbo)
                                    : getEngineDisplay(record, comp)
                                        ?.split(" / ")?.[3]
                                        ?.replace("TBO ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.propellerRunTime != null
                                    ? toFormat2(comp.propellerRunTime)
                                    : getPropellerDisplay(record, comp)
                                        ?.split(" / ")?.[0]
                                        ?.replace("RUN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.propellerTsn != null
                                    ? toFormat2(comp.propellerTsn)
                                    : getPropellerDisplay(record, comp)
                                        ?.split(" / ")?.[1]
                                        ?.replace("TSN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {comp?.propellerTso != null
                                    ? toFormat2(comp.propellerTso)
                                    : getPropellerDisplay(record, comp)
                                        ?.split(" / ")?.[2]
                                        ?.replace("TSO ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {comp?.propellerTbo != null
                                    ? toFormat2(comp.propellerTbo)
                                    : getPropellerDisplay(record, comp)
                                        ?.split(" / ")?.[3]
                                        ?.replace("TBO ", "") ?? "-"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Reliability Monitoring */}
                {groupBy === "reliabilityMonitoring" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className={STICKY_SEQ_CLASS}>ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NATURE OF FLIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AIRFRAME (RUN / AFTT)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            TOTAL FLIGHT TIME
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NO. OF LANDINGS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            REMARKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ACTION TAKEN
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            COMPONENT RECORD
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-5 py-8 text-center text-gray-500 text-sm"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record, rowIndex) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className={STICKY_SEQ_CELL_CLASS}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {record.sequenceNo || "-"}
                                  </span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-1">
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowViewModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      View
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowEditModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => handleDeleteAtl(record)}
                                      className="text-red-600 hover:underline text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.natureOfFlight === "VOID"
                                  ? "VOID"
                                  : record.natureOfFlight?.trim()
                                  ? record.natureOfFlight
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {getAirframeDisplay(
                                  record,
                                  computedEnginePropellerList[rowIndex]
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {computeTotalBlockTime(
                                  record.originTime,
                                  record.destinationTime
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.numberOfLandings ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.remarks || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.actionsTaken || "-"}
                              </td>
                              <td className="px-0 py-0 align-top border-r border-gray-200">
                                <table className="w-full border-collapse min-w-full">
                                  <thead>
                                    <tr className="bg-gray-200">
                                      <th
                                        colSpan={2}
                                        className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300"
                                      >
                                        PARTS REMOVED
                                      </th>
                                      <th
                                        colSpan={2}
                                        className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300"
                                      >
                                        PARTS INSTALLED
                                      </th>
                                      <th
                                        rowSpan={2}
                                        className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300 align-middle"
                                      >
                                        NOMENCLATURE
                                      </th>
                                      <th
                                        rowSpan={2}
                                        className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300 align-middle"
                                      >
                                        ATA CHAPTER
                                      </th>
                                    </tr>
                                    <tr className="bg-white">
                                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                        P/N
                                      </th>
                                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                        S/N
                                      </th>
                                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                        P/N
                                      </th>
                                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                        S/N
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.componentParts &&
                                    record.componentParts.length > 0 ? (
                                      record.componentParts.map(
                                        (part: any, idx: number) => (
                                          <tr
                                            key={idx}
                                            className={
                                              idx % 2 === 0
                                                ? "bg-white"
                                                : "bg-gray-50"
                                            }
                                          >
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.removedPartNo ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.removedSerialNo ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.installedPartNo ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.installedSerialNo ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.nomenclature ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.ataChapter ??
                                                part.ata_chapter ??
                                                "-"}
                                            </td>
                                          </tr>
                                        )
                                      )
                                    ) : (
                                      <tr>
                                        <td
                                          colSpan={6}
                                          className="px-2 py-2 text-center text-gray-500 text-sm border border-gray-200"
                                        >
                                          -
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing{" "}
                {totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                {totalRecords} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal – CREATE */}
      <AddTechnicalLogbookEntryModal
        isOpen={showAddRecordModal}
        onClose={() => setShowAddRecordModal(false)}
        aircraftId={aircraftId}
        onSuccess={() => {
          setShowAddRecordModal(false);
          refreshPage();
        }}
      />

      {/* Edit Entry Modal – READ + UPDATE */}
      {selectedEntry && (
        <EditTechnicalLogbookEntryModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
          }}
          entryId={selectedEntry.id}
          aircraftId={aircraftId}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
            refreshPage();
          }}
        />
      )}

      {/* View Entry Modal – READ */}
      {selectedEntry && (
        <ViewTechnicalLogbookEntryModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedEntry(null);
          }}
          entry={{
            id: selectedEntry.id,
            line: 0,
            seqNo: selectedEntry.sequenceNo || "",
            date:
              selectedEntry.originDate || selectedEntry.destinationDate || "",
            acReg: selectedEntry.aircraft?.registration || "",
            route: `${selectedEntry.originStation || ""} → ${
              selectedEntry.destinationStation || ""
            }`,
            fltTime: `${computeTotalFlightHoursDecimal(
              selectedEntry.originTime,
              selectedEntry.destinationTime
            ).toFixed(2)}h`,
            pilot: selectedEntry.remarks?.split("\n")[0] || "N/A",
            status: "Serviceable",
          }}
          fullEntry={selectedEntry}
        />
      )}

      {/* File View Modal – view uploaded file (WHITE ATL / DFP) */}
      {showFileViewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={closeFileViewModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-900">
                View file
              </span>
              <button
                type="button"
                onClick={closeFileViewModal}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 min-h-[320px] flex items-center justify-center bg-gray-50">
              {fileViewLoading && (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Spinner />
                  <span className="text-sm">Loading file…</span>
                </div>
              )}
              {fileViewError && !fileViewLoading && (
                <div className="text-center text-red-600 text-sm">
                  {fileViewError}
                </div>
              )}
              {fileViewBlobUrl && !fileViewLoading && !fileViewError && (
                <>
                  {/* JPG, JPEG, PNG, GIF, WebP – image preview */}
                  {(fileViewMimeType?.startsWith("image/") ||
                    fileViewMimeType === "image/jpeg" ||
                    fileViewMimeType === "image/jpg") && (
                    <img
                      src={fileViewBlobUrl}
                      alt="File preview"
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )}
                  {/* PDF – iframe preview */}
                  {(fileViewMimeType === "application/pdf" ||
                    fileViewMimeType?.includes("pdf")) && (
                    <iframe
                      src={fileViewBlobUrl}
                      title="File preview"
                      className="w-full h-[70vh] border-0 rounded"
                    />
                  )}
                  {fileViewBlobUrl &&
                    !fileViewMimeType?.startsWith("image/") &&
                    fileViewMimeType !== "image/jpeg" &&
                    fileViewMimeType !== "image/jpg" &&
                    fileViewMimeType !== "application/pdf" &&
                    !fileViewMimeType?.includes("pdf") && (
                      <div className="text-center text-gray-600 text-sm">
                        <p className="mb-2">
                          Preview not available for this file type.
                        </p>
                        <a
                          href={fileViewBlobUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open in new tab / Download
                        </a>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
