import {
  Search,
  Eye,
  Pencil,
  ChevronUp,
  ChevronDown,
  Printer,
  Download,
  Plus,
  FileText,
  Trash2,
  RefreshCw,
  Filter,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  hasTechnicalLogbookAtlFilters,
  parseTechnicalLogbookAtlFilters,
} from "../utility/technicalLogbookRoute";
import Swal from "sweetalert2";
import { Spinner } from "../components/ui/spinner";
import { DataTablePagination } from "./ui/DataTablePagination";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { EditTechnicalLogbookEntryModal } from "./EditTechnicalLogbookEntryModal";
import { ViewTechnicalLogbookEntryModal } from "./ViewTechnicalLogbookEntryModal";
import { BulkStatusModal } from "./BulkStatusModal";
import {
  getAircraftTechnicalLogs,
  getManagedAircraftTechnicalLogs,
  getAircraftTechnicalLogById,
  createAircraftTechnicalLog,
  deleteAircraftTechnicalLog,
  updateAircraftTechnicalLog,
  AircraftTechnicalLog,
  getAtlBatchesForSelect,
  pickLatestAtlBatchId,
} from "../api/aircraftTechnicalLogApi";
import { getAircraftList } from "../api/aircraftApi";
import { getMe } from "../api/authApi";
import { useUserPermissions } from "../hooks/useUserPermissions";
import {
  ATL_WORK_STATUS_KEYS,
  formatAtlWorkStatusLabel,
  canManageAtlBatchFilter,
  getAtlEditDeniedMessage,
  canEditAtlFields,
  canOpenAtlEditModal,
  isAtlEditAllowedForRoleAndWorkStatus,
  isMaintenanceManagerRole,
  isMaintenancePlannerRole,
  isQualityManagerRole,
  isTechnicalPublicationRole,
  isTechnicalPublicationRestrictedEdit,
  normalizeAtlWorkStatus,
  type AtlWorkStatusKey,
} from "../utility/atlEditRbac";
import {
  canShowAtlBulkCheckboxForEntry,
  canUseAtlBulkWorkStatusUpdate,
  getAtlBulkTargetStatusesForRole,
  validateAtlEntriesForBulkWorkStatus,
} from "../utility/atlWorkStatusBulk";
import {
  bulkUpdateAtlWorkStatus,
  BulkAtlWorkStatusValidationError,
  type BulkAtlWorkStatusFailedItem,
} from "../services/aircraftTechnicalLog.service";
import { formatDisplayDate } from "../utility/utils";

interface LogbookEntry {
  id: number;
  seqNo: string;
  /** Flight / station date (used by view modal fallbacks) */
  date: string;
  createdAt: string;
  acReg: string;
  route: string;
  origin: string;
  destination: string;
  fltTime: string;
  pilot: string;
  workStatus?: string;
  atlBatchName?: string;
}

interface AircraftFilterOption {
  id: number;
  registration: string;
  model?: string;
}

/** All batches: `Batch name - Sequence No.`; single-batch filter: sequence only. */
function formatLogbookSequenceNoCell(
  seqNo: string,
  atlBatchName: string | undefined,
  allBatchesMode: boolean
): string {
  const seq = (seqNo ?? "").trim() || "—";
  if (!allBatchesMode) return seq;
  const batchName = atlBatchName?.trim();
  if (batchName && batchName !== "—") return `${batchName} - ${seq}`;
  return seq;
}

