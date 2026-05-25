import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
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
  Filter,
  CheckCircle2,
} from "lucide-react";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { AddAtlBatchModal } from "./AddAtlBatchModal";
import { EditTechnicalLogbookEntryModal } from "./EditTechnicalLogbookEntryModal";
import { ViewTechnicalLogbookEntryModal } from "./ViewTechnicalLogbookEntryModal";
import {
  getAircraftTechnicalLogs,
  deleteAircraftTechnicalLog,
  startAtlExcelImport,
  pollAtlExcelImportUntilDone,
  getAtlExcelImportProcessPercent,
  formatAtlExcelImportProgressLabel,
  getAtlBatchesForSelect,
  pickLatestAtlBatchId,
  type AtlExcelImportProgress,
  AircraftTechnicalLog,
  type AtlBatch,
  type AtlListViewComputedComponentTimes,
  type ComponentPartsRecord,
  resolveAtlComponentMetric,
} from "../api/aircraftTechnicalLogApi";
import { getAircraftById } from "../api/aircraftApi";
import apiClient from "../api/index";
import Swal from "sweetalert2";
import { Spinner, SpinnerIcon } from "./ui/spinner";
import { DataTablePagination } from "./ui/DataTablePagination";
import { Checkbox } from "./ui/checkbox";
import { Aircraft } from "../types/Aircraft";
import {
  toCamelDeep,
  formatApiErrorForSwal,
  formatTimeZulu,
  computeTotalBlockTimeFromUtc,
  computeTotalFlightHoursDecimalFromUtc,
} from "../utility/utils";
import {
  getMissingAircraftFieldsForNewAtl,
  buildAircraftDetailsRequiredForAtlHtml,
  ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
  resolveAircraftAirframeAftt,
  resolveAircraftEnginePropHour,
} from "../utility/atlAircraftPrerequisites";
import {
  ATL_WORK_STATUS_KEYS,
  isAtlBatchBranchEditRole,
  isAtlBatchFilterAndBranchManagementRole,
  isAtlEditAllowedForRoleAndWorkStatus,
  isMechanicRole,
  isTechnicalPublicationRole,
  normalizeAtlWorkStatus,
  type AtlWorkStatusKey,
} from "../utility/atlEditRbac";
import { getAllAccounts, Account } from "../api/accountApi";
import { getMe } from "../api/authApi";
import { useUserPermissions } from "../hooks/useUserPermissions";
import * as XLSX from "xlsx";

type GroupByOption =
  | "allColumns"
  | "fuelAndOilData"
  | "maintenancePlanning"
  | "reliabilityMonitoring";

/** Nested `component_parts` from paged API may be camelCase or snake_case. */
type AtlComponentPartRow = ComponentPartsRecord & {
  part_removed_remaining_time?: string | number;
  part_installed_remaining_time?: string | number;
  part_remark?: string;
  ata_chapter?: string;
};

const STICKY_SEQ_CLASS =
  "px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px] w-[140px]";
const STICKY_SEQ_CELL_CLASS =
  "px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium";

/** Fleet Time Monitoring table: API may return FOR_REVIEW or "FOR REVIEW" */
function formatFleetWorkStatus(status: string | undefined): string {
  if (!status || status.trim() === "") return "-";
  return status.replace(/_/g, " ");
}

/** All batches filter: show "Batch name - sequence no"; single-batch filter: sequence only. */
function formatOperationSequenceNoCell(
  record: AircraftTechnicalLog,
  allBatchesMode: boolean
): string {
  const seq = (record.sequenceNo ?? "").trim() || "-";
  if (!allBatchesMode) return seq;
  const batchName = record.atlBatch?.name?.trim();
  if (batchName) return `${batchName} - ${seq}`;
  return seq;
}

const FLEET_WORK_STATUS_BASE_TD =
  "px-3 py-3 text-sm border-r border-gray-200 whitespace-nowrap";
const OPERATION_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Sentinel `<option>` values — not real branch ids */
const ATL_BRANCH_CREATE_VALUE = "__atl_branch_create__";
const ATL_BRANCH_EDIT_VALUE = "__atl_branch_edit__";

type ExportColumnDefinition = {
  key: string;
  label: string;
  getValue: (record: AircraftTechnicalLog) => string;
};

/** Visual grouping for the Export Columns picker. Order = display order. */
type ExportColumnSubGroup = {
  id: string;
  label: string;
  keys: string[];
  /** Sub-groups marked advanced collapse by default to keep critical fields visible first. */
  defaultCollapsed?: boolean;
};

type ExportColumnCategory = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  accentText: string;
  subGroups?: ExportColumnSubGroup[];
  /** Flat union of all keys (equals concat of subGroups[].keys when present). */
  keys: string[];
};

const EXPORT_COLUMN_CATEGORIES: ExportColumnCategory[] = [
  {
    id: "general",
    label: "General Information",
    shortLabel: "General",
    description: "Sequence, status, and flight identification.",
    accent: "bg-blue-500",
    accentText: "text-blue-600",
    keys: [
      "sequenceNo",
      "workStatus",
      "natureOfFlight",
      "nextInspectionDue",
      "tachTimeDue",
    ],
  },
  {
    id: "blockTimes",
    label: "Flight & Landing",
    shortLabel: "Flight",
    description: "Off / on blocks times, totals, and landings.",
    accent: "bg-indigo-500",
    accentText: "text-indigo-600",
    subGroups: [
      {
        id: "offBlocks",
        label: "Off Blocks",
        keys: ["originDate", "originTime", "offBlocks"],
      },
      {
        id: "onBlocks",
        label: "On Blocks",
        keys: ["destinationDate", "destinationTime", "onBlocks"],
      },
      {
        id: "totals",
        label: "Totals",
        keys: ["totalFlightHours", "numberOfLandings"],
      },
    ],
    keys: [
      "originDate",
      "originTime",
      "offBlocks",
      "destinationDate",
      "destinationTime",
      "onBlocks",
      "totalFlightHours",
      "numberOfLandings",
    ],
  },
  {
    id: "hobbsTach",
    label: "Hobbs & Tachometer",
    shortLabel: "Hobbs / Tach",
    description: "Hobbs meter and tachometer readings.",
    accent: "bg-cyan-500",
    accentText: "text-cyan-600",
    subGroups: [
      {
        id: "hobbs",
        label: "Hobbs",
        keys: ["hobbsMeterStart", "hobbsMeterEnd", "hobbsMeterTotal"],
      },
      {
        id: "tachometer",
        label: "Tachometer",
        keys: ["tachometerStart", "tachometerEnd"],
      },
    ],
    keys: [
      "hobbsMeterStart",
      "hobbsMeterEnd",
      "hobbsMeterTotal",
      "tachometerStart",
      "tachometerEnd",
    ],
  },
  {
    id: "airframeEngineProp",
    label: "Airframe / Engine / Propeller",
    shortLabel: "A / E / P",
    description: "Run times, TSN, TSO, TBO, and AFTT metrics.",
    accent: "bg-emerald-500",
    accentText: "text-emerald-600",
    subGroups: [
      {
        id: "airframe",
        label: "Airframe",
        keys: ["airframeRun", "airframeAftt"],
      },
      {
        id: "engine",
        label: "Engine",
        keys: ["engineRun", "engineTsn", "engineTso", "engineTbo"],
      },
      {
        id: "propeller",
        label: "Propeller",
        keys: [
          "propellerRun",
          "propellerTsn",
          "propellerTso",
          "propellerTbo",
        ],
        defaultCollapsed: true,
      },
    ],
    keys: [
      "airframeRun",
      "airframeAftt",
      "engineRun",
      "engineTsn",
      "engineTso",
      "engineTbo",
      "propellerRun",
      "propellerTsn",
      "propellerTso",
      "propellerTbo",
    ],
  },
  {
    id: "fuelOil",
    label: "Fuel & Oil",
    shortLabel: "Fuel / Oil",
    description: "Uplift, prior departure, and after on-blocks quantities.",
    accent: "bg-amber-500",
    accentText: "text-amber-600",
    subGroups: [
      {
        id: "fuel",
        label: "Fuel",
        keys: [
          "fuelQtyLeftUpliftQty",
          "fuelQtyRightUpliftQty",
          "fuelQtyLeftPriorDeparture",
          "fuelQtyRightPriorDeparture",
          "fuelQtyLeftAfterOnBlks",
          "fuelQtyRightAfterOnBlks",
        ],
      },
      {
        id: "oil",
        label: "Oil",
        keys: [
          "oilQtyUpliftQty",
          "oilQtyPriorDeparture",
          "oilQtyAfterOnBlks",
        ],
      },
    ],
    keys: [
      "fuelQtyLeftUpliftQty",
      "fuelQtyRightUpliftQty",
      "fuelQtyLeftPriorDeparture",
      "fuelQtyRightPriorDeparture",
      "fuelQtyLeftAfterOnBlks",
      "fuelQtyRightAfterOnBlks",
      "oilQtyUpliftQty",
      "oilQtyPriorDeparture",
      "oilQtyAfterOnBlks",
    ],
  },
  {
    id: "maintenance",
    label: "Remarks & Actions",
    shortLabel: "Remarks",
    description: "Remarks, actions taken, and responsible mechanics.",
    accent: "bg-rose-500",
    accentText: "text-rose-600",
    subGroups: [
      {
        id: "remarks",
        label: "Remarks",
        keys: ["remarks", "remarkPerson", "maintenanceNameLicense"],
      },
      {
        id: "actions",
        label: "Actions Taken",
        keys: ["actionsTaken", "actionTakenPerson"],
      },
    ],
    keys: [
      "remarks",
      "remarkPerson",
      "maintenanceNameLicense",
      "actionsTaken",
      "actionTakenPerson",
    ],
  },
  {
    id: "components",
    label: "Component Parts",
    shortLabel: "Parts",
    description: "Removed / installed parts and component metadata.",
    accent: "bg-purple-500",
    accentText: "text-purple-600",
    subGroups: [
      {
        id: "removed",
        label: "Removed Parts",
        keys: [
          "componentRemovedPn",
          "componentRemovedSn",
          "componentRemovedRemTime",
        ],
      },
      {
        id: "installed",
        label: "Installed Parts",
        keys: [
          "componentInstalledPn",
          "componentInstalledSn",
          "componentInstalledRemTime",
        ],
      },
      {
        id: "metadata",
        label: "Metadata",
        keys: [
          "componentNomenclature",
          "componentAtaChapter",
          "componentPartRemarks",
        ],
        defaultCollapsed: true,
      },
    ],
    keys: [
      "componentRemovedPn",
      "componentRemovedSn",
      "componentRemovedRemTime",
      "componentInstalledPn",
      "componentInstalledSn",
      "componentInstalledRemTime",
      "componentNomenclature",
      "componentAtaChapter",
      "componentPartRemarks",
    ],
  },
  {
    id: "reporting",
    label: "Reporting",
    shortLabel: "Reporting",
    description: "Defect reported and released timestamps.",
    accent: "bg-sky-500",
    accentText: "text-sky-600",
    keys: ["dateTimeReported", "dateTimeReleased"],
  },
  {
    id: "release",
    label: "Release & Acceptance",
    shortLabel: "Release",
    description: "Return-to-service and pilot acceptance sign-off.",
    accent: "bg-teal-500",
    accentText: "text-teal-600",
    subGroups: [
      {
        id: "rts",
        label: "Return to Service",
        keys: ["rtsSignedBy", "rtsDate", "rtsTime"],
      },
      {
        id: "pilotAcceptance",
        label: "Pilot Acceptance",
        keys: ["pilotAcceptedBy", "pilotAcceptDate", "pilotAcceptTime"],
        defaultCollapsed: true,
      },
    ],
    keys: [
      "rtsSignedBy",
      "rtsDate",
      "rtsTime",
      "pilotAcceptedBy",
      "pilotAcceptDate",
      "pilotAcceptTime",
    ],
  },
];

/** Composite id "<categoryId>:<subGroupId>" for tracking accordion open/closed overrides. */
function subGroupKey(categoryId: string, subGroupId: string): string {
  return `${categoryId}:${subGroupId}`;
}

function toNullableMetricNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

/** Hobbs / tach / tach due: API may send numbers as strings; avoids `.toFixed` runtime errors. */
function formatOptionalNumber1dp(value: unknown): string {
  if (value == null || value === "") return "-";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "-";
}

/** Tailwind default palette (50 / 800) — inline styles so colors work with the bundled CSS (many bg/text utilities are not emitted). */
const FLEET_WORK_STATUS_STYLE: Record<AtlWorkStatusKey, CSSProperties> = {
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
  const key = normalizeAtlWorkStatus(status);
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

function escapeForSwalHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** SweetAlert2 `html` body: large percent + subtitle + bar (Tailwind classes from bundled CSS). */
function atlImportProgressSwalHtml(percent: number, subtitle: string): string {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const sub = escapeForSwalHtml(subtitle.trim() || "Processing…");
  return `<div class="text-center py-1">
    <p class="text-3xl font-bold text-slate-800 tracking-tight">${pct}%</p>
    <p class="text-sm text-slate-500 mt-2">${sub}</p>
    <div class="mt-4 h-2.5 w-full max-w-xs mx-auto rounded-full bg-slate-200 overflow-hidden">
      <div class="h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out" style="width:${pct}%"></div>
    </div>
  </div>`;
}

export function Operation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, canUpdate, canCreate, canDelete } = useUserPermissions();
  const aircraftId = parseInt(id || "1", 10);
  const navigationState = (location.state ?? {}) as {
    aircraft_id?: number | string;
    sequence_no?: string;
  };

  /** Role name from GET /auth/me — aligns ATL edit RBAC with login session (same as Edit modal). */
  const [sessionRoleName, setSessionRoleName] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setSessionRoleName(me.role?.trim() || undefined);
      })
      .catch(() => {
        if (!cancelled) setSessionRoleName(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const operationAtlRole = useMemo(
    () => sessionRoleName || user?.role?.trim() || undefined,
    [sessionRoleName, user?.role]
  );

  const canManageAtlBatchFilterAndBranches = useMemo(
    () => isAtlBatchFilterAndBranchManagementRole(operationAtlRole),
    [operationAtlRole]
  );

  /** Mechanic is blocked from exporting Fleet Time data and from the Aircraft Details
   * history page; ATL batch filter visibility is universal and handled separately. */
  const isMechanicViewer = useMemo(
    () => isMechanicRole(operationAtlRole),
    [operationAtlRole]
  );
  const canExportOperationAtl = !isMechanicViewer;
  /** Create/Edit ATL batch (branch) is restricted to Admin, Maintenance Planner, and
   * Maintenance Manager. All other roles (incl. Mechanic) see the filter only. */
  const canEditAtlBatchBranches = useMemo(
    () => isAtlBatchBranchEditRole(operationAtlRole),
    [operationAtlRole]
  );

  const operationTechPubUploadOnly =
    isTechnicalPublicationRole(operationAtlRole);

  const canCreateOperationAtl = canCreate("operation") || canCreate("logbook");
  const canUpdateOperationAtl = canUpdate("operation") || canUpdate("logbook");
  const canDeleteOperationAtl = canDelete("operation") || canDelete("logbook");
  /** Align with Add modal: create checks canCreate(mod); must be "operation" if user can create/update ATL under operation, not only when they can update. */
  const operationAtlPermissionModuleCode =
    canUpdate("operation") || canCreate("operation") ? "operation" : "logbook";

  const allowAtlEditForRecord = (record: AircraftTechnicalLog) =>
    isAtlEditAllowedForRoleAndWorkStatus(operationAtlRole, record.workStatus);

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
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        displayName || filename.trim().split("/").pop() || "download";
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
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, filename);
      const url = window.URL.createObjectURL(blob);
      const serverType =
        blob.type || (blob as Blob & { type?: string }).type || null;
      const isOctetStream =
        !serverType || serverType === "application/octet-stream";
      const mimeType = isOctetStream
        ? getMimeFromFilename(filename)
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
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    OPERATION_PAGE_SIZE_OPTIONS[0]
  );
  const [selectedAircraftId, setSelectedAircraftId] = useState<number>(
    Number.isFinite(aircraftId) ? aircraftId : 0
  );
  const sequenceFromQuery = useMemo(
    () => searchParams.get("sequence_no")?.trim() ?? "",
    [searchParams]
  );
  const [selectedSequenceNo, setSelectedSequenceNo] = useState(
    () =>
      sequenceFromQuery ||
      (typeof navigationState.sequence_no === "string"
        ? navigationState.sequence_no.trim()
        : "")
  );
  const [searchQuery, setSearchQuery] = useState(selectedSequenceNo);
  /** Empty = no filter; API query param work_status (e.g. REJECTED_MAINTENANCE) */
  const [workStatusFilter, setWorkStatusFilter] = useState("");
  const [selectedAtlBatchId, setSelectedAtlBatchId] = useState("");
  const [atlBatchFilterOptions, setAtlBatchFilterOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [atlBatchModalOpen, setAtlBatchModalOpen] = useState(false);
  const [atlBatchModalEditId, setAtlBatchModalEditId] = useState<number | null>(
    null
  );
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(
    []
  );
  const [exportColumnSearch, setExportColumnSearch] = useState("");
  const [activeExportCategoryId, setActiveExportCategoryId] = useState<string>(
    EXPORT_COLUMN_CATEGORIES[0]?.id ?? ""
  );
  /** Per-subgroup override of expand/collapse state. Missing entry → defaultCollapsed from def. */
  const [exportSubGroupOverrides, setExportSubGroupOverrides] = useState<
    Record<string, boolean>
  >({});
  const importFileInputRef = useRef<HTMLInputElement>(null);
  /** User changed batch filter (incl. "All"); blocks auto-default to latest batch on reload. */
  const atlBatchFilterTouchedRef = useRef(false);
  const effectiveAircraftId =
    Number.isFinite(selectedAircraftId) && selectedAircraftId > 0
      ? selectedAircraftId
      : aircraftId;

  const selectedAtlBatchFk = useMemo(() => {
    if (!canManageAtlBatchFilterAndBranches) return undefined;
    const n =
      selectedAtlBatchId.trim() !== "" ? Number(selectedAtlBatchId) : NaN;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [canManageAtlBatchFilterAndBranches, selectedAtlBatchId]);

  /** "All" batch filter (or no batch param) → Sequence column shows `Batch name - seq`. */
  const showSeqNoWithBatchName = selectedAtlBatchFk == null;

  useEffect(() => {
    if (Number.isFinite(aircraftId) && aircraftId > 0) {
      setSelectedAircraftId(aircraftId);
    }
  }, [aircraftId]);

  useEffect(() => {
    const nextAircraftId = Number(navigationState.aircraft_id);
    const normalizedAircraftId =
      Number.isFinite(nextAircraftId) && nextAircraftId > 0
        ? nextAircraftId
        : aircraftId;
    const nextSequenceNo =
      sequenceFromQuery ||
      (typeof navigationState.sequence_no === "string"
        ? navigationState.sequence_no.trim()
        : "");

    setSelectedAircraftId(normalizedAircraftId);
    setSelectedSequenceNo(nextSequenceNo);
    setSearchQuery(nextSequenceNo);
    setCurrentPage(1);
  }, [
    aircraftId,
    navigationState.aircraft_id,
    navigationState.sequence_no,
    sequenceFromQuery,
  ]);

  const getAirframeDisplay = (r: AircraftTechnicalLog) => {
    const run =
      resolveAtlComponentMetric(r, "airframeRunTime") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "airframeRunTime")))
        : "-";
    const aftt =
      resolveAtlComponentMetric(r, "airframeAftt") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "airframeAftt")))
        : "-";
    return `${run} / ${aftt}`;
  };
  const getEngineDisplay = (r: AircraftTechnicalLog) => {
    const run =
      resolveAtlComponentMetric(r, "engineRunTime") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "engineRunTime")))
        : "-";
    const tsn =
      resolveAtlComponentMetric(r, "engineTsn") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "engineTsn")))
        : "-";
    const tso =
      resolveAtlComponentMetric(r, "engineTso") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "engineTso")))
        : "-";
    const tbo =
      resolveAtlComponentMetric(r, "engineTbo") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "engineTbo")))
        : "-";
    return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
  };
  const getPropellerDisplay = (r: AircraftTechnicalLog) => {
    const run =
      resolveAtlComponentMetric(r, "propellerRunTime") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "propellerRunTime")))
        : "-";
    const tsn =
      resolveAtlComponentMetric(r, "propellerTsn") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "propellerTsn")))
        : "-";
    const tso =
      resolveAtlComponentMetric(r, "propellerTso") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "propellerTso")))
        : "-";
    const tbo =
      resolveAtlComponentMetric(r, "propellerTbo") != null
        ? toFormat2(Number(resolveAtlComponentMetric(r, "propellerTbo")))
        : "-";
    return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
  };

  const editListComputedTimes =
    useMemo<AtlListViewComputedComponentTimes | null>(
      () =>
        selectedEntry
          ? {
              airframeRunTime: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "airframeRunTime")
              ),
              airframeAftt: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "airframeAftt")
              ),
              engineRunTime: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "engineRunTime")
              ),
              engineTsn: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "engineTsn")
              ),
              engineTso: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "engineTso")
              ),
              engineTbo: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "engineTbo")
              ),
              propellerRunTime: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "propellerRunTime")
              ),
              propellerTsn: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "propellerTsn")
              ),
              propellerTso: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "propellerTso")
              ),
              propellerTbo: toNullableMetricNumber(
                resolveAtlComponentMetric(selectedEntry, "propellerTbo")
              ),
            }
          : null,
      [selectedEntry]
    );

  // Fetch aircraft information
  useEffect(() => {
    const fetchAircraft = async () => {
      if (!effectiveAircraftId) return;
      try {
        const response = await getAircraftById(effectiveAircraftId);
        setAircraft(toCamelDeep(response.data) as Aircraft);
      } catch (err) {
        console.error("Error fetching aircraft:", err);
      }
    };
    fetchAircraft();
  }, [effectiveAircraftId]);

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

  useEffect(() => {
    if (!canManageAtlBatchFilterAndBranches) {
      setAtlBatchFilterOptions([]);
      return;
    }
    let cancelled = false;
    getAtlBatchesForSelect()
      .then((list) => {
        if (cancelled) return;
        const batches = Array.isArray(list) ? list : [];
        setAtlBatchFilterOptions(
          batches.map((b) => ({ id: b.id, name: b.name }))
        );
        setSelectedAtlBatchId((prev) => {
          if (batches.length === 0) return prev;
          if (prev !== "") return prev;
          if (atlBatchFilterTouchedRef.current) return prev;
          const latest = pickLatestAtlBatchId(batches);
          return latest != null ? String(latest) : prev;
        });
      })
      .catch(() => {
        if (!cancelled) setAtlBatchFilterOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canManageAtlBatchFilterAndBranches]);

  useEffect(() => {
    if (!canManageAtlBatchFilterAndBranches) {
      setSelectedAtlBatchId("");
      atlBatchFilterTouchedRef.current = false;
      setAtlBatchModalOpen(false);
      setAtlBatchModalEditId(null);
    }
  }, [canManageAtlBatchFilterAndBranches]);

  // Fleet Time list: GET /api/v1/aircraft-technical-log/paged (see getAircraftTechnicalLogs)
  useEffect(() => {
    const fetchRecords = async () => {
      if (!effectiveAircraftId) return;

      setLoading(true);
      setError(null);
      try {
        const sortParam =
          sequenceSort === "asc" ? "sequence_no" : "-sequence_no";
        const response = await getAircraftTechnicalLogs(
          currentPage,
          itemsPerPage,
          selectedSequenceNo,
          effectiveAircraftId,
          sortParam,
          workStatusFilter || undefined,
          selectedAtlBatchFk
        );
        setFleetTimeRecords(
          Array.isArray(response.items) ? response.items : []
        );
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
    effectiveAircraftId,
    currentPage,
    itemsPerPage,
    selectedSequenceNo,
    refreshKey,
    sequenceSort,
    workStatusFilter,
    selectedAtlBatchFk,
  ]);

  // Reset to page 1 when search or work status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSequenceNo, workStatusFilter, itemsPerPage, selectedAtlBatchId]);

  const paginatedRecords = fleetTimeRecords;

  /** Format ATL component values from the API with 2 decimal places. */
  const toFormat2 = (v: unknown): string => {
    const n = v != null && v !== "" ? Number(v) : null;
    return n != null && Number.isFinite(n) ? n.toFixed(2) : "-";
  };
  const formatDisplayDate = (value?: string | null) =>
    value
      ? new Date(value)
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .replace(/ /g, "-")
      : "-";

  /** `date_time_reported` / `date_time_released` (ISO or date) for list cells */
  const formatAtlDateTimeListCell = (raw?: string | null) => {
    if (raw == null || String(raw).trim() === "") return "-";
    const s = String(raw).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2}(?::\d{2})?)/i);
    if (m) {
      const dateLine = formatDisplayDate(m[1]);
      const timeLine = formatTimeZulu(m[2].slice(0, 5));
      return timeLine && timeLine !== "-"
        ? `${dateLine} ${timeLine}`.trim()
        : dateLine;
    }
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${formatDisplayDate(`${y}-${mo}-${day}`)} ${formatTimeZulu(
        `${hh}:${mm}`
      )}`.trim();
    }
    return s;
  };

  const partRemainingRemoved = (part: AtlComponentPartRow) =>
    part.partRemovedRemainingTime ?? part.part_removed_remaining_time ?? "-";
  const partRemainingInstalled = (part: AtlComponentPartRow) =>
    part.partInstalledRemainingTime ??
    part.part_installed_remaining_time ??
    "-";
  const partRemarkCell = (part: AtlComponentPartRow) =>
    part.partRemark ?? part.part_remark ?? "-";

  const getAccountDisplay = (accountId?: number | null) => {
    if (!accountId || !accountsMap.has(accountId)) return "-";
    const account = accountsMap.get(accountId)!;
    return [account.fullName, account.licenseNo].filter(Boolean).join(" - ");
  };

  /** Matches Fleet Time table: `Full Name-LicenseNo` (no spaces around hyphen). */
  const formatMaintenanceLicenseDisplay = (accountId?: number | null) => {
    if (!accountId || !accountsMap.has(accountId)) return "-";
    const account = accountsMap.get(accountId)!;
    const name = account.fullName?.trim() ?? "";
    const license = account.licenseNo?.trim() ?? "";
    if (name && license) return `${name}-${license}`;
    return name || license || "-";
  };

  const formatOffBlocksExport = (record: AircraftTechnicalLog) => {
    const date =
      record.originDate != null && String(record.originDate).trim() !== ""
        ? formatDisplayDate(record.originDate)
        : "";
    const time = record.originTime?.trim()
      ? formatTimeZulu(record.originTime)
      : "";
    if (!date && !time) return "-";
    return [date, time].filter(Boolean).join(" ").trim();
  };

  const formatOnBlocksExport = (record: AircraftTechnicalLog) => {
    const date =
      record.destinationDate != null &&
      String(record.destinationDate).trim() !== ""
        ? formatDisplayDate(record.destinationDate)
        : "";
    const time = record.destinationTime?.trim()
      ? formatTimeZulu(record.destinationTime)
      : "";
    if (!date && !time) return "-";
    return [date, time].filter(Boolean).join(" ").trim();
  };

  const formatComponentPartsField = (
    record: AircraftTechnicalLog,
    picker: (part: AtlComponentPartRow) => unknown
  ) => {
    const parts = record.componentParts;
    if (!parts?.length) return "-";
    return parts
      .map((part) => {
        const v = picker(part as AtlComponentPartRow);
        return v != null && String(v).trim() !== "" ? String(v).trim() : "-";
      })
      .join(" ; ");
  };

  const getPilotDisplay = (record: AircraftTechnicalLog) => {
    const pilotId = record.pilotAcceptedBy ?? record.pilotFk;
    return getAccountDisplay(pilotId);
  };

  const exportColumnDefinitions = useMemo<ExportColumnDefinition[]>(
    () => [
      {
        key: "sequenceNo",
        label: "Sequence No",
        getValue: (record) =>
          formatOperationSequenceNoCell(record, showSeqNoWithBatchName),
      },
      {
        key: "workStatus",
        label: "Work Status",
        getValue: (record) => formatFleetWorkStatus(record.workStatus),
      },
      {
        key: "natureOfFlight",
        label: "Nature of Flight",
        getValue: (record) =>
          record.natureOfFlight === "VOID"
            ? "VOID"
            : record.natureOfFlight?.trim() || "-",
      },
      {
        key: "nextInspectionDue",
        label: "Next Insp. Date",
        getValue: (record) => record.nextInspectionDue || "-",
      },
      {
        key: "tachTimeDue",
        label: "Tach Time",
        getValue: (record) => formatOptionalNumber1dp(record.tachTimeDue),
      },
      {
        key: "originDate",
        label: "Off Blocks Date",
        getValue: (record) => formatDisplayDate(record.originDate),
      },
      {
        key: "originTime",
        label: "Off Blocks Time (Zulu)",
        getValue: (record) => formatTimeZulu(record.originTime),
      },
      {
        key: "destinationDate",
        label: "On Blocks Date",
        getValue: (record) => formatDisplayDate(record.destinationDate),
      },
      {
        key: "destinationTime",
        label: "On Blocks Time (Zulu)",
        getValue: (record) => formatTimeZulu(record.destinationTime),
      },
      {
        key: "offBlocks",
        label: "Off Blocks",
        getValue: (record) => formatOffBlocksExport(record),
      },
      {
        key: "onBlocks",
        label: "On Blocks",
        getValue: (record) => formatOnBlocksExport(record),
      },
      {
        key: "totalFlightHours",
        label: "Total Flight Hours",
        getValue: (record) =>
          computeTotalBlockTimeFromUtc(
            record.originDate,
            record.originTime,
            record.destinationDate,
            record.destinationTime
          ),
      },
      {
        key: "numberOfLandings",
        label: "No. of Landings",
        getValue: (record) => String(record.numberOfLandings ?? "-"),
      },
      {
        key: "hobbsMeterStart",
        label: "Hobbs Start",
        getValue: (record) => formatOptionalNumber1dp(record.hobbsMeterStart),
      },
      {
        key: "hobbsMeterEnd",
        label: "Hobbs End",
        getValue: (record) => formatOptionalNumber1dp(record.hobbsMeterEnd),
      },
      {
        key: "hobbsMeterTotal",
        label: "Hobbs Total",
        getValue: (record) => {
          const start = Number(record.hobbsMeterStart);
          const end = Number(record.hobbsMeterEnd);
          if (
            record.hobbsMeterStart != null &&
            record.hobbsMeterEnd != null &&
            Number.isFinite(start) &&
            Number.isFinite(end)
          ) {
            return (end - start).toFixed(1);
          }
          return formatOptionalNumber1dp(record.hobbsMeterTotal);
        },
      },
      {
        key: "tachometerStart",
        label: "Tachometer Start",
        getValue: (record) => formatOptionalNumber1dp(record.tachometerStart),
      },
      {
        key: "tachometerEnd",
        label: "Tachometer End",
        getValue: (record) => formatOptionalNumber1dp(record.tachometerEnd),
      },
      {
        key: "airframeRun",
        label: "Airframe Hrs Run",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "airframeRunTime")),
      },
      {
        key: "airframeAftt",
        label: "Airframe AFTT",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "airframeAftt")),
      },
      {
        key: "engineRun",
        label: "Engine Hrs Run",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "engineRunTime")),
      },
      {
        key: "engineTsn",
        label: "Engine TSN",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "engineTsn")),
      },
      {
        key: "engineTso",
        label: "Engine TSO",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "engineTso")),
      },
      {
        key: "engineTbo",
        label: "Engine TBO",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "engineTbo")),
      },
      {
        key: "propellerRun",
        label: "Propeller Hrs Run",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "propellerRunTime")),
      },
      {
        key: "propellerTsn",
        label: "Propeller TSN",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "propellerTsn")),
      },
      {
        key: "propellerTso",
        label: "Propeller TSO",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "propellerTso")),
      },
      {
        key: "propellerTbo",
        label: "Propeller TBO",
        getValue: (record) =>
          toFormat2(resolveAtlComponentMetric(record, "propellerTbo")),
      },
      {
        key: "fuelQtyLeftUpliftQty",
        label: "Fuel Uplift Qty Left",
        getValue: (record) => String(record.fuelQtyLeftUpliftQty ?? "-"),
      },
      {
        key: "fuelQtyRightUpliftQty",
        label: "Fuel Uplift Qty Right",
        getValue: (record) => String(record.fuelQtyRightUpliftQty ?? "-"),
      },
      {
        key: "fuelQtyLeftPriorDeparture",
        label: "Fuel Prior Dep. Left",
        getValue: (record) => String(record.fuelQtyLeftPriorDeparture ?? "-"),
      },
      {
        key: "fuelQtyRightPriorDeparture",
        label: "Fuel Prior Dep. Right",
        getValue: (record) => String(record.fuelQtyRightPriorDeparture ?? "-"),
      },
      {
        key: "fuelQtyLeftAfterOnBlks",
        label: "Fuel After On-Blks Left",
        getValue: (record) => String(record.fuelQtyLeftAfterOnBlks ?? "-"),
      },
      {
        key: "fuelQtyRightAfterOnBlks",
        label: "Fuel After On-Blks Right",
        getValue: (record) => String(record.fuelQtyRightAfterOnBlks ?? "-"),
      },
      {
        key: "oilQtyUpliftQty",
        label: "Oil Uplift Qty",
        getValue: (record) => String(record.oilQtyUpliftQty ?? "-"),
      },
      {
        key: "oilQtyPriorDeparture",
        label: "Oil Prior Dep. QRE",
        getValue: (record) => String(record.oilQtyPriorDeparture ?? "-"),
      },
      {
        key: "oilQtyAfterOnBlks",
        label: "Oil After On-Blks",
        getValue: (record) => String(record.oilQtyAfterOnBlks ?? "-"),
      },
      {
        key: "remarks",
        label: "Remarks",
        getValue: (record) => record.remarks || "-",
      },
      {
        key: "remarkPerson",
        label: "Remark Person",
        getValue: (record) =>
          formatMaintenanceLicenseDisplay(record.maintenanceFk),
      },
      {
        key: "maintenanceNameLicense",
        label: "Name and License",
        getValue: (record) =>
          formatMaintenanceLicenseDisplay(record.maintenanceFk),
      },
      {
        key: "actionsTaken",
        label: "Actions Taken",
        getValue: (record) => record.actionsTaken || "-",
      },
      {
        key: "actionTakenPerson",
        label: "Action Taken Person",
        getValue: (record) =>
          formatMaintenanceLicenseDisplay(record.maintenanceFk),
      },
      {
        key: "componentRemovedPn",
        label: "Removed P/N",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => p.removedPartNo),
      },
      {
        key: "componentRemovedSn",
        label: "Removed S/N",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => p.removedSerialNo),
      },
      {
        key: "componentRemovedRemTime",
        label: "Removed Rem. Time",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => partRemainingRemoved(p)),
      },
      {
        key: "componentInstalledPn",
        label: "Installed P/N",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => p.installedPartNo),
      },
      {
        key: "componentInstalledSn",
        label: "Installed S/N",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => p.installedSerialNo),
      },
      {
        key: "componentInstalledRemTime",
        label: "Inst. Rem. Time",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => partRemainingInstalled(p)),
      },
      {
        key: "componentNomenclature",
        label: "Nomenclature",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => p.nomenclature),
      },
      {
        key: "componentAtaChapter",
        label: "ATA Chapter",
        getValue: (record) =>
          formatComponentPartsField(
            record,
            (p) => p.ataChapter ?? p.ata_chapter
          ),
      },
      {
        key: "componentPartRemarks",
        label: "Part Remarks",
        getValue: (record) =>
          formatComponentPartsField(record, (p) => partRemarkCell(p)),
      },
      {
        key: "dateTimeReported",
        label: "Reported Date",
        getValue: (record) =>
          formatAtlDateTimeListCell(record.dateTimeReported ?? null),
      },
      {
        key: "dateTimeReleased",
        label: "Released Date",
        getValue: (record) =>
          formatAtlDateTimeListCell(record.dateTimeReleased ?? null),
      },
      {
        key: "rtsSignedBy",
        label: "Return To Service Name",
        getValue: (record) => getAccountDisplay(record.rtsSignedBy),
      },
      {
        key: "rtsDate",
        label: "Return To Service Date",
        getValue: (record) => record.rtsDate || "-",
      },
      {
        key: "rtsTime",
        label: "Return To Service Time (Zulu)",
        getValue: (record) => formatTimeZulu(record.rtsTime),
      },
      {
        key: "pilotAcceptedBy",
        label: "Pilot Acceptance Name",
        getValue: (record) => getPilotDisplay(record),
      },
      {
        key: "pilotAcceptDate",
        label: "Pilot Acceptance Date",
        getValue: (record) => record.pilotAcceptDate?.trim() || "-",
      },
      {
        key: "pilotAcceptTime",
        label: "Pilot Acceptance Time (Zulu)",
        getValue: (record) =>
          record.pilotAcceptTime?.trim()
            ? formatTimeZulu(record.pilotAcceptTime)
            : "-",
      },
    ],
    [accountsMap, aircraft, showSeqNoWithBatchName]
  );

  const activeExportColumnDefinitions = useMemo<
    ExportColumnDefinition[]
  >(() => {
    if (groupBy === "allColumns") return exportColumnDefinitions;

    const keysByGroup: Record<GroupByOption, string[]> = {
      allColumns: exportColumnDefinitions.map((column) => column.key),
      fuelAndOilData: [
        "sequenceNo",
        "natureOfFlight",
        "offBlocks",
        "onBlocks",
        "totalFlightHours",
        "fuelQtyLeftUpliftQty",
        "fuelQtyRightUpliftQty",
        "fuelQtyLeftPriorDeparture",
        "fuelQtyRightPriorDeparture",
        "fuelQtyLeftAfterOnBlks",
        "fuelQtyRightAfterOnBlks",
        "oilQtyUpliftQty",
        "oilQtyPriorDeparture",
        "oilQtyAfterOnBlks",
        "remarks",
        "maintenanceNameLicense",
      ],
      maintenancePlanning: [
        "sequenceNo",
        "natureOfFlight",
        "offBlocks",
        "onBlocks",
        "airframeRun",
        "airframeAftt",
        "engineRun",
        "engineTsn",
        "engineTso",
        "engineTbo",
        "propellerRun",
        "propellerTsn",
        "propellerTso",
        "propellerTbo",
      ],
      reliabilityMonitoring: [
        "sequenceNo",
        "natureOfFlight",
        "dateTimeReported",
        "dateTimeReleased",
        "airframeRun",
        "airframeAftt",
        "totalFlightHours",
        "numberOfLandings",
        "remarks",
        "actionsTaken",
        "componentRemovedPn",
        "componentRemovedSn",
        "componentRemovedRemTime",
        "componentInstalledPn",
        "componentInstalledSn",
        "componentInstalledRemTime",
        "componentNomenclature",
        "componentAtaChapter",
        "componentPartRemarks",
      ],
    };

    const allowed = new Set(keysByGroup[groupBy] ?? []);
    return exportColumnDefinitions.filter((column) => allowed.has(column.key));
  }, [exportColumnDefinitions, groupBy]);

  useEffect(() => {
    setSelectedExportColumns((current) => {
      const availableKeys = activeExportColumnDefinitions.map(
        (column) => column.key
      );
      if (current.length === 0) return availableKeys;
      return current.filter((key) => availableKeys.includes(key));
    });
  }, [activeExportColumnDefinitions]);

  /** Reset Export Columns modal local UI state whenever the modal closes. */
  useEffect(() => {
    if (!showExportModal) {
      setExportColumnSearch("");
      setExportSubGroupOverrides({});
      setActiveExportCategoryId(EXPORT_COLUMN_CATEGORIES[0]?.id ?? "");
    }
  }, [showExportModal]);

  /** Lock body scroll while the Export Columns modal is open (portaled overlay). */
  useEffect(() => {
    if (!showExportModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showExportModal]);

  /**
   * Categories that contain at least one column matching the current Group By view
   * and the current search filter. Drives sidebar tabs and progress indicator.
   */
  const activeExportCategoryView = useMemo(() => {
    const availableKeys = new Set(
      activeExportColumnDefinitions.map((c) => c.key)
    );
    const search = exportColumnSearch.trim().toLowerCase();
    const columnLabelByKey = new Map(
      activeExportColumnDefinitions.map((c) => [c.key, c.label])
    );
    const matchesSearch = (key: string): boolean => {
      if (!search) return true;
      const label = columnLabelByKey.get(key) ?? "";
      return label.toLowerCase().includes(search);
    };
    return EXPORT_COLUMN_CATEGORIES.map((category) => {
      const keys = category.keys.filter(
        (k) => availableKeys.has(k) && matchesSearch(k)
      );
      const subGroups = (category.subGroups ?? []).map((sg) => ({
        ...sg,
        keys: sg.keys.filter((k) => availableKeys.has(k) && matchesSearch(k)),
      }));
      return { ...category, keys, subGroups };
    }).filter((c) => c.keys.length > 0);
  }, [activeExportColumnDefinitions, exportColumnSearch]);

  /** Keep the active tab valid as Group By or search changes. */
  useEffect(() => {
    if (!showExportModal) return;
    if (activeExportCategoryView.length === 0) return;
    const exists = activeExportCategoryView.some(
      (c) => c.id === activeExportCategoryId
    );
    if (!exists) {
      setActiveExportCategoryId(activeExportCategoryView[0].id);
    }
  }, [activeExportCategoryView, activeExportCategoryId, showExportModal]);

  const handleAddToReliability = (record: AircraftTechnicalLog) => {
    // This would typically send data to backend to create reliability record
    console.log("Adding record to reliability tracking:", record);
    Swal.fire({
      icon: "success",
      title: "Added",
      text: `Record ${formatOperationSequenceNoCell(
        record,
        showSeqNoWithBatchName
      )} (#${record.id}) added to reliability tracking`,
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
      html: `Are you sure you want to delete entry <strong>${formatOperationSequenceNoCell(
        record,
        showSeqNoWithBatchName
      )}</strong>? This action cannot be undone.`,
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

  /** When batch filter UI is shown, import requires a concrete batch (not "All batches"). */
  const ensureAtlBatchSelectedForImport = async (): Promise<boolean> => {
    if (!canManageAtlBatchFilterAndBranches) return true;
    if (
      selectedAtlBatchFk != null &&
      Number.isFinite(selectedAtlBatchFk) &&
      selectedAtlBatchFk > 0
    ) {
      return true;
    }
    await Swal.fire({
      title: "Batch Required",
      text: "Please create or select a batch first before importing ATL records.",
      icon: "warning",
      confirmButtonText: "OK",
    });
    return false;
  };

  const validateAircraftPrerequisitesForAtlImport =
    async (): Promise<boolean> => {
      if (!effectiveAircraftId) return false;
      try {
        const aircraftRes = await getAircraftById(effectiveAircraftId);
        const aircraftData = toCamelDeep(aircraftRes.data) as Aircraft;
        const missing = getMissingAircraftFieldsForNewAtl(aircraftData);
        if (missing.length > 0) {
          await Swal.fire({
            icon: "warning",
            title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
            html: buildAircraftDetailsRequiredForAtlHtml(aircraftData),
            confirmButtonColor: "#2563eb",
          });
          return false;
        }
        return true;
      } catch (err) {
        console.error(
          "Failed to validate aircraft prerequisites for import:",
          err
        );
        await Swal.fire({
          icon: "error",
          title: "Validation error",
          text: "Could not load aircraft information. Please try again.",
          confirmButtonColor: "#2563eb",
        });
        return false;
      }
    };

  const handleImportClick = async () => {
    const batchOk = await ensureAtlBatchSelectedForImport();
    if (!batchOk) return;
    const canProceed = await validateAircraftPrerequisitesForAtlImport();
    if (!canProceed) return;
    importFileInputRef.current?.click();
  };

  const toggleExportColumn = (columnKey: string) => {
    setSelectedExportColumns((current) =>
      current.includes(columnKey)
        ? current.filter((key) => key !== columnKey)
        : [...current, columnKey]
    );
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!effectiveAircraftId) return;
    if (!canExportOperationAtl) {
      setShowExportModal(false);
      return;
    }
    if (selectedExportColumns.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No columns selected",
        text: "Choose at least one column to include in the export.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setExportLoading(true);
    void Swal.fire({
      title: "Exporting data",
      text: "Fetching records and preparing your file…",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    try {
      const exportPageSize = Math.max(totalRecords, paginatedRecords.length, 1);
      const recordsResponse = await getAircraftTechnicalLogs(
        1,
        exportPageSize,
        selectedSequenceNo,
        effectiveAircraftId,
        sequenceSort === "asc" ? "sequence_no" : "-sequence_no",
        workStatusFilter || undefined,
        selectedAtlBatchFk
      );

      if (!recordsResponse.items.length) {
        Swal.close();
        await Swal.fire({
          icon: "info",
          title: "No data to export",
          text: "There are no records matching the current filters.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      const selectedColumns = activeExportColumnDefinitions.filter((column) =>
        selectedExportColumns.includes(column.key)
      );
      const fileRegistration =
        aircraft?.registration || `aircraft_${effectiveAircraftId}`;

      if (format === "xlsx") {
        const aoa: string[][] = [
          selectedColumns.map((column) => column.label),
          ...recordsResponse.items.map((record) =>
            selectedColumns.map((column) => column.getValue(record))
          ),
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ATL");
        XLSX.writeFile(wb, `${fileRegistration}_operation_export.xlsx`);
        Swal.close();
        setShowExportModal(false);
        return;
      }

      const escapeCsvValue = (value: string) =>
        `"${value.replace(/"/g, '""')}"`;
      const csvLines = [
        selectedColumns.map((column) => escapeCsvValue(column.label)).join(","),
        ...recordsResponse.items.map((record) =>
          selectedColumns
            .map((column) => escapeCsvValue(column.getValue(record)))
            .join(",")
        ),
      ];

      const csvBlob = new Blob(["\uFEFF" + csvLines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileRegistration}_operation_export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      Swal.close();
      setShowExportModal(false);
    } catch (err: unknown) {
      console.error("Export error:", err);
      Swal.close();
      const swalContent = formatApiErrorForSwal(err, {
        defaultTitle: "Export failed",
        validationTitle: "Export validation error",
        fallbackMessage: "Failed to export records.",
      });
      await Swal.fire({
        ...swalContent,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !effectiveAircraftId) return;
    const batchOk = await ensureAtlBatchSelectedForImport();
    if (!batchOk) return;
    const canProceed = await validateAircraftPrerequisitesForAtlImport();
    if (!canProceed) return;

    let batchIdForImport = selectedAtlBatchFk;
    if (batchIdForImport == null) {
      const list = await getAtlBatchesForSelect();
      const latest = pickLatestAtlBatchId(list);
      if (latest == null) {
        await Swal.fire({
          icon: "warning",
          title: "Batch required",
          text: "No ATL batch is available. Create a batch or select one before importing.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
      batchIdForImport = latest;
    }

    const registration = aircraft?.registration?.trim() || undefined;

    setImportLoading(true);
    try {
      void Swal.fire({
        title: "Importing data",
        html: atlImportProgressSwalHtml(0, "Uploading file to server…"),
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
      });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      let finalProgress: AtlExcelImportProgress;
      try {
        const { jobId } = await startAtlExcelImport({
          file,
          batchId: batchIdForImport,
          aircraftId: effectiveAircraftId,
          registration,
        });
        if (Swal.isVisible()) {
          Swal.update({
            title: "Importing data",
            html: atlImportProgressSwalHtml(
              3,
              "File received. Waiting for the first progress update…"
            ),
          });
        }
        finalProgress = await pollAtlExcelImportUntilDone(jobId, {
          intervalMs: 400,
          onUpdate: (data) => {
            const pct = getAtlExcelImportProcessPercent(data);
            const sub = formatAtlExcelImportProgressLabel(data);
            if (Swal.isVisible()) {
              Swal.update({
                title: "Importing data",
                html: atlImportProgressSwalHtml(pct, sub),
              });
            }
          },
        });
        if (Swal.isVisible()) {
          const pct = getAtlExcelImportProcessPercent(finalProgress);
          const sub = formatAtlExcelImportProgressLabel(finalProgress);
          Swal.update({
            title: "Importing data",
            html: atlImportProgressSwalHtml(pct, sub),
          });
        }
      } catch (importErr: unknown) {
        Swal.close();
        console.error("ATL import failed to transact:", importErr);
        const err = importErr as { response?: { status?: number } };
        if (Number(err?.response?.status) === 500) {
          await Swal.fire({
            icon: "error",
            title: "Failed to transact",
            text: "Server Error contact to Admin",
            confirmButtonColor: "#2563eb",
          });
          return;
        }
        const swalContent = formatApiErrorForSwal(importErr, {
          defaultTitle: "Failed to transact",
          validationTitle: "Validation Error",
          fallbackMessage: "Import failed.",
        });
        await Swal.fire({
          ...swalContent,
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      const importFailed = (() => {
        const s = finalProgress.status.toUpperCase().replace(/\s+/g, "_");
        return (
          s === "FAILED" ||
          s === "ERROR" ||
          s === "CANCELLED" ||
          s === "ABORTED"
        );
      })();
      if (importFailed) {
        Swal.close();
        const swalContent = formatApiErrorForSwal(
          {
            response: {
              data: {
                detail: finalProgress.errors ?? finalProgress.message,
                message: finalProgress.message,
                errors: finalProgress.errors,
              },
            },
          },
          {
            defaultTitle: "Import failed",
            validationTitle: "Validation Error",
            fallbackMessage: finalProgress.message?.trim() || "Import failed.",
          }
        );
        await Swal.fire({
          ...swalContent,
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      Swal.close();

      void Swal.fire({
        title: "Refreshing data",
        text: "Updating the list with your imported records…",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      try {
        await refreshPage({ rethrowOnError: true });
      } catch (refreshErr: unknown) {
        console.error(
          "ATL import succeeded but list refresh failed:",
          refreshErr
        );
        Swal.close();
        await Swal.fire({
          icon: "warning",
          title: "Import complete",
          text: "Records were imported but the list could not be refreshed. Use the Refresh button to try again.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      Swal.close();

      const failedRows = finalProgress.failedRows ?? 0;
      if (failedRows > 0) {
        await Swal.fire({
          icon: "warning",
          title: "Import complete",
          text: `The table has been refreshed. ${failedRows} row(s) were reported as failed—verify on the server if needed.`,
          confirmButtonColor: "#2563eb",
        });
      } else {
        await Swal.fire({
          icon: "success",
          title: "Import complete",
          text: "Your Aircraft Technical Log list has been updated with the imported data.",
          confirmButtonColor: "#2563eb",
          timer: 2800,
        });
      }
    } finally {
      setImportLoading(false);
    }
  };

  // Refresh aircraft + records so list view shows the latest API-provided auto_* values.
  const refreshPage = async (options?: { rethrowOnError?: boolean }) => {
    if (!effectiveAircraftId) return;
    setLoading(true);
    setError(null);
    try {
      const [aircraftRes, recordsRes] = await Promise.all([
        getAircraftById(effectiveAircraftId),
        getAircraftTechnicalLogs(
          currentPage,
          itemsPerPage,
          selectedSequenceNo,
          effectiveAircraftId,
          sequenceSort === "asc" ? "sequence_no" : "-sequence_no",
          workStatusFilter || undefined,
          selectedAtlBatchFk
        ),
      ]);
      setAircraft(toCamelDeep(aircraftRes.data) as Aircraft);
      setFleetTimeRecords(
        Array.isArray(recordsRes.items) ? recordsRes.items : []
      );
      setTotalRecords(recordsRes.total);
      setTotalPages(recordsRes.pages);
    } catch (err: any) {
      console.error("Error refreshing:", err);
      setError("Failed to load data");
      setFleetTimeRecords([]);
      if (options?.rethrowOnError) {
        throw err;
      }
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
                  <span>
                    Airframe AFTT:{" "}
                    {toFormat2(resolveAircraftAirframeAftt(aircraft))}
                  </span>
                  <span>
                    Engine TSO:{" "}
                    {toFormat2(
                      resolveAircraftEnginePropHour(aircraft, "engineTso")
                    )}
                  </span>
                  <span>
                    Engine TSN:{" "}
                    {toFormat2(
                      resolveAircraftEnginePropHour(aircraft, "engineTsn")
                    )}
                  </span>
                  <span>
                    Propeller TSO:{" "}
                    {toFormat2(
                      resolveAircraftEnginePropHour(aircraft, "propellerTso")
                    )}
                  </span>
                  <span>
                    Propeller TSN:{" "}
                    {toFormat2(
                      resolveAircraftEnginePropHour(aircraft, "propellerTsn")
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshPage()}
                disabled={loading}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh list data"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {/* <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button> */}
              {canExportOperationAtl && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExportColumns(
                      activeExportColumnDefinitions.map((column) => column.key)
                    );
                    setShowExportModal(true);
                  }}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
              {canCreateOperationAtl && (
                <>
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
                      className={`w-4 h-4 ${
                        importLoading ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="hidden sm:inline">
                      {importLoading ? "Importing…" : "Import"}
                    </span>
                  </button>
                </>
              )}
              {canCreateOperationAtl && (
                <button
                  onClick={() => {
                    const missing = getMissingAircraftFieldsForNewAtl(aircraft);
                    if (missing.length > 0) {
                      Swal.fire({
                        icon: "warning",
                        title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
                        html: buildAircraftDetailsRequiredForAtlHtml(aircraft),
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
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Current Tach</p>
              <p className="text-gray-900 text-2xl">
                {fleetTimeRecords.length > 0
                  ? (() => {
                      const s = formatOptionalNumber1dp(
                        fleetTimeRecords[0].tachometerEnd
                      );
                      return s === "-" ? "-" : `${s} Hrs`;
                    })()
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
                  placeholder="Search by sequence number..."
                  value={searchQuery}
                  onChange={(e) => {
                    const nextSequenceNo = e.target.value;
                    setSearchQuery(nextSequenceNo);
                    setSelectedSequenceNo(nextSequenceNo.trim());
                  }}
                  className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedSequenceNo("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {canManageAtlBatchFilterAndBranches && (
                <div className="flex flex-wrap items-center gap-2 min-w-[200px]">
                  <label
                    htmlFor="operation-atl-branch"
                    className="text-gray-700 text-sm font-medium whitespace-nowrap flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                    ATL batch
                  </label>
                  <select
                    id="operation-atl-branch"
                    value={selectedAtlBatchId}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === ATL_BRANCH_CREATE_VALUE) {
                        if (!canEditAtlBatchBranches) return;
                        setAtlBatchModalEditId(null);
                        setAtlBatchModalOpen(true);
                        return;
                      }
                      if (v === ATL_BRANCH_EDIT_VALUE) {
                        if (!canEditAtlBatchBranches) return;
                        const n =
                          selectedAtlBatchId.trim() !== ""
                            ? Number(selectedAtlBatchId)
                            : NaN;
                        if (!Number.isFinite(n) || n <= 0) {
                          void Swal.fire({
                            icon: "info",
                            title: "Select a branch",
                            text: "Choose a branch in the dropdown before editing.",
                            confirmButtonColor: "#2563eb",
                          });
                          return;
                        }
                        setAtlBatchModalEditId(n);
                        setAtlBatchModalOpen(true);
                        return;
                      }
                      atlBatchFilterTouchedRef.current = true;
                      setSelectedAtlBatchId(v);
                    }}
                    className="min-w-[200px] px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-sm text-gray-900"
                  >
                    <option value="">All</option>
                    {atlBatchFilterOptions.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                    {canEditAtlBatchBranches && (
                      <>
                        <option value={ATL_BRANCH_CREATE_VALUE}>
                          + Create branch…
                        </option>
                        <option value={ATL_BRANCH_EDIT_VALUE}>
                          Edit branch…
                        </option>
                      </>
                    )}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="fleet-work-status"
                  className="text-gray-700 text-sm font-medium whitespace-nowrap"
                >
                  Work Status
                </label>
                <select
                  id="fleet-work-status"
                  value={workStatusFilter}
                  onChange={(e) => setWorkStatusFilter(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-sm text-gray-900 min-w-[200px]"
                >
                  <option value="">All</option>
                  {ATL_WORK_STATUS_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {formatFleetWorkStatus(key)}
                    </option>
                  ))}
                </select>
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
                        if (!effectiveAircraftId) return;
                        setLoading(true);
                        setError(null);
                        try {
                          const sortParam =
                            sequenceSort === "asc"
                              ? "sequence_no"
                              : "-sequence_no";
                          const response = await getAircraftTechnicalLogs(
                            currentPage,
                            itemsPerPage,
                            selectedSequenceNo,
                            effectiveAircraftId,
                            sortParam,
                            workStatusFilter || undefined,
                            selectedAtlBatchFk
                          );
                          setFleetTimeRecords(
                            Array.isArray(response.items) ? response.items : []
                          );
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
                              colSpan={2}
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
                              colSpan={9}
                              rowSpan={2}
                              className="px-3 py-3 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap align-middle"
                            >
                              COMPONENT RECORD
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              REPORTED
                              <br />
                              DATE
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              RELEASED
                              <br />
                              DATE
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
                                colSpan={58}
                                className="px-6 py-12 text-center text-gray-500"
                              >
                                {searchQuery
                                  ? `No records found matching "${searchQuery}"`
                                  : "No records available"}
                              </td>
                            </tr>
                          ) : (
                            paginatedRecords.map((record) => (
                              <tr
                                key={record.id}
                                className="hover:bg-gray-50/50 transition-colors"
                              >
                                <td className={STICKY_SEQ_CELL_CLASS}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {formatOperationSequenceNoCell(
                                        record,
                                        showSeqNoWithBatchName
                                      )}
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
                                      {(canUpdateOperationAtl ||
                                        operationTechPubUploadOnly) && (
                                        <>
                                          <span className="text-gray-400">
                                            |
                                          </span>
                                          <button
                                            type="button"
                                            disabled={
                                              !allowAtlEditForRecord(record)
                                            }
                                            onClick={() => {
                                              setSelectedEntry(record);
                                              setShowEditModal(true);
                                            }}
                                            className="hover:text-blue-700 hover:underline transition-colors text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-blue-600 disabled:hover:no-underline"
                                            title={
                                              allowAtlEditForRecord(record)
                                                ? "Edit"
                                                : "Editing is not allowed for your role at this work status."
                                            }
                                          >
                                            Edit
                                          </button>
                                        </>
                                      )}
                                      {canDeleteOperationAtl && (
                                        <>
                                          <span className="text-gray-400">
                                            |
                                          </span>
                                          <button
                                            onClick={() =>
                                              handleDeleteAtl(record)
                                            }
                                            className="text-red-600 hover:underline text-xs"
                                            title="Delete"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
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
                                  {formatOptionalNumber1dp(record.tachTimeDue)}
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
                                  {computeTotalBlockTimeFromUtc(
                                    record.originDate,
                                    record.originTime,
                                    record.destinationDate,
                                    record.destinationTime
                                  )}
                                </td>

                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.numberOfLandings ?? "-"}
                                </td>

                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatOptionalNumber1dp(
                                    record.hobbsMeterStart
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatOptionalNumber1dp(
                                    record.hobbsMeterEnd
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {(() => {
                                    const start = Number(
                                      record.hobbsMeterStart
                                    );
                                    const end = Number(record.hobbsMeterEnd);
                                    if (
                                      record.hobbsMeterStart != null &&
                                      record.hobbsMeterEnd != null &&
                                      Number.isFinite(start) &&
                                      Number.isFinite(end)
                                    ) {
                                      return (end - start).toFixed(1);
                                    }
                                    return formatOptionalNumber1dp(
                                      record.hobbsMeterTotal
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatOptionalNumber1dp(
                                    record.tachometerStart
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatOptionalNumber1dp(
                                    record.tachometerEnd
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "airframeRunTime"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "airframeAftt"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "engineRunTime"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "engineTsn"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "engineTso"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "engineTbo"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "propellerRunTime"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "propellerTsn"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "propellerTso"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {toFormat2(
                                    resolveAtlComponentMetric(
                                      record,
                                      "propellerTbo"
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftUpliftQty ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightUpliftQty ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftPriorDeparture ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightPriorDeparture ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftAfterOnBlks ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightAfterOnBlks ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyUpliftQty ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyPriorDeparture ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyAfterOnBlks ?? "-"}
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
                                  colSpan={9}
                                  className="px-0 py-0 align-top border-r border-gray-200 bg-white"
                                >
                                  <table className="w-full border-collapse min-w-full">
                                    <thead>
                                      <tr className="bg-gray-200">
                                        <th
                                          colSpan={3}
                                          className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300"
                                        >
                                          PARTS REMOVED
                                        </th>
                                        <th
                                          colSpan={3}
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
                                        <th
                                          rowSpan={2}
                                          className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300 align-middle"
                                        >
                                          PART REMARKS
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
                                          REMOVED
                                          <br />
                                          REM. TIME
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                          P/N
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                          S/N
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                          INST.
                                          <br />
                                          REM. TIME
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
                                                {String(
                                                  partRemainingRemoved(part)
                                                )}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.installedPartNo ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.installedSerialNo ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {String(
                                                  partRemainingInstalled(part)
                                                )}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.nomenclature ?? "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {part.ataChapter ??
                                                  part.ata_chapter ??
                                                  "-"}
                                              </td>
                                              <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                                {partRemarkCell(part)}
                                              </td>
                                            </tr>
                                          )
                                        )
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={9}
                                            className="px-2 py-2 text-center text-gray-500 text-sm border border-gray-200"
                                          >
                                            -
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {formatAtlDateTimeListCell(
                                    record.dateTimeReported ?? null
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {formatAtlDateTimeListCell(
                                    record.dateTimeReleased ?? null
                                  )}
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
                          <th
                            rowSpan={2}
                            className={`${STICKY_SEQ_CLASS} align-middle`}
                          >
                            ATL SEQ
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap align-middle"
                          >
                            NATURE OF FLIGHT
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap align-middle"
                          >
                            OFF BLOCKS
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap align-middle"
                          >
                            ON BLOCKS
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap align-middle"
                          >
                            TOTAL FLIGHT TIME
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
                            className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap align-middle"
                          >
                            REMARKS
                          </th>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-900 bg-gray-200 whitespace-nowrap align-middle"
                          >
                            NAME AND LICENSE
                          </th>
                        </tr>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            UPLIFT QTY LEFT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            UPLIFT QTY RIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PRIOR DEP. LEFT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PRIOR DEP. RIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AFTER ON-BLKS LEFT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AFTER ON-BLKS RIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            UPLIFT QTY
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PRIOR DEP.
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AFTER ON-BLKS
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
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className={STICKY_SEQ_CELL_CLASS}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {formatOperationSequenceNoCell(
                                      record,
                                      showSeqNoWithBatchName
                                    )}
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
                                    {(canUpdateOperationAtl ||
                                      operationTechPubUploadOnly) && (
                                      <>
                                        <span className="text-gray-400">|</span>
                                        <button
                                          type="button"
                                          disabled={
                                            !allowAtlEditForRecord(record)
                                          }
                                          onClick={() => {
                                            setSelectedEntry(record);
                                            setShowEditModal(true);
                                          }}
                                          className="hover:underline text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
                                          title={
                                            allowAtlEditForRecord(record)
                                              ? "Edit"
                                              : "Editing is not allowed for your role at this work status."
                                          }
                                        >
                                          Edit
                                        </button>
                                      </>
                                    )}
                                    {canDeleteOperationAtl && (
                                      <>
                                        <span className="text-gray-400">|</span>
                                        <button
                                          onClick={() =>
                                            handleDeleteAtl(record)
                                          }
                                          className="text-red-600 hover:underline text-xs"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
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
                                {computeTotalBlockTimeFromUtc(
                                  record.originDate,
                                  record.originTime,
                                  record.destinationDate,
                                  record.destinationTime
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyLeftUpliftQty ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyRightUpliftQty ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyLeftPriorDeparture ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyRightPriorDeparture ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyLeftAfterOnBlks ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyRightAfterOnBlks ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.oilQtyUpliftQty ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.oilQtyPriorDeparture ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.oilQtyAfterOnBlks ?? "-"}
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
                          paginatedRecords.map((record) => {
                            return (
                              <tr key={record.id} className="hover:bg-gray-50">
                                <td className={STICKY_SEQ_CELL_CLASS}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {formatOperationSequenceNoCell(
                                        record,
                                        showSeqNoWithBatchName
                                      )}
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
                                      {(canUpdateOperationAtl ||
                                        operationTechPubUploadOnly) && (
                                        <>
                                          <span className="text-gray-400">
                                            |
                                          </span>
                                          <button
                                            type="button"
                                            disabled={
                                              !allowAtlEditForRecord(record)
                                            }
                                            onClick={() => {
                                              setSelectedEntry(record);
                                              setShowEditModal(true);
                                            }}
                                            className="hover:underline text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
                                            title={
                                              allowAtlEditForRecord(record)
                                                ? "Edit"
                                                : "Editing is not allowed for your role at this work status."
                                            }
                                          >
                                            Edit
                                          </button>
                                        </>
                                      )}
                                      {canDeleteOperationAtl && (
                                        <>
                                          <span className="text-gray-400">
                                            |
                                          </span>
                                          <button
                                            onClick={() =>
                                              handleDeleteAtl(record)
                                            }
                                            className="text-red-600 hover:underline text-xs"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
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
                                  {getAirframeDisplay(record)?.split(
                                    " / "
                                  )?.[0] ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getAirframeDisplay(record)?.split(
                                    " / "
                                  )?.[1] ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getEngineDisplay(record)
                                    ?.split(" / ")?.[0]
                                    ?.replace("RUN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getEngineDisplay(record)
                                    ?.split(" / ")?.[1]
                                    ?.replace("TSN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getEngineDisplay(record)
                                    ?.split(" / ")?.[2]
                                    ?.replace("TSO ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getEngineDisplay(record)
                                    ?.split(" / ")?.[3]
                                    ?.replace("TBO ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getPropellerDisplay(record)
                                    ?.split(" / ")?.[0]
                                    ?.replace("RUN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getPropellerDisplay(record)
                                    ?.split(" / ")?.[1]
                                    ?.replace("TSN ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm border-r border-gray-200">
                                  {getPropellerDisplay(record)
                                    ?.split(" / ")?.[2]
                                    ?.replace("TSO ", "") ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {getPropellerDisplay(record)
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
                            REPORTED DATE
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            RELEASED DATE
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AIRFRAME (RUN TIME)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AIRFRAME (AFTT)
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
                              colSpan={11}
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
                                    {formatOperationSequenceNoCell(
                                      record,
                                      showSeqNoWithBatchName
                                    )}
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
                                    {(canUpdateOperationAtl ||
                                      operationTechPubUploadOnly) && (
                                      <>
                                        <span className="text-gray-400">|</span>
                                        <button
                                          type="button"
                                          disabled={
                                            !allowAtlEditForRecord(record)
                                          }
                                          onClick={() => {
                                            setSelectedEntry(record);
                                            setShowEditModal(true);
                                          }}
                                          className="hover:underline text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
                                          title={
                                            allowAtlEditForRecord(record)
                                              ? "Edit"
                                              : "Editing is not allowed for your role at this work status."
                                          }
                                        >
                                          Edit
                                        </button>
                                      </>
                                    )}
                                    {canDeleteOperationAtl && (
                                      <>
                                        <span className="text-gray-400">|</span>
                                        <button
                                          onClick={() =>
                                            handleDeleteAtl(record)
                                          }
                                          className="text-red-600 hover:underline text-xs"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
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
                                {formatAtlDateTimeListCell(
                                  record.dateTimeReported ?? null
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200 whitespace-nowrap">
                                {formatAtlDateTimeListCell(
                                  record.dateTimeReleased ?? null
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {getAirframeDisplay(record)?.split(
                                  " / "
                                )?.[0] ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {getAirframeDisplay(record)?.split(
                                  " / "
                                )?.[1] ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {computeTotalBlockTimeFromUtc(
                                  record.originDate,
                                  record.originTime,
                                  record.destinationDate,
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
                                        colSpan={3}
                                        className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300"
                                      >
                                        PARTS REMOVED
                                      </th>
                                      <th
                                        colSpan={3}
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
                                      <th
                                        rowSpan={2}
                                        className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300 align-middle"
                                      >
                                        PART REMARKS
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
                                        REMOVED
                                        <br />
                                        REM. TIME
                                      </th>
                                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                        P/N
                                      </th>
                                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                        S/N
                                      </th>
                                      <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-900 border border-gray-300">
                                        INST.
                                        <br />
                                        REM. TIME
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
                                              {String(
                                                partRemainingRemoved(part)
                                              )}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.installedPartNo ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.installedSerialNo ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {String(
                                                partRemainingInstalled(part)
                                              )}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.nomenclature ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {part.ataChapter ??
                                                part.ata_chapter ??
                                                "-"}
                                            </td>
                                            <td className="px-2 py-1 border border-gray-200 bg-white text-center text-sm">
                                              {partRemarkCell(part)}
                                            </td>
                                          </tr>
                                        )
                                      )
                                    ) : (
                                      <tr>
                                        <td
                                          colSpan={9}
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

            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalRecords}
              totalLabel="records"
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[...OPERATION_PAGE_SIZE_OPTIONS]}
              className="px-6"
            />
          </div>
        </div>
      </div>

      <AddAtlBatchModal
        isOpen={atlBatchModalOpen && canEditAtlBatchBranches}
        editBatchId={atlBatchModalEditId}
        onClose={() => {
          setAtlBatchModalOpen(false);
          setAtlBatchModalEditId(null);
        }}
        onSaved={(batch: AtlBatch) => {
          setAtlBatchFilterOptions((prev) => {
            const without = prev.filter((b) => b.id !== batch.id);
            return [...without, { id: batch.id, name: batch.name }].sort(
              (a, b) => a.name.localeCompare(b.name)
            );
          });
          setSelectedAtlBatchId(String(batch.id));
        }}
      />

      {/* Add Record Modal – CREATE */}
      <AddTechnicalLogbookEntryModal
        isOpen={showAddRecordModal}
        onClose={() => setShowAddRecordModal(false)}
        aircraftId={effectiveAircraftId}
        permissionModuleCode={operationAtlPermissionModuleCode}
        defaultAtlBatchFk={
          canManageAtlBatchFilterAndBranches ? selectedAtlBatchFk : undefined
        }
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
          aircraftId={effectiveAircraftId}
          permissionModuleCode={operationAtlPermissionModuleCode}
          viewerRole={operationAtlRole}
          editRestrictedToWhiteAtlDfpOnly={operationTechPubUploadOnly}
          listViewComputedTimes={editListComputedTimes}
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
            fltTime: `${computeTotalFlightHoursDecimalFromUtc(
              selectedEntry.originDate,
              selectedEntry.originTime,
              selectedEntry.destinationDate,
              selectedEntry.destinationTime
            ).toFixed(2)}h`,
            pilot: selectedEntry.remarks?.split("\n")[0] || "N/A",
            status: "Serviceable",
          }}
          fullEntry={selectedEntry}
        />
      )}

      {showExportModal && canExportOperationAtl && (() => {
        const totalAvailable = activeExportColumnDefinitions.length;
        const totalSelected = selectedExportColumns.length;
        const progressPct =
          totalAvailable === 0
            ? 0
            : Math.round((totalSelected / totalAvailable) * 100);

        const sections = activeExportCategoryView;
        const sectionsCount = sections.length;
        const activeIdx = sections.findIndex(
          (s) => s.id === activeExportCategoryId
        );
        const activeSection = activeIdx >= 0 ? sections[activeIdx] : null;
        const columnByKey = new Map(
          activeExportColumnDefinitions.map((c) => [c.key, c])
        );

        // Portaled to document.body so the fixed overlay isn't trapped by any
        // ancestor with `transform` / `filter` / `contain` that would otherwise
        // create a new containing block and break `position: fixed`.

        const countSelected = (keys: string[]) =>
          keys.filter((k) => selectedExportColumns.includes(k)).length;

        const setSelectionForKeys = (keys: string[], select: boolean) => {
          if (keys.length === 0) return;
          setSelectedExportColumns((current) => {
            const set = new Set(current);
            for (const k of keys) {
              if (select) set.add(k);
              else set.delete(k);
            }
            return Array.from(set);
          });
        };

        const isSubGroupExpanded = (
          categoryId: string,
          sg: ExportColumnSubGroup
        ): boolean => {
          const key = subGroupKey(categoryId, sg.id);
          if (key in exportSubGroupOverrides) {
            return exportSubGroupOverrides[key];
          }
          return !sg.defaultCollapsed;
        };

        const toggleSubGroup = (
          categoryId: string,
          sg: ExportColumnSubGroup
        ) => {
          const key = subGroupKey(categoryId, sg.id);
          setExportSubGroupOverrides((current) => ({
            ...current,
            [key]: !isSubGroupExpanded(categoryId, sg),
          }));
        };

        const renderColumnTile = (column: ExportColumnDefinition) => {
          const isSelected = selectedExportColumns.includes(column.key);
          return (
            <label
              key={column.key}
              className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 transition-all ${
                isSelected
                  ? "border-blue-400 bg-blue-50/70"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleExportColumn(column.key)}
                className="border-gray-400 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <span
                className={`flex-1 truncate text-sm leading-tight ${
                  isSelected
                    ? "font-medium text-gray-900"
                    : "text-gray-700 group-hover:text-gray-900"
                }`}
                title={column.label}
              >
                {column.label}
              </span>
            </label>
          );
        };

        return createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm px-0 py-0 sm:items-center sm:px-4 sm:py-6"
            onClick={() => !exportLoading && setShowExportModal(false)}
            role="presentation"
            style={{ position: "fixed", inset: 0 }}
          >
            <div
              className="flex max-h-[100vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-columns-title"
            >
              {/* Header — inline-styled so the gradient/colors render even when
                  the bundled Tailwind CSS strips opacity/gradient utilities. */}
              <div
                className="relative flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(90deg, #2563eb 0%, #2563eb 50%, #4f46e5 100%)",
                  color: "#ffffff",
                  borderBottom: "1px solid rgba(29, 78, 216, 0.4)",
                }}
              >
                <div className="flex items-start gap-3 px-5 py-4">
                  {/* Leading icon badge */}
                  <div
                    className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
                    }}
                    aria-hidden
                  >
                    <Download
                      className="h-5 w-5"
                      style={{ color: "#ffffff" }}
                    />
                  </div>
                  {/* Title + view chip + subtitle */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h3
                        id="export-columns-title"
                        className="text-xl font-bold leading-tight"
                        style={{ color: "#ffffff" }}
                      >
                        Export Columns
                      </h3>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.22)",
                          color: "#ffffff",
                          boxShadow:
                            "inset 0 0 0 1px rgba(255,255,255,0.4), 0 1px 2px 0 rgba(0,0,0,0.06)",
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: "#ffffff" }}
                        />
                        {groupBy === "allColumns"
                          ? "All Columns"
                          : groupBy === "fuelAndOilData"
                          ? "Fuel and Oil"
                          : groupBy === "maintenancePlanning"
                          ? "Maintenance Planning"
                          : "Reliability Monitoring"}
                      </span>
                    </div>
                    <p
                      className="mt-1.5 text-sm font-medium"
                      style={{ color: "#dbeafe" }}
                    >
                      Fleet Time Monitoring{" "}
                      <span style={{ color: "#93c5fd" }}>·</span> Pick columns
                      to include in the export
                    </p>
                  </div>
                  {/* Selected counter — always visible */}
                  <div
                    className="hidden flex-shrink-0 flex-col items-end leading-tight sm:flex"
                    aria-live="polite"
                  >
                    <span
                      className="text-lg font-bold"
                      style={{ color: "#ffffff" }}
                    >
                      {totalSelected}
                      <span style={{ color: "#bfdbfe" }}>
                        /{totalAvailable}
                      </span>
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "#dbeafe" }}
                    >
                      Columns
                    </span>
                  </div>
                  {/* Close */}
                  <button
                    type="button"
                    onClick={() =>
                      !exportLoading && setShowExportModal(false)
                    }
                    disabled={exportLoading}
                    className="flex-shrink-0 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ color: "#eff6ff" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.18)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    aria-label="Close export dialog"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {/* Progress bar — flush to bottom edge */}
                <div
                  className="h-1 w-full overflow-hidden"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Columns selected"
                >
                  <div
                    className="h-full transition-[width] duration-300 ease-out"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>
              </div>

              {/* Toolbar — refined search + global actions */}
              <div className="flex flex-shrink-0 flex-col gap-2.5 border-b border-gray-200 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search
                    className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                      exportColumnSearch ? "text-blue-500" : "text-gray-400"
                    }`}
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={exportColumnSearch}
                    onChange={(e) => setExportColumnSearch(e.target.value)}
                    placeholder="Search across all sections…"
                    aria-label="Search columns"
                    className={`peer w-full rounded-lg border bg-gray-50 py-2 pl-9 pr-9 text-sm text-gray-800 placeholder:text-gray-400 transition-shadow focus:bg-white focus:outline-none ${
                      exportColumnSearch
                        ? "border-blue-400 ring-2 ring-blue-500/20"
                        : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                  />
                  {exportColumnSearch ? (
                    <button
                      type="button"
                      onClick={() => setExportColumnSearch("")}
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <kbd
                      className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline-block"
                      aria-hidden
                    >
                      Search
                    </kbd>
                  )}
                </div>
                {/* Match counter + bulk actions */}
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  {exportColumnSearch && (
                    <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                      <Filter className="h-3 w-3" />
                      {sections.reduce(
                        (sum, s) => sum + s.keys.length,
                        0
                      )}{" "}
                      match
                      {sections.reduce(
                        (sum, s) => sum + s.keys.length,
                        0
                      ) === 1
                        ? ""
                        : "es"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedExportColumns(
                        activeExportColumnDefinitions.map(
                          (column) => column.key
                        )
                      )
                    }
                    disabled={totalSelected === totalAvailable}
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedExportColumns([])}
                    disabled={totalSelected === 0}
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Body — sidebar tabs + content */}
              {sectionsCount === 0 ? (
                <div className="flex-1 overflow-y-auto px-6 py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <Search className="h-10 w-10 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">
                      No columns match "{exportColumnSearch}"
                    </p>
                    <button
                      type="button"
                      onClick={() => setExportColumnSearch("")}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  {/* Stepper tab strip — horizontal pills, scrollable */}
                  <nav
                    aria-label="Export sections"
                    className="flex-shrink-0 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2"
                  >
                    <ul className="flex w-max items-center gap-1.5">
                      {sections.map((section, idx) => {
                        const selected = countSelected(section.keys);
                        const total = section.keys.length;
                        const isActive = section.id === activeExportCategoryId;
                        const isComplete = selected === total && total > 0;
                        const isPartial = selected > 0 && selected < total;
                        return (
                          <li key={section.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveExportCategoryId(section.id)
                              }
                              className={`group relative flex items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                                isActive
                                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <span
                                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                                  isComplete
                                    ? "bg-emerald-500 text-white"
                                    : isActive
                                    ? `${section.accent} text-white`
                                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                                }`}
                                aria-hidden
                              >
                                {isComplete ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  idx + 1
                                )}
                              </span>
                              <span>{section.shortLabel}</span>
                              {isPartial && (
                                <span
                                  className="rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700"
                                  title={`${selected} of ${total} selected`}
                                >
                                  {selected}/{total}
                                </span>
                              )}
                              {isActive && (
                                <span
                                  className={`absolute inset-x-2 -bottom-[7px] h-0.5 rounded-full ${section.accent}`}
                                  aria-hidden
                                />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  {/* Active section content (scrollable) */}
                  <div className="flex-1 overflow-y-auto bg-gray-50/40 px-4 py-4 sm:px-5 sm:py-4">
                    {activeSection && (() => {
                      const sectionSelected = countSelected(activeSection.keys);
                      const sectionTotal = activeSection.keys.length;
                      const sectionComplete =
                        sectionSelected === sectionTotal && sectionTotal > 0;
                      return (
                      <div className="space-y-3">
                        {/* Section header card — compact, no redundant count */}
                        <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${activeSection.accent}`}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="truncate text-sm font-semibold text-gray-900">
                                    {activeSection.label}
                                  </h4>
                                  {sectionComplete ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Complete
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-[11px] font-semibold ${activeSection.accentText}`}
                                    >
                                      {sectionSelected}/{sectionTotal}
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-[11px] text-gray-500">
                                  {activeSection.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectionForKeys(activeSection.keys, true)
                                }
                                disabled={sectionComplete}
                                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectionForKeys(activeSection.keys, false)
                                }
                                disabled={sectionSelected === 0}
                                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Section body: subGroups accordion OR flat grid */}
                        {activeSection.subGroups &&
                        activeSection.subGroups.length > 0 ? (
                          <div className="space-y-3">
                            {activeSection.subGroups
                              .filter((sg) => sg.keys.length > 0)
                              .map((sg) => {
                                const expanded = isSubGroupExpanded(
                                  activeSection.id,
                                  sg
                                );
                                const sgSelected = countSelected(sg.keys);
                                const sgTotal = sg.keys.length;
                                const sgAll = sgSelected === sgTotal;
                                return (
                                  <section
                                    key={sg.id}
                                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                                  >
                                    <div
                                      className={`flex items-center justify-between gap-2 border-gray-100 px-3 py-2 transition-colors ${
                                        expanded
                                          ? "border-b bg-gray-50/70"
                                          : "bg-white hover:bg-gray-50/70"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSubGroup(activeSection.id, sg)
                                        }
                                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 text-left"
                                        aria-expanded={expanded}
                                        aria-controls={`subgroup-${activeSection.id}-${sg.id}`}
                                      >
                                        <span
                                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ${
                                            expanded
                                              ? "bg-gray-200/70 text-gray-700"
                                              : "text-gray-500"
                                          }`}
                                          aria-hidden
                                        >
                                          <ChevronDown
                                            className={`h-3.5 w-3.5 transition-transform ${
                                              expanded ? "" : "-rotate-90"
                                            }`}
                                          />
                                        </span>
                                        <h5 className="truncate text-sm font-semibold text-gray-800">
                                          {sg.label}
                                        </h5>
                                        <span
                                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            sgSelected === 0
                                              ? "bg-gray-100 text-gray-500"
                                              : sgAll
                                              ? "bg-emerald-100 text-emerald-700"
                                              : "bg-blue-100 text-blue-700"
                                          }`}
                                        >
                                          {sgAll && (
                                            <CheckCircle2 className="h-2.5 w-2.5" />
                                          )}
                                          {sgSelected}/{sgTotal}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectionForKeys(sg.keys, !sgAll)
                                        }
                                        className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                      >
                                        {sgAll ? "Deselect" : "Select"}
                                      </button>
                                    </div>
                                    {expanded && (
                                      <div
                                        id={`subgroup-${activeSection.id}-${sg.id}`}
                                        className="grid grid-cols-1 gap-1.5 p-2.5 sm:grid-cols-2"
                                      >
                                        {sg.keys
                                          .map((k) => columnByKey.get(k))
                                          .filter(
                                            (
                                              col
                                            ): col is ExportColumnDefinition =>
                                              col != null
                                          )
                                          .map(renderColumnTile)}
                                      </div>
                                    )}
                                  </section>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {activeSection.keys
                                .map((k) => columnByKey.get(k))
                                .filter(
                                  (col): col is ExportColumnDefinition =>
                                    col != null
                                )
                                .map(renderColumnTile)}
                            </div>
                          </div>
                        )}

                      </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Sticky footer — stepper nav + status + actions */}
              <div className="flex flex-shrink-0 flex-col gap-2 border-t border-gray-200 bg-white px-4 py-2.5 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Stepper navigation (Previous / Section X of Y / Next) */}
                  {sectionsCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = sections[activeIdx - 1];
                          if (prev) setActiveExportCategoryId(prev.id);
                        }}
                        disabled={activeIdx <= 0}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous section"
                      >
                        <ChevronUp className="h-3.5 w-3.5 -rotate-90" />
                      </button>
                      <span className="whitespace-nowrap text-[11px] font-medium text-gray-600">
                        Section{" "}
                        <span className="font-semibold text-gray-900">
                          {activeIdx + 1}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-gray-900">
                          {sectionsCount}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = sections[activeIdx + 1];
                          if (next) setActiveExportCategoryId(next.id);
                        }}
                        disabled={activeIdx >= sectionsCount - 1}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next section"
                      >
                        <ChevronUp className="h-3.5 w-3.5 rotate-90" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-600">
                    {totalSelected === 0 ? (
                      <span className="text-gray-500">
                        Select at least one column to export
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-gray-900">
                          {totalSelected}
                        </span>{" "}
                        column{totalSelected === 1 ? "" : "s"} ready
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    disabled={exportLoading}
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExport("csv")}
                    disabled={
                      exportLoading || selectedExportColumns.length === 0
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-white px-3.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exportLoading ? (
                      <SpinnerIcon
                        size="sm"
                        className="h-3.5 w-3.5 text-blue-600"
                        aria-hidden
                      />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExport("xlsx")}
                    disabled={
                      exportLoading || selectedExportColumns.length === 0
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exportLoading ? (
                      <SpinnerIcon
                        size="sm"
                        className="h-3.5 w-3.5 text-white"
                        aria-hidden
                      />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Export XLSX
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

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