export function AircraftTechnicalLogbook() {
  const { user, canUpdate, canCreate, canDelete } = useUserPermissions();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedAircraftId, setSelectedAircraftId] = useState("");
  const [aircraftOptions, setAircraftOptions] = useState<
    AircraftFilterOption[]
  >([]);
  const [sortBy, setSortBy] = useState("-created_at"); // Default: newest first
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedAtlBatchId, setSelectedAtlBatchId] = useState("");
  const [selectedWorkStatus, setSelectedWorkStatus] = useState("");
  const [atlBatchFilterOptions, setAtlBatchFilterOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const atlBatchFilterTouchedRef = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [selectedFullEntry, setSelectedFullEntry] =
    useState<AircraftTechnicalLog | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(
    () => new Set()
  );
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const lastAppliedAtlQueryRef = useRef<string | null>(null);

  const selectedAircraftFk =
    selectedAircraftId.trim() !== "" ? Number(selectedAircraftId) : undefined;
  const showAtlBatchFilter = canManageAtlBatchFilter(user?.role);
  const selectedAtlBatchFk = useMemo(() => {
    const n =
      selectedAtlBatchId.trim() !== "" ? Number(selectedAtlBatchId) : NaN;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [selectedAtlBatchId]);
  const selectedWorkStatusFilter = useMemo(() => {
    const normalized = normalizeAtlWorkStatus(selectedWorkStatus);
    return normalized || undefined;
  }, [selectedWorkStatus]);
  const showSeqWithBatchName = selectedAtlBatchFk == null;

  const atlRouteFilters = useMemo(
    () => parseTechnicalLogbookAtlFilters(location.pathname, location.search),
    [location.pathname, location.search]
  );

  const isAtlDeepLinkRoute = useMemo(
    () => hasTechnicalLogbookAtlFilters(atlRouteFilters),
    [atlRouteFilters]
  );

  /** Role from GET /auth/me — aligns ATL edit RBAC with login session (same as Operation). */
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

  const logbookAtlRole = useMemo(
    () => sessionRoleName || user?.role?.trim() || undefined,
    [sessionRoleName, user?.role]
  );

  const isMaintenanceManager = isMaintenanceManagerRole(logbookAtlRole);
  const isQualityManager = isQualityManagerRole(logbookAtlRole);
  const isMaintenancePlanner = isMaintenancePlannerRole(logbookAtlRole);

  const canUpdateLogbookAtl = canUpdate("logbook");

  const bulkWorkStatusOptions = useMemo(
    () => getAtlBulkTargetStatusesForRole(logbookAtlRole),
    [logbookAtlRole]
  );

  const showBulkSelection =
    canUpdateLogbookAtl && canUseAtlBulkWorkStatusUpdate(logbookAtlRole);

  const selectedCount = selectedEntryIds.size;

  // Map backend data to frontend format (presentation only — no derived values)
  const mapToLogbookEntry = (apiEntry: AircraftTechnicalLog): LogbookEntry => {
    const route = `${apiEntry.originStation || ""} → ${
      apiEntry.destinationStation || ""
    }`;

    const fltTimeRaw = apiEntry.totalFlightHours;
    const fltTime =
      fltTimeRaw != null && String(fltTimeRaw).trim() !== ""
        ? `${String(fltTimeRaw).trim()}h`
        : "—";

    const pilotName = apiEntry.remarks
      ? apiEntry.remarks.split("\n")[0].substring(0, 30)
      : "N/A";

    return {
      id: apiEntry.id,
      seqNo: apiEntry.sequenceNo || "",
      date: formatDisplayDate(
        apiEntry.originDate || apiEntry.destinationDate || "",
        { fallback: "" }
      ),
      createdAt: formatDisplayDate(apiEntry.createdAt, { fallback: "—" }),
      acReg: apiEntry.aircraft?.registration || "",
      route: route,
      origin: apiEntry?.originStation || "",
      destination: apiEntry?.destinationStation || "",
      fltTime: fltTime,
      pilot: pilotName,
      workStatus: apiEntry.workStatus,
      atlBatchName: apiEntry.atlBatch?.name?.trim() || "—",
    };
  };

  // Fetch entries from API
  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      // Notification deep-link: always use manage/paged with atl_batch, search, etc.
      const response =
        !isMaintenancePlanner || isAtlDeepLinkRoute
          ? await getManagedAircraftTechnicalLogs(
              currentPage,
              itemsPerPage,
              debouncedSearchTerm,
              selectedAircraftFk,
              sortBy,
              selectedWorkStatusFilter,
              selectedAtlBatchFk
            )
          : await getAircraftTechnicalLogs(
              currentPage,
              itemsPerPage,
              debouncedSearchTerm,
              selectedAircraftFk,
              sortBy,
              selectedWorkStatusFilter,
              selectedAtlBatchFk
            );

      const mappedEntries = response.items.map((entry) =>
        mapToLogbookEntry(entry)
      );

      setEntries(mappedEntries);
      setTotalPages(
        response.total > 0 ? Math.max(1, response.pages) : response.pages
      );
      setTotalEntries(response.total);
    } catch (err: any) {
      // Check for network errors (backend not running)
      if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error" ||
        err.message?.includes("CONNECTION_REFUSED")
      ) {
        setError(
          "Unable to connect to the backend server. Please ensure the backend is running at http://localhost:8000"
        );
      } else {
        setError(
          err.response?.data?.detail || err.message || "Failed to fetch entries"
        );
      }
      setEntries([]);
      setTotalPages(0);
      setTotalEntries(0);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  };

  // Debounce search term
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 500); // 500ms delay

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchEntries();
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    selectedAircraftFk,
    selectedAtlBatchFk,
    selectedWorkStatusFilter,
    sortBy,
    isMaintenancePlanner,
    isAtlDeepLinkRoute,
  ]);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAircraftId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAtlBatchId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWorkStatus]);

  useEffect(() => {
    setSelectedEntryIds(new Set());
  }, [
    currentPage,
    debouncedSearchTerm,
    selectedAircraftFk,
    selectedAtlBatchFk,
    selectedWorkStatusFilter,
    sortBy,
  ]);

  useEffect(() => {
    if (!showAtlBatchFilter) {
      setAtlBatchFilterOptions([]);
      atlBatchFilterTouchedRef.current = false;
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
  }, [showAtlBatchFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadAircraftOptions = async () => {
      try {
        const response = await getAircraftList();
        const data = response?.data ?? [];
        const rawItems = Array.isArray(data)
          ? data
          : data.items ?? data.results ?? data.data ?? [];
        const list = Array.isArray(rawItems) ? rawItems : [];
        const normalized = list
          .map((item: any) => ({
            id: Number(item?.id ?? 0),
            registration: String(item?.registration ?? "").trim(),
            model: String(item?.model ?? "").trim(),
          }))
          .filter(
            (item: AircraftFilterOption) => item.id > 0 && item.registration
          )
          .sort((a: AircraftFilterOption, b: AircraftFilterOption) =>
            a.registration.localeCompare(b.registration)
          );

        if (isMounted) {
          setAircraftOptions(normalized);
        }
      } catch {
        if (isMounted) {
          setAircraftOptions([]);
        }
      }
    };

    loadAircraftOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const { sequenceNo, aircraftId, atlBatchFk } = atlRouteFilters;
    const sequenceNoParam = sequenceNo;
    const aircraftIdParam = aircraftId;
    const atlBatchParam = atlBatchFk;

    const queryKey = `${location.pathname}${location.search}`;
    if (lastAppliedAtlQueryRef.current === queryKey) return;

    if (!aircraftIdParam && !atlBatchParam && !sequenceNoParam) {
      lastAppliedAtlQueryRef.current = queryKey;
      return;
    }

    if (atlBatchParam) {
      const batchAsNumber = Number(atlBatchParam);
      const isNumericBatch = Number.isFinite(batchAsNumber) && batchAsNumber > 0;
      if (!isNumericBatch && atlBatchFilterOptions.length === 0) {
        return;
      }
    }

    atlBatchFilterTouchedRef.current = true;

    if (aircraftIdParam) {
      setSelectedAircraftId(aircraftIdParam);
    }

    if (atlBatchParam) {
      const batchAsNumber = Number(atlBatchParam);
      const isNumericBatch = Number.isFinite(batchAsNumber) && batchAsNumber > 0;
      const matchedBatchId = isNumericBatch
        ? String(batchAsNumber)
        : (
            atlBatchFilterOptions.find(
              (option) =>
                option.name.trim().toLowerCase() === atlBatchParam.toLowerCase()
            )?.id ?? ""
          ).toString();
      if (matchedBatchId) {
        setSelectedAtlBatchId(matchedBatchId);
      }
    } else {
      // Deep link without batch — search across all batches (not latest default).
      setSelectedAtlBatchId("");
    }

    if (sequenceNoParam) {
      setSearchTerm(sequenceNoParam);
      setDebouncedSearchTerm(sequenceNoParam);
    }

    setSortBy("-created_at");
    setCurrentPage(1);
    lastAppliedAtlQueryRef.current = queryKey;
  }, [
    atlRouteFilters,
    location.pathname,
    location.search,
    showAtlBatchFilter,
    atlBatchFilterOptions,
  ]);

  const paginatedEntries = entries;

  const selectablePageEntries = useMemo(
    () =>
      paginatedEntries.filter((e) =>
        canShowAtlBulkCheckboxForEntry(logbookAtlRole, e.workStatus)
      ),
    [paginatedEntries, logbookAtlRole]
  );

  const selectablePageIds = useMemo(
    () => selectablePageEntries.map((e) => e.id),
    [selectablePageEntries]
  );

  const allPageSelected =
    selectablePageIds.length > 0 &&
    selectablePageIds.every((id) => selectedEntryIds.has(id));

  const clearSelection = () => setSelectedEntryIds(new Set());

  const toggleEntrySelection = (id: number) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        selectablePageIds.forEach((id) => next.delete(id));
      } else {
        selectablePageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  useEffect(() => {
    setSelectedEntryIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<number>();
      for (const id of prev) {
        const entry = entries.find((e) => e.id === id);
        if (
          entry &&
          canShowAtlBulkCheckboxForEntry(logbookAtlRole, entry.workStatus)
        ) {
          next.add(id);
        }
      }
      if (next.size === prev.size) {
        let unchanged = true;
        for (const id of prev) {
          if (!next.has(id)) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) return prev;
      }
      return next;
    });
  }, [entries, logbookAtlRole]);

  const formatBulkFailedItemsHtml = (items: BulkAtlWorkStatusFailedItem[]) => {
    if (!items.length) return "";
    const rows = items
      .slice(0, 8)
      .map(
        (item) =>
          `<li class="text-left"><strong>ID ${item.id}</strong>: ${item.reason}</li>`
      )
      .join("");
    const more =
      items.length > 8
        ? `<li class="text-left text-gray-500">…and ${
            items.length - 8
          } more</li>`
        : "";
    return `<ul class="list-disc pl-5 mt-2 space-y-1 text-sm">${rows}${more}</ul>`;
  };

  const handleBulkStatusConfirm = async (
    targetStatus: AtlWorkStatusKey,
    atomic: boolean
  ) => {
    const selected = paginatedEntries.filter(
      (e) =>
        selectedEntryIds.has(e.id) &&
        canShowAtlBulkCheckboxForEntry(logbookAtlRole, e.workStatus)
    );
    const { validIds, failedItems: clientFailed } =
      validateAtlEntriesForBulkWorkStatus(
        logbookAtlRole,
        selected.map((e) => ({ id: e.id, workStatus: e.workStatus })),
        targetStatus
      );

    if (atomic && clientFailed.length > 0) {
      await Swal.fire({
        icon: "error",
        title: "Bulk update cancelled",
        html: `<p class="text-left">Atomic update requires every selected entry to pass workflow rules. Fix the following and try again:</p>${formatBulkFailedItemsHtml(
          clientFailed
        )}`,
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    const idsToSend = atomic
      ? validIds
      : [...new Set(selected.map((e) => e.id))];

    if (idsToSend.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Nothing to update",
        text: "No selected entries can be updated to the chosen work status.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    setBulkSubmitting(true);
    try {
      const result = await bulkUpdateAtlWorkStatus({
        ids: idsToSend,
        work_status: targetStatus,
        atomic,
      });

      const mergedFailed = [
        ...clientFailed,
        ...result.failed_items.filter(
          (f) => !clientFailed.some((c) => c.id === f.id)
        ),
      ];

      await fetchEntries();
      clearSelection();
      setShowBulkStatusModal(false);

      if (result.updated_count > 0 && mergedFailed.length === 0) {
        await Swal.fire({
          icon: "success",
          title: "Work status updated",
          text: `${result.updated_count} ${
            result.updated_count === 1 ? "entry" : "entries"
          } updated successfully.`,
          confirmButtonColor: "#1f2937",
        });
        return;
      }

      if (result.updated_count > 0 && mergedFailed.length > 0) {
        await Swal.fire({
          icon: "warning",
          title: "Partial update",
          html: `<p class="text-left"><strong>${
            result.updated_count
          }</strong> updated, <strong>${
            mergedFailed.length
          }</strong> failed.</p>${formatBulkFailedItemsHtml(mergedFailed)}`,
          confirmButtonColor: "#1f2937",
        });
        return;
      }

      await Swal.fire({
        icon: "error",
        title: "Update failed",
        html: `<p class="text-left">No entries were updated.</p>${formatBulkFailedItemsHtml(
          mergedFailed
        )}`,
        confirmButtonColor: "#dc2626",
      });
    } catch (err: unknown) {
      const message =
        err instanceof BulkAtlWorkStatusValidationError
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail ||
            (err as Error)?.message ||
            "Failed to update work status";
      await Swal.fire({
        icon: "error",
        title: "Bulk update failed",
        text: String(message),
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const tableColSpan = showBulkSelection ? 6 : 5;

  /** Fixed-width select column so header and row checkboxes stay vertically aligned. */
  const bulkSelectCellClass = "w-11 min-w-[44px] max-w-[44px] p-0 align-middle";
  const bulkSelectCheckboxWrapClass =
    "flex items-center justify-center px-3 py-3.5";
  const bulkSelectCheckboxClass =
    "h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500";

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Don't reset page here - let debounce handle it
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    // If already sorting by this column, toggle direction
    if (sortBy === column) {
      setSortBy(`-${column}`);
    } else if (sortBy === `-${column}`) {
      setSortBy(column);
    } else {
      // New column, default to descending
      setSortBy(`-${column}`);
    }
    setCurrentPage(1);
  };

  // Get sort indicator for a column
  const getSortIndicator = (column: string) => {
    const activeColumn = sortBy.replace("-", "");
    const isActive = activeColumn === column;
    const isDescending = sortBy.startsWith("-");

    if (!isActive) {
      return null;
    }

    return (
      <span className="flex items-center gap-0.5">
        {isDescending ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-[10px] text-gray-400">1</span>
      </span>
    );
  };

  // Handle view entry - fetch full details
  const handleViewEntry = async (entry: LogbookEntry) => {
    try {
      const fullEntry = await getAircraftTechnicalLogById(entry.id);
      setSelectedFullEntry(fullEntry);
      setSelectedEntry(entry);
      setIsViewModalOpen(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to fetch entry details"
      );
    }
  };

  const canOpenAtlEditForEntry = (_entry: LogbookEntry) =>
    canOpenAtlEditModal(logbookAtlRole);

  const allowAtlEditForEntry = (entry: LogbookEntry) =>
    canEditAtlFields(logbookAtlRole, entry.workStatus);

  const atlEditButtonTitle = (entry: LogbookEntry) => {
    if (!canOpenAtlEditForEntry(entry))
      return "Edit not available for your role";
    if (!allowAtlEditForEntry(entry)) return "View entry (read-only)";
    return "Edit";
  };

  /** Technical Publication may edit White ATL / DFP / links without logbook Update permission. */
  const logbookTechPubCanEditAtl = (entry: LogbookEntry) =>
    isTechnicalPublicationRole(logbookAtlRole) && canOpenAtlEditForEntry(entry);

  // Handle edit entry – Edit modal fetches full details via READ
  const handleEditEntry = (entry: LogbookEntry) => {
    if (!canOpenAtlEditForEntry(entry)) return;
    setSelectedEntry(entry);
    setIsEditModalOpen(true);
  };

  // Handle delete entry
  const handleDeleteEntry = async (entry: LogbookEntry) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Are you sure you want to delete entry with Sequence No ${formatLogbookSequenceNoCell(
        entry.seqNo,
        entry.atlBatchName,
        showSeqWithBatchName
      )}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteAircraftTechnicalLog(entry.id);
      // Refresh the list
      await fetchEntries();
      // If we're on a page that becomes empty, go to previous page
      if (entries.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      // Show success message
      Swal.fire({
        title: "Deleted!",
        text: "Entry has been deleted successfully.",
        icon: "success",
        confirmButtonColor: "#1f2937",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({
        title: "Error!",
        text:
          err.response?.data?.detail || err.message || "Failed to delete entry",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const handleWorkStatusAction = async (
    entry: LogbookEntry,
    config: {
      nextWorkStatus:
        | "APPROVED"
        | "REJECTED_MAINTENANCE"
        | "COMPLETED"
        | "REJECTED_QUALITY"
        | "PENDING"
        | "FOR_REVIEW";
      confirmTitle: string;
      confirmButtonText: string;
      successMessage: string;
      confirmButtonColor: string;
    }
  ) => {
    const confirmResult = await Swal.fire({
      title: config.confirmTitle,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: config.confirmButtonColor,
      cancelButtonColor: "#6b7280",
      confirmButtonText: config.confirmButtonText,
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      await updateAircraftTechnicalLog(entry.id, {
        work_status: config.nextWorkStatus,
      });

      await fetchEntries();

      await Swal.fire({
        title: "Success!",
        text: config.successMessage,
        icon: "success",
        confirmButtonColor: "#1f2937",
      });
    } catch (err: any) {
      await Swal.fire({
        title: "Error!",
        text:
          err.response?.data?.detail ||
          err.message ||
          "Failed to update work status",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // Handle create entry success
  const handleCreateSuccess = () => {
    setIsModalOpen(false);
    fetchEntries();
    setCurrentPage(1);
    Swal.fire({
      title: "Success!",
      text: "Entry has been created successfully.",
      icon: "success",
      confirmButtonColor: "#1f2937",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Handle update entry success
  const handleUpdateSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedEntry(null);
    setSelectedFullEntry(null);
    fetchEntries();
    Swal.fire({
      title: "Updated!",
      text: "Entry has been updated successfully.",
      icon: "success",
      confirmButtonColor: "#1f2937",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Aircraft Technical Logbook
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Comprehensive flight and maintenance records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Printer className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Print</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export</span>
          </button>
          {canCreate("logbook") && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total Entries</span>
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-900 text-2xl sm:text-3xl">
            {totalEntries || 0}
          </p>
        </div>
      </div>

      {/* Blue Banner */}
      <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg">
        <span className="tracking-wide text-sm sm:text-base">
          Technical Logbook Entries
        </span>
      </div>

      {showBulkSelection && selectedCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex w-full items-center justify-between gap-6 rounded-lg border border-blue-200 bg-[#eef5fc] px-5 py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            {/* <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold leading-none text-white"
              aria-hidden
            > */}
            {/* {selectedCount} */}
            {/* </span> */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {selectedCount} {selectedCount === 1 ? "entry" : "entries"}{" "}
                selected
              </p>
              <button
                type="button"
                onClick={clearSelection}
                className="mt-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
              >
                Clear selection
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBulkStatusModal(true)}
            className="ml-auto inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          >
            <Filter className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            Update Status
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2">Search Entries</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by sequence number, A/C REG, route, or station..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
              />
            </div>
          </div>
          <div className="md:w-72">
            <label className="block text-gray-700 mb-2">Aircraft</label>
            <select
              value={selectedAircraftId}
              onChange={(e) => setSelectedAircraftId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            >
              <option value="">All Aircraft</option>
              {aircraftOptions.map((aircraft) => (
                <option key={aircraft.id} value={aircraft.id}>
                  {aircraft.registration}
                  {aircraft.model ? ` - ${aircraft.model}` : ""}
                </option>
              ))}
            </select>
          </div>
          {showAtlBatchFilter && (
            <div className="md:w-72">
              <label
                htmlFor="logbook-atl-batch-filter"
                className="block text-gray-700 mb-2 flex items-center gap-2"
              >
                <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                ATL batch
              </label>
              <select
                id="logbook-atl-batch-filter"
                value={selectedAtlBatchId}
                onChange={(e) => {
                  atlBatchFilterTouchedRef.current = true;
                  setSelectedAtlBatchId(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
              >
                <option value="">All batches</option>
                {atlBatchFilterOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="md:w-72">
            <label
              htmlFor="logbook-work-status-filter"
              className="block text-gray-700 mb-2"
            >
              Work Status
            </label>
            <select
              id="logbook-work-status-filter"
              value={selectedWorkStatus}
              onChange={(e) => setSelectedWorkStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            >
              <option value="">All Work Status</option>
              {ATL_WORK_STATUS_KEYS.map((statusKey) => (
                <option key={statusKey} value={statusKey}>
                  {formatAtlWorkStatusLabel(statusKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {error ? (
            <div className="text-sm text-red-600">Error: {error}</div>
          ) : null}

          {/* Entries Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {showBulkSelection && (
                      <th className={bulkSelectCellClass}>
                        <div className={bulkSelectCheckboxWrapClass}>
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            disabled={selectablePageIds.length === 0}
                            onChange={toggleSelectAllOnPage}
                            aria-label="Select all eligible entries on this page"
                            className={bulkSelectCheckboxClass}
                          />
                        </div>
                      </th>
                    )}
                    <th
                      className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("sequence_no")}
                    >
                      <b>SEQUENCE NO</b>
                      {getSortIndicator("sequence_no")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("aircraft_registration")}
                    >
                      <b>A/C REG</b>
                      {getSortIndicator("aircraft_registration")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("work_status")}
                    >
                      <b>WORK STATUS</b>
                      {getSortIndicator("work_status")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("created_at")}
                    >
                      <b>CREATED AT</b>
                      {getSortIndicator("created_at")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {error ? (
                    <tr>
                      <td
                        colSpan={tableColSpan}
                        className="px-6 py-12 text-center text-red-600"
                      >
                        Error loading entries: {error}
                      </td>
                    </tr>
                  ) : paginatedEntries.length > 0 ? (
                    paginatedEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`transition-colors hover:bg-gray-50 ${
                          selectedEntryIds.has(entry.id) ? "bg-blue-50/60" : ""
                        }`}
                      >
                        {showBulkSelection && (
                          <td className={bulkSelectCellClass}>
                            <div className={bulkSelectCheckboxWrapClass}>
                              {canShowAtlBulkCheckboxForEntry(
                                logbookAtlRole,
                                entry.workStatus
                              ) ? (
                                <input
                                  type="checkbox"
                                  checked={selectedEntryIds.has(entry.id)}
                                  onChange={() =>
                                    toggleEntrySelection(entry.id)
                                  }
                                  aria-label={`Select entry ${entry.seqNo}`}
                                  className={bulkSelectCheckboxClass}
                                />
                              ) : null}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-3.5 text-gray-900">
                          {formatLogbookSequenceNoCell(
                            entry.seqNo,
                            entry.atlBatchName,
                            showSeqWithBatchName
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {entry.acReg}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {entry.workStatus?.trim() || "—"}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {entry.createdAt}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewEntry(entry)}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(canUpdateLogbookAtl ||
                              logbookTechPubCanEditAtl(entry)) &&
                              canOpenAtlEditForEntry(entry) && (
                                <button
                                  type="button"
                                  onClick={() => handleEditEntry(entry)}
                                  className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-600 disabled:hover:bg-transparent"
                                  title={atlEditButtonTitle(entry)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                            {canDelete("logbook") && (
                              <button
                                onClick={() => handleDeleteEntry(entry)}
                                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {isMaintenancePlanner &&
                              (() => {
                                const ws = normalizeAtlWorkStatus(
                                  entry.workStatus
                                );
                                if (
                                  ws !== "REJECTED_QUALITY" &&
                                  ws !== "REJECTED_MAINTENANCE"
                                ) {
                                  return null;
                                }
                                const renewConfig =
                                  ws === "REJECTED_QUALITY"
                                    ? {
                                        nextWorkStatus: "PENDING" as const,
                                        confirmTitle:
                                          "Renew this ATL? Work status will change to Pending.",
                                        confirmButtonText: "Renew",
                                        successMessage:
                                          "Work status has been successfully updated to Pending.",
                                        confirmButtonColor: "#2563eb",
                                      }
                                    : {
                                        nextWorkStatus: "FOR_REVIEW" as const,
                                        confirmTitle:
                                          "Renew this ATL? Work status will change to For Review.",
                                        confirmButtonText: "Renew",
                                        successMessage:
                                          "Work status has been successfully updated to For Review.",
                                        confirmButtonColor: "#2563eb",
                                      };
                                return (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWorkStatusAction(entry, renewConfig)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 rounded transition-colors"
                                    title="Renew ATL"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                                    Renew
                                  </button>
                                );
                              })()}
                            {isMaintenanceManager &&
                              normalizeAtlWorkStatus(entry.workStatus) ===
                                "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWorkStatusAction(entry, {
                                        nextWorkStatus: "APPROVED",
                                        confirmTitle:
                                          "Are you sure you what to Approved this ATL",
                                        confirmButtonText: "Approve",
                                        successMessage:
                                          "Update Work status to Approved",
                                        confirmButtonColor: "#2563eb",
                                      })
                                    }
                                    className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                                    title="Approve ATL"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWorkStatusAction(entry, {
                                        nextWorkStatus: "REJECTED_MAINTENANCE",
                                        confirmTitle:
                                          "Are you sure you what to Reject this ATL",
                                        confirmButtonText: "Reject",
                                        successMessage:
                                          "Update Work status to Rejected Maintenance",
                                        confirmButtonColor: "#dc2626",
                                      })
                                    }
                                    className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                    title="Reject ATL"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            {isQualityManager &&
                              normalizeAtlWorkStatus(entry.workStatus) ===
                                "APPROVED" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWorkStatusAction(entry, {
                                        nextWorkStatus: "COMPLETED",
                                        confirmTitle:
                                          "Are you sure you want to mark this ATL as Completed?",
                                        confirmButtonText: "Complete",
                                        successMessage:
                                          "Work status has been successfully updated to Completed.",
                                        confirmButtonColor: "#16a34a",
                                      })
                                    }
                                    className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                                    title="Complete ATL"
                                  >
                                    Complete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWorkStatusAction(entry, {
                                        nextWorkStatus: "REJECTED_QUALITY",
                                        confirmTitle:
                                          "Are you sure you want to reject this ATL?",
                                        confirmButtonText: "Reject",
                                        successMessage:
                                          "Work status has been successfully updated to Rejected (Quality).",
                                        confirmButtonColor: "#dc2626",
                                      })
                                    }
                                    className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                    title="Reject ATL"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={tableColSpan}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No entries found matching your search criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalEntries}
              totalLabel="entries"
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[10, 20, 30, 50]}
              disabled={loading}
              className="px-6"
            />
          </div>
        </>
      )}

      {/* Add Entry Modal – CREATE */}
      <AddTechnicalLogbookEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
        permissionModuleCode="logbook"
        defaultAtlBatchFk={
          showAtlBatchFilter &&
          selectedAtlBatchFk != null &&
          Number.isFinite(selectedAtlBatchFk) &&
          selectedAtlBatchFk > 0
            ? selectedAtlBatchFk
            : undefined
        }
      />

      {/* Edit Entry Modal – READ + UPDATE */}
      {selectedEntry && (
        <EditTechnicalLogbookEntryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEntry(null);
            setSelectedFullEntry(null);
          }}
          onSuccess={handleUpdateSuccess}
          entryId={selectedEntry.id}
          permissionModuleCode="logbook"
          viewerRole={logbookAtlRole}
          editRestrictedToWhiteAtlDfpOnly={isTechnicalPublicationRestrictedEdit(
            logbookAtlRole,
            selectedEntry.workStatus
          )}
        />
      )}

      <BulkStatusModal
        isOpen={showBulkStatusModal}
        selectedCount={selectedCount}
        statusOptions={bulkWorkStatusOptions}
        submitting={bulkSubmitting}
        onClose={() => {
          if (!bulkSubmitting) setShowBulkStatusModal(false);
        }}
        onConfirm={handleBulkStatusConfirm}
      />

      {/* View Entry Modal */}
      <ViewTechnicalLogbookEntryModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedEntry(null);
          setSelectedFullEntry(null);
        }}
        entry={selectedEntry}
        fullEntry={selectedFullEntry}
      />
    </div>
  );
}
