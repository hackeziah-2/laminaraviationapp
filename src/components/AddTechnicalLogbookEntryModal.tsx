import {
  X,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Loader2,
  Download,
  Eye,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import { getAircrafts, getAircraftById } from "../api/aircraftApi";
import {
  getAccountsByDesignation,
  getAllAccounts,
  Account,
} from "../api/accountApi";
import { getMe } from "../api/authApi";
import {
  getLatestAircraftTechnicalLog,
  AircraftTechnicalLog,
  createAircraftTechnicalLog,
  AircraftTechnicalLogCreate,
  updateAircraftTechnicalLog,
  AircraftTechnicalLogUpdate,
  type AtlListViewComputedComponentTimes,
} from "../api/aircraftTechnicalLogApi";
import {
  snakeAllKeys,
  computeTotalBlockTimeFromUtc,
  toCamel,
} from "../utility/utils";
import {
  getMissingAircraftFieldsForNewAtl,
  buildAircraftDetailsRequiredForAtlHtml,
  ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
} from "../utility/atlAircraftPrerequisites";
import type { Aircraft } from "../types/Aircraft";
import apiClient from "../api/index";
import { useUserPermissions } from "../hooks/useUserPermissions";
import {
  formatAtlWorkStatusLabel,
  getAtlWorkStatusDropdownKeysForRole,
  canUploadWhiteAtlAndDfpFiles,
  normalizeAtlWorkStatus,
} from "../utility/atlEditRbac";

/**
 * Flat + nested engine/propeller/airframe shapes from the ATL API (matches Operation list display).
 */
function resolveAtlEditComponentSources(entry: AircraftTechnicalLog) {
  const r = entry as Record<string, any>;
  const air = r.airframe;
  const eng = r.engine;
  const prop = r.propeller;

  const airframeRun =
    r.airframeRunTime ??
    r.airframeTotalTime ??
    air?.hrsTime ??
    air?.run ??
    r.airframeRun;
  const airframeAftt = r.airframeAftt ?? r.airframeTotalTime ?? air?.aftt;

  const engineRun =
    r.engineRunTime ??
    r.engineTotalTime ??
    eng?.hrsTime ??
    eng?.run ??
    r.engineRun;
  const engineTsn =
    r.engineTsn ??
    r.engine_tsn ??
    eng?.tsn ??
    eng?.engineTsn ??
    eng?.engine_tsn;
  const engineTso =
    r.engineTso ??
    r.engine_tso ??
    eng?.tso ??
    eng?.engineTso ??
    eng?.engine_tso;
  const engineTbo =
    r.engineTbo ??
    r.engine_tbo ??
    eng?.tbo ??
    eng?.engineTbo ??
    eng?.engine_tbo;

  const propRun =
    r.propellerRunTime ??
    r.propellerTotalTime ??
    prop?.hrsTime ??
    prop?.run ??
    r.propellerRun;
  const propellerTsn =
    r.propellerTsn ??
    r.propeller_tsn ??
    prop?.tsn ??
    prop?.propellerTsn ??
    prop?.propeller_tsn;
  const propellerTso =
    r.propellerTso ??
    r.propeller_tso ??
    prop?.tso ??
    prop?.propellerTso ??
    prop?.propeller_tso;
  const propellerTbo =
    r.propellerTbo ??
    r.propeller_tbo ??
    prop?.tbo ??
    prop?.propellerTbo ??
    prop?.propeller_tbo;

  const numStr = (v: unknown) =>
    v === null || v === undefined || v === "" ? "" : String(v);

  return {
    airframeRunTime: numStr(airframeRun),
    airframeAftt: numStr(airframeAftt),
    engineRunTime: numStr(engineRun),
    engineTsn,
    engineTso: numStr(engineTso),
    engineTbo: numStr(engineTbo),
    propellerRunTime: numStr(propRun),
    propellerTsn:
      propellerTsn != null && propellerTsn !== "" ? String(propellerTsn) : "",
    propellerTso: numStr(propellerTso),
    propellerTbo: numStr(propellerTbo),
  };
}

function formatListComputedForAtlForm(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return Number(n).toFixed(2);
}

/** Prefer API/stored values; if missing, use Operation list row computed totals (cumulative TSN/TSO, etc.). */
function mergeAtlResolvedWithListComputed(
  resolved: unknown,
  listValue: number | null | undefined,
  fallbackEmpty: string
): string {
  if (resolved != null && resolved !== "") return String(resolved);
  const c = formatListComputedForAtlForm(listValue);
  return c !== "" ? c : fallbackEmpty;
}

function parseFiniteFloatField(value: string | undefined | null): number | null {
  if (value == null) return null;
  const t = String(value).trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** API expects engine_tsn; never send NaN/undefined from blank or whitespace fields. */
function resolveEngineTsnForApi(formData: {
  engineTsn: string;
  engineRunTime: string;
  engineTotalTime: string;
  tachometerStart: string;
  tachometerEnd: string;
}): number {
  const direct = parseFiniteFloatField(formData.engineTsn);
  if (direct != null) return direct;
  const run =
    parseFiniteFloatField(formData.engineRunTime) ??
    parseFiniteFloatField(formData.engineTotalTime);
  if (run != null && run >= 0) return run;
  const tachEnd = parseFiniteFloatField(formData.tachometerEnd);
  const tachStart = parseFiniteFloatField(formData.tachometerStart);
  if (tachEnd != null && tachStart != null) {
    const delta = tachEnd - tachStart;
    if (Number.isFinite(delta) && delta >= 0) return delta;
  }
  return 0;
}

interface AddTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editEntry?: AircraftTechnicalLog | null;
  /**
   * Operation ATL: same row’s client-computed component times as the grid (fills gaps when GET-by-id omits cumulative fields).
   */
  listViewComputedTimes?: AtlListViewComputedComponentTimes | null;
  onSuccess?: () => void;
  aircraftId?: number; // Optional aircraft ID from useParams
  /** Module code for role Update permission (e.g. operation, logbook). Required when editEntry is set. */
  permissionModuleCode?: string;
  /** When editing, limits Work Status options to statuses allowed for this role (see atlEditRbac). */
  viewerRole?: string;
  /**
   * Operation / Technical Publication: edit modal only allows uploading White ATL and DFP;
   * all other fields are read-only and Update requires a new file selection.
   */
  editRestrictedToWhiteAtlDfpOnly?: boolean;
}

export function AddTechnicalLogbookEntryModal({
  isOpen,
  onClose,
  editEntry,
  listViewComputedTimes = null,
  onSuccess,
  aircraftId,
  permissionModuleCode,
  viewerRole,
  editRestrictedToWhiteAtlDfpOnly = false,
}: AddTechnicalLogbookEntryModalProps) {
  const {
    canUpdate,
    canCreate,
    user: permUser,
    loading: permLoading,
  } = useUserPermissions();

  /**
   * Role name from GET /auth/me while editing — source of truth for Work Status dropdown RBAC
   * (matches logged-in user’s role from the session).
   */
  const [atlAuthRole, setAtlAuthRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      setAtlAuthRole(undefined);
      return;
    }
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setAtlAuthRole(me.role?.trim() || undefined);
      })
      .catch(() => {
        if (!cancelled) setAtlAuthRole(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /** Prefer /me (login), then permissions hook, then parent prop — all should match after load. */
  const atlRoleForWorkStatus = useMemo(
    () =>
      atlAuthRole || permUser?.role?.trim() || viewerRole?.trim() || undefined,
    [atlAuthRole, permUser?.role, viewerRole]
  );

  const canUploadAtlAttachments = useMemo(
    () => canUploadWhiteAtlAndDfpFiles(atlRoleForWorkStatus),
    [atlRoleForWorkStatus]
  );

  const attachmentsOnlyLocked = Boolean(
    editRestrictedToWhiteAtlDfpOnly && editEntry
  );

  const mod = permissionModuleCode;

  const [formData, setFormData] = useState({
    seqNo: "",
    workStatus: "FOR_REVIEW",
    acReg: "",
    natureOfFlight: "",
    // Off-blocks/Origin
    offBlocksDate: "",
    offBlocksTime: "",
    offBlocksStation: "",
    // On-blocks/Destination
    onBlocksDate: "",
    onBlocksTime: "",
    onBlocksStation: "",
    totalFlightTime: "",
    numberOfLandings: "",
    // Fuel
    fuelQtyLeftUpliftQty: "",
    fuelQtyRightUpliftQty: "",
    fuelQtyLeftPriorDeparture: "",
    fuelQtyRightPriorDeparture: "",
    fuelQtyLeftAfterOnBlks: "",
    fuelQtyRightAfterOnBlks: "",
    // Oil
    oilQtyUpliftQty: "",
    oilQtyPriorDeparture: "",
    oilQtyAfterOnBlks: "",
    // Times
    priorDepartureHours: "",
    priorDepartureMinutes: "",
    afterLandingHours: "",
    afterLandingMinutes: "",
    // Tachometer & Hobbs
    tachometerStart: "0",
    tachometerEnd: "0",
    tachometerTotal: "0",
    hobbsMeterStart: "0",
    hobbsMeterEnd: "0",
    hobbsMeterTotal: "0",
    // Inspection & Service
    nextInspectionDue: "",
    tachTimeDue: "",
    // Remarks
    pilotReport: "",
    remarksPerson: "",
    actionsTaken: "",
    actionsTakenPerson: "",
    // Signatures
    pilotName: "",
    pilotFk: "",
    pilotAcceptDate: "",
    pilotAcceptTime: "",
    pilotSignature: null as File | null,
    rtsName: "",
    rtsSignedBy: "",
    rtsDate: "",
    rtsTime: "",
    mechanicAuth: "",
    mechanicSignature: null as File | null,
    whiteAtl: null as File | null,
    dfp: null as File | null,
    // Airframe & Component Times

    airframePrevTime: "",
    airframeFlightTime: "",
    airframeTotalTime: "",
    airframeRunTime: "",
    airframeAftt: "",

    enginePrevTime: "",
    engineFlightTime: "",
    engineTotalTime: "",
    engineRunTime: "",
    engineTsn: "",
    engineTso: "",
    engineTbo: "",
    propellerPrevTime: "",
    propellerFlightTime: "",
    propellerTotalTime: "",
    propellerRunTime: "",
    propellerTsn: "",
    propellerTso: "",
    propellerTbo: "",
    lifeTimeLimitEngine: "",
    lifeTimeLimitPropeller: "",
  });

  const allowSubmit = useMemo(
    () =>
      (!editEntry && (!mod || canCreate(mod))) ||
      (!!editEntry &&
        Boolean(mod) &&
        (attachmentsOnlyLocked
          ? canUploadAtlAttachments &&
            (formData.whiteAtl instanceof File || formData.dfp instanceof File)
          : canUpdate(mod as string))),
    [
      editEntry,
      mod,
      canCreate,
      canUpdate,
      attachmentsOnlyLocked,
      canUploadAtlAttachments,
      formData.whiteAtl,
      formData.dfp,
    ]
  );

  const workStatusDropdownKeys = useMemo(
    () =>
      getAtlWorkStatusDropdownKeysForRole(atlRoleForWorkStatus, {
        pendingRole: Boolean(editEntry && permLoading && !atlRoleForWorkStatus),
        currentWorkStatus: formData.workStatus,
      }),
    [editEntry, permLoading, atlRoleForWorkStatus, formData.workStatus]
  );

  // Component Records state
  interface ComponentRecord {
    id: string; // temporary ID for React key
    qty: string;
    unit: string;
    nomenclature: string;
    removedPartNo: string;
    removedSerialNo: string;
    installedPartNo: string;
    installedSerialNo: string;
    ataChapter: string;
  }

  const [componentRecords, setComponentRecords] = useState<ComponentRecord[]>(
    []
  );

  // Previous values for ATL auto-compute (set when loading latest or edit)
  const [previousEngineTsn, setPreviousEngineTsn] = useState<number>(0);
  const [previousEngineTso, setPreviousEngineTso] = useState<number>(0);
  const [previousPropellerTsn, setPreviousPropellerTsn] = useState<number>(0);
  const [previousPropellerTso, setPreviousPropellerTso] = useState<number>(0);

  // Aircraft searchable dropdown state
  const [aircrafts, setAircrafts] = useState<
    Array<{ id: number; registration: string }>
  >([]);
  const [aircraftSearchTerm, setAircraftSearchTerm] = useState("");
  const [isAircraftDropdownOpen, setIsAircraftDropdownOpen] = useState(false);
  const [loadingAircrafts, setLoadingAircrafts] = useState(false);
  const [selectedAircraftId, setSelectedAircraftId] = useState<number | null>(
    null
  );
  const aircraftDropdownRef = useRef<HTMLDivElement>(null);

  // Account dropdowns state
  const [remarksAccounts, setRemarksAccounts] = useState<Account[]>([]);
  const [actionsTakenAccounts, setActionsTakenAccounts] = useState<Account[]>(
    []
  );
  const [loadingRemarksAccounts, setLoadingRemarksAccounts] = useState(false);
  const [loadingActionsTakenAccounts, setLoadingActionsTakenAccounts] =
    useState(false);

  // Remarks Person searchable dropdown state
  const [remarksSearchTerm, setRemarksSearchTerm] = useState("");
  const [isRemarksDropdownOpen, setIsRemarksDropdownOpen] = useState(false);
  const [debouncedRemarksSearch, setDebouncedRemarksSearch] = useState("");
  const remarksDropdownRef = useRef<HTMLDivElement>(null);

  // Actions Taken Person searchable dropdown state
  const [actionsTakenSearchTerm, setActionsTakenSearchTerm] = useState("");
  const [isActionsTakenDropdownOpen, setIsActionsTakenDropdownOpen] =
    useState(false);
  const [debouncedActionsTakenSearch, setDebouncedActionsTakenSearch] =
    useState("");
  const actionsTakenDropdownRef = useRef<HTMLDivElement>(null);

  // Pilot Name searchable dropdown state
  const [pilotAccounts, setPilotAccounts] = useState<Account[]>([]);
  const [loadingPilotAccounts, setLoadingPilotAccounts] = useState(false);
  const [pilotSearchTerm, setPilotSearchTerm] = useState("");
  const [isPilotDropdownOpen, setIsPilotDropdownOpen] = useState(false);
  const [debouncedPilotSearch, setDebouncedPilotSearch] = useState("");
  const pilotDropdownRef = useRef<HTMLDivElement>(null);

  // RTS Name searchable dropdown state
  const [rtsAccounts, setRtsAccounts] = useState<Account[]>([]);
  const [loadingRtsAccounts, setLoadingRtsAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rtsSearchTerm, setRtsSearchTerm] = useState("");
  const [isRtsDropdownOpen, setIsRtsDropdownOpen] = useState(false);
  const [debouncedRtsSearch, setDebouncedRtsSearch] = useState("");
  const rtsDropdownRef = useRef<HTMLDivElement>(null);

  // File upload states
  const [whiteAtlFileName, setWhiteAtlFileName] = useState("");
  const [dfpFileName, setDfpFileName] = useState("");

  // File view modal (View button for White ATL / DFP when editEntry has existing file)
  const [showFileViewModal, setShowFileViewModal] = useState(false);
  const [fileViewBlobUrl, setFileViewBlobUrl] = useState<string | null>(null);
  const [fileViewMimeType, setFileViewMimeType] = useState<string | null>(null);
  const [fileViewLoading, setFileViewLoading] = useState(false);
  const [fileViewError, setFileViewError] = useState<string | null>(null);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Latest entry sequence number (for format validation: must match same digit length as latest, e.g. 00013)
  const [latestSequenceNo, setLatestSequenceNo] = useState<string | null>(null);

  // Fetch aircrafts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAircrafts();
    }
  }, [isOpen]);

  // Auto-select aircraft when aircraftId prop is provided (from useParams)
  useEffect(() => {
    if (aircraftId && isOpen && !editEntry && !selectedAircraftId) {
      // Find the aircraft in the list and auto-select it
      const findAndSelectAircraft = async () => {
        try {
          // First, try to fetch aircraft by ID directly
          try {
            const response = await getAircraftById(aircraftId);
            const aircraftData = response.data;
            const aircraftCamel = toCamel(aircraftData) as Aircraft;
            const missing = getMissingAircraftFieldsForNewAtl(aircraftCamel);
            if (missing.length > 0) {
              await Swal.fire({
                icon: "warning",
                title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
                html: buildAircraftDetailsRequiredForAtlHtml(aircraftCamel),
                confirmButtonColor: "#2563eb",
              });
              onClose();
              return;
            }
            setFormData((prev) => ({
              ...prev,
              acReg: aircraftData.registration || "",
            }));
            setSelectedAircraftId(aircraftId);

            // Fetch latest technical log for auto-population
            const latestEntry = await getLatestAircraftTechnicalLog(aircraftId);
            if (latestEntry) {
              setLatestSequenceNo(latestEntry.sequenceNo ?? null);
              setFormData((prev) => ({
                ...prev,
                hobbsMeterStart:
                  latestEntry.hobbsMeterEnd != null &&
                  latestEntry.hobbsMeterEnd !== 0
                    ? latestEntry.hobbsMeterEnd.toString()
                    : prev.hobbsMeterStart,
                tachometerStart:
                  latestEntry.tachometerEnd != null &&
                  latestEntry.tachometerEnd !== 0
                    ? latestEntry.tachometerEnd.toString()
                    : prev.tachometerStart,

                airframePrevTime:
                  latestEntry.airframeTotalTime?.toString() ||
                  prev.airframePrevTime,
                enginePrevTime:
                  latestEntry.engineTotalTime?.toString() ||
                  prev.enginePrevTime,
                propellerPrevTime:
                  latestEntry.propellerTotalTime?.toString() ||
                  prev.enginePrevTime,
              }));
            } else {
              setLatestSequenceNo(null);
            }
          } catch (error) {
            console.error("Error fetching aircraft by ID:", error);
            // Fallback: try to find in aircrafts list
            if (aircrafts.length > 0) {
              const aircraft = aircrafts.find((ac) => ac.id === aircraftId);
              if (aircraft) {
                try {
                  const fullRes = await getAircraftById(aircraftId);
                  const aircraftCamel = toCamel(fullRes.data) as Aircraft;
                  const missing =
                    getMissingAircraftFieldsForNewAtl(aircraftCamel);
                  if (missing.length > 0) {
                    await Swal.fire({
                      icon: "warning",
                      title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
                      html: buildAircraftDetailsRequiredForAtlHtml(
                        aircraftCamel
                      ),
                      confirmButtonColor: "#2563eb",
                    });
                    onClose();
                    return;
                  }
                } catch {
                  return;
                }
                setFormData((prev) => ({
                  ...prev,
                  acReg: aircraft.registration,
                }));
                setSelectedAircraftId(aircraftId);

                // Fetch latest technical log
                try {
                  const latestEntry = await getLatestAircraftTechnicalLog(
                    aircraftId
                  );
                  if (latestEntry) {
                    setLatestSequenceNo(latestEntry.sequenceNo ?? null);
                    setFormData((prev) => ({
                      ...prev,
                      hobbsMeterStart:
                        latestEntry.hobbsMeterEnd != null &&
                        latestEntry.hobbsMeterEnd !== 0
                          ? latestEntry.hobbsMeterEnd.toString()
                          : prev.hobbsMeterStart,
                      tachometerStart:
                        latestEntry.tachometerEnd != null &&
                        latestEntry.tachometerEnd !== 0
                          ? latestEntry.tachometerEnd.toString()
                          : prev.tachometerStart,

                      airframePrevTime:
                        latestEntry.airframeTotalTime?.toString() ||
                        prev.airframePrevTime,
                      enginePrevTime:
                        latestEntry.engineTotalTime?.toString() ||
                        prev.enginePrevTime,
                      propellerPrevTime:
                        latestEntry.propellerTotalTime?.toString() ||
                        prev.enginePrevTime,
                    }));
                  } else {
                    setLatestSequenceNo(null);
                  }
                } catch (error) {
                  console.error("Error fetching latest technical log:", error);
                }
              }
            }
          }
        } catch (error) {
          console.error("Error in auto-select aircraft:", error);
        }
      };

      findAndSelectAircraft();
    }
  }, [aircraftId, isOpen, editEntry]);

  // Populate form when editEntry is provided
  useEffect(() => {
    if (editEntry && isOpen) {
      setLatestSequenceNo(null); // No format validation when editing
      const comp = resolveAtlEditComponentSources(editEntry);
      const lc = listViewComputedTimes;
      const mergedEngineTso = mergeAtlResolvedWithListComputed(
        comp.engineTso,
        lc?.engineTso,
        ""
      );
      const mergedPropTsn = mergeAtlResolvedWithListComputed(
        comp.propellerTsn,
        lc?.propellerTsn,
        ""
      );
      const mergedPropTso = mergeAtlResolvedWithListComputed(
        comp.propellerTso,
        lc?.propellerTso,
        ""
      );
      const mergedEngineTsnStr = mergeAtlResolvedWithListComputed(
        comp.engineTsn,
        lc?.engineTsn,
        "0.0"
      );
      const tachStart = Number(editEntry.tachometerStart) || 0;
      const tachEnd = Number(editEntry.tachometerEnd) || 0;
      const run = tachEnd - tachStart;
      setPreviousEngineTsn(
        Math.max(0, (parseFloat(mergedEngineTsnStr) || 0) - run)
      );
      setPreviousEngineTso(Math.max(0, (Number(mergedEngineTso) || 0) - run));
      setPreviousPropellerTsn(
        Math.max(0, (parseFloat(String(mergedPropTsn)) || 0) - run)
      );
      setPreviousPropellerTso(Math.max(0, (Number(mergedPropTso) || 0) - run));
      // Populate form data from editEntry (normalize workStatus: API may return "FOR REVIEW" or "FOR_REVIEW")
      setFormData({
        seqNo: (editEntry.sequenceNo ?? "").toString().replace(/\D/g, ""),
        workStatus: (() => {
          const raw =
            editEntry.workStatus === "FOR REVIEW"
              ? "FOR_REVIEW"
              : String(editEntry.workStatus ?? "").trim();
          const key = normalizeAtlWorkStatus(raw);
          return key || raw || "";
        })(),
        acReg: editEntry.aircraft?.registration || "",
        // null/empty from API -> "" (-); VOID from API -> "VOID"; normalize TR W/ PIREM -> TR_WITH_PIREM
        natureOfFlight: (() => {
          const nof = String(editEntry.natureOfFlight ?? "").trim();
          if (nof === "VOID") return "VOID";
          if (nof === "TR W/ PIREM" || nof === "TR_WITH_PIREM")
            return "TR_WITH_PIREM";
          return nof;
        })(),
        offBlocksDate: editEntry.originDate || "",
        offBlocksTime: formatTimeFromAPI(editEntry.originTime),
        offBlocksStation: editEntry.originStation || "",
        onBlocksDate: editEntry.destinationDate || "",
        onBlocksTime: formatTimeFromAPI(editEntry.destinationTime),
        onBlocksStation: editEntry.destinationStation || "",
        totalFlightTime: "",
        numberOfLandings: editEntry.numberOfLandings?.toString() || "",
        fuelQtyLeftUpliftQty: editEntry.fuelQtyLeftUpliftQty?.toString() || "",
        fuelQtyRightUpliftQty:
          editEntry.fuelQtyRightUpliftQty?.toString() || "",
        fuelQtyLeftPriorDeparture:
          editEntry.fuelQtyLeftPriorDeparture?.toString() || "",
        fuelQtyRightPriorDeparture:
          editEntry.fuelQtyRightPriorDeparture?.toString() || "",
        fuelQtyLeftAfterOnBlks:
          editEntry.fuelQtyLeftAfterOnBlks?.toString() || "",
        fuelQtyRightAfterOnBlks:
          editEntry.fuelQtyRightAfterOnBlks?.toString() || "",
        oilQtyUpliftQty: editEntry.oilQtyUpliftQty?.toString() || "",
        oilQtyPriorDeparture: editEntry.oilQtyPriorDeparture?.toString() || "",
        oilQtyAfterOnBlks: editEntry.oilQtyAfterOnBlks?.toString() || "",
        priorDepartureHours: "",
        priorDepartureMinutes: "",
        afterLandingHours: "",
        afterLandingMinutes: "",
        tachometerStart: editEntry.tachometerStart?.toString() || "",
        tachometerEnd: editEntry.tachometerEnd?.toString() || "",
        tachometerTotal: editEntry.tachometerTotal?.toString() || "",
        hobbsMeterStart: editEntry.hobbsMeterStart?.toString() || "",
        hobbsMeterEnd: editEntry.hobbsMeterEnd?.toString() || "",
        hobbsMeterTotal: editEntry.hobbsMeterTotal?.toString() || "",
        nextInspectionDue: editEntry.nextInspectionDue || "",
        tachTimeDue: editEntry.tachTimeDue?.toString() || "",
        pilotReport: editEntry.remarks || "",
        remarksPerson: editEntry.maintenanceFk?.toString() || "",
        actionsTaken: editEntry.actionsTaken || "",
        actionsTakenPerson: editEntry.maintenanceFk?.toString() || "",
        pilotName: "",
        pilotFk:
          editEntry.pilotFk?.toString() ||
          editEntry.pilotAcceptedBy?.toString() ||
          "",
        pilotAcceptDate: editEntry.pilotAcceptDate || "",
        pilotAcceptTime: formatTimeFromAPI(editEntry.pilotAcceptTime),
        pilotSignature: null,
        rtsName: "",
        rtsSignedBy: editEntry.rtsSignedBy?.toString() || "",
        rtsDate: editEntry.rtsDate || "",
        rtsTime: formatTimeFromAPI(editEntry.rtsTime),
        mechanicAuth: "",
        mechanicSignature: null,
        whiteAtl: null,
        dfp: null,
        airframePrevTime: (editEntry as any).airframePrevTime?.toString() || "",
        airframeFlightTime:
          (editEntry as any).airframeFlightTime?.toString() || "",
        airframeTotalTime:
          (editEntry as any).airframeTotalTime?.toString() || "",
        airframeRunTime: mergeAtlResolvedWithListComputed(
          comp.airframeRunTime,
          lc?.airframeRunTime,
          ""
        ),
        airframeAftt: mergeAtlResolvedWithListComputed(
          comp.airframeAftt,
          lc?.airframeAftt,
          ""
        ),
        enginePrevTime: (editEntry as any).enginePrevTime?.toString() || "",
        engineFlightTime: (editEntry as any).engineFlightTime?.toString() || "",
        engineTotalTime: (editEntry as any).engineTotalTime?.toString() || "",
        engineRunTime: mergeAtlResolvedWithListComputed(
          comp.engineRunTime,
          lc?.engineRunTime,
          ""
        ),
        engineTsn: mergedEngineTsnStr,
        engineTso: mergedEngineTso,
        engineTbo: mergeAtlResolvedWithListComputed(
          comp.engineTbo,
          lc?.engineTbo,
          ""
        ),
        propellerPrevTime:
          (editEntry as any).propellerPrevTime?.toString() || "",
        propellerFlightTime:
          (editEntry as any).propellerFlightTime?.toString() || "",
        propellerTotalTime:
          (editEntry as any).propellerTotalTime?.toString() || "",
        propellerRunTime: mergeAtlResolvedWithListComputed(
          comp.propellerRunTime,
          lc?.propellerRunTime,
          ""
        ),
        propellerTsn: mergedPropTsn,
        propellerTso: mergedPropTso,
        propellerTbo: mergeAtlResolvedWithListComputed(
          comp.propellerTbo,
          lc?.propellerTbo,
          ""
        ),
        lifeTimeLimitEngine: editEntry.lifeTimeLimitEngine?.toString() || "",
        lifeTimeLimitPropeller:
          editEntry.lifeTimeLimitPropeller?.toString() || "",
      });

      // Set selected aircraft ID
      if (editEntry.aircraftFk) {
        setSelectedAircraftId(editEntry.aircraftFk);
      }

      // Populate component parts
      if (
        editEntry.componentParts &&
        Array.isArray(editEntry.componentParts) &&
        editEntry.componentParts.length > 0
      ) {
        const componentRecordsData: ComponentRecord[] =
          editEntry.componentParts.map((part: any, index) => ({
            id: `component-${part.id || Date.now()}-${index}`,
            qty:
              part.qty !== undefined && part.qty !== null
                ? part.qty.toString()
                : "",
            unit: part.unit || "",
            nomenclature: part.nomenclature || "",
            // Handle both camelCase and snake_case field names
            removedPartNo: part.removedPartNo || part.removed_part_no || "",
            removedSerialNo:
              part.removedSerialNo || part.removed_serial_no || "",
            installedPartNo:
              part.installedPartNo || part.installed_part_no || "",
            installedSerialNo:
              part.installedSerialNo || part.installed_serial_no || "",
            ataChapter: part.ataChapter || part.ata_chapter || "",
          }));
        setComponentRecords(componentRecordsData);
      } else {
        setComponentRecords([]);
      }
    } else if (!editEntry && isOpen) {
      // Reset form when creating new entry
      setPreviousEngineTsn(0);
      setPreviousEngineTso(0);
      setPreviousPropellerTsn(0);
      setPreviousPropellerTso(0);
      setFormData({
        seqNo: "",
        workStatus: "FOR_REVIEW",
        acReg: "",
        natureOfFlight: "",
        offBlocksDate: "",
        offBlocksTime: "",
        offBlocksStation: "",
        onBlocksDate: "",
        onBlocksTime: "",
        onBlocksStation: "",
        totalFlightTime: "",
        numberOfLandings: "",
        fuelQtyLeftUpliftQty: "",
        fuelQtyRightUpliftQty: "",
        fuelQtyLeftPriorDeparture: "",
        fuelQtyRightPriorDeparture: "",
        fuelQtyLeftAfterOnBlks: "",
        fuelQtyRightAfterOnBlks: "",
        oilQtyUpliftQty: "",
        oilQtyPriorDeparture: "",
        oilQtyAfterOnBlks: "",
        priorDepartureHours: "",
        priorDepartureMinutes: "",
        afterLandingHours: "",
        afterLandingMinutes: "",
        tachometerStart: "0",
        tachometerEnd: "0",
        tachometerTotal: "0",
        hobbsMeterStart: "0",
        hobbsMeterEnd: "0",
        hobbsMeterTotal: "0",
        nextInspectionDue: "",
        tachTimeDue: "",
        pilotReport: "",
        remarksPerson: "",
        actionsTaken: "",
        actionsTakenPerson: "",
        pilotName: "",
        pilotFk: "",
        pilotAcceptDate: "",
        pilotAcceptTime: "",
        pilotSignature: null,
        rtsName: "",
        rtsSignedBy: "",
        rtsDate: "",
        rtsTime: "",
        mechanicAuth: "",
        mechanicSignature: null,
        whiteAtl: null,
        dfp: null,
        airframePrevTime: "",
        airframeFlightTime: "",
        airframeTotalTime: "",
        airframeRunTime: "",
        airframeAftt: "",
        enginePrevTime: "",
        engineFlightTime: "",
        engineTotalTime: "",
        engineRunTime: "",
        engineTsn: "",
        engineTso: "",
        engineTbo: "",
        propellerPrevTime: "",
        propellerFlightTime: "",
        propellerTotalTime: "",
        propellerRunTime: "",
        propellerTsn: "",
        propellerTso: "",
        propellerTbo: "",
        lifeTimeLimitEngine: "",
        lifeTimeLimitPropeller: "",
      });
      setComponentRecords([]);
    }
  }, [editEntry, isOpen, listViewComputedTimes]);

  // Fetch latest technical log entry to populate start values (only for new entries)
  const fetchLatestTechnicalLog = async () => {
    try {
      // Don't fetch if editing an existing entry
      if (editEntry) {
        return;
      }

      // Don't fetch if no aircraft is selected
      if (!selectedAircraftId) {
        return;
      }

      // Check if this is a new entry (both start values are empty)
      const isNewEntry =
        (formData.hobbsMeterStart === "" || formData.hobbsMeterStart === "0") &&
        (formData.tachometerStart === "" || formData.tachometerStart === "0");

      if (isNewEntry) {
        const latestEntry = await getLatestAircraftTechnicalLog(
          selectedAircraftId
        );
        if (latestEntry) {
          setLatestSequenceNo(latestEntry.sequenceNo ?? null);
          setPreviousEngineTsn(
            parseFloat(
              String(
                latestEntry.engineTsn != null &&
                  latestEntry.engineTsn !== ""
                  ? latestEntry.engineTsn
                  : 0
              )
            ) || 0
          );
          setPreviousEngineTso(Number(latestEntry.engineTso) || 0);
          setPreviousPropellerTsn(
            parseFloat(String(latestEntry.propellerTsn)) || 0
          );
          setPreviousPropellerTso(Number(latestEntry.propellerTso) || 0);
          setFormData((prev) => ({
            ...prev,
            hobbsMeterStart:
              latestEntry.hobbsMeterEnd != null &&
              latestEntry.hobbsMeterEnd !== 0
                ? latestEntry.hobbsMeterEnd.toString()
                : prev.hobbsMeterStart,
            tachometerStart:
              latestEntry.tachometerEnd != null &&
              latestEntry.tachometerEnd !== 0
                ? latestEntry.tachometerEnd.toString()
                : prev.tachometerStart,

            airframePrevTime:
              latestEntry.airframeTotalTime?.toString() ||
              latestEntry.airframeAftt?.toString() ||
              prev.airframePrevTime,
            enginePrevTime:
              latestEntry.engineTotalTime?.toString() || prev.enginePrevTime,
            propellerPrevTime:
              latestEntry.propellerTotalTime?.toString() ||
              prev.propellerPrevTime,
            airframeRunTime:
              latestEntry.airframeRunTime?.toString() ??
              latestEntry.airframeTotalTime?.toString() ??
              prev.airframeRunTime,
            airframeAftt:
              latestEntry.airframeAftt?.toString() ?? prev.airframeAftt,
            engineRunTime:
              latestEntry.engineRunTime?.toString() ??
              latestEntry.engineTotalTime?.toString() ??
              prev.engineRunTime,
            engineTsn:
              latestEntry.engineTsn != null && latestEntry.engineTsn !== ""
                ? String(latestEntry.engineTsn)
                : prev.engineTsn != null
                ? String(prev.engineTsn)
                : "",
            engineTso: latestEntry.engineTso?.toString() ?? prev.engineTso,
            engineTbo: latestEntry.engineTbo?.toString() ?? prev.engineTbo,
            propellerRunTime:
              latestEntry.propellerRunTime?.toString() ??
              latestEntry.propellerTotalTime?.toString() ??
              prev.propellerRunTime,
            propellerTsn:
              latestEntry.propellerTsn?.toString() ?? prev.propellerTsn,
            propellerTso:
              latestEntry.propellerTso?.toString() ?? prev.propellerTso,
            propellerTbo:
              latestEntry.propellerTbo?.toString() ?? prev.propellerTbo,
            lifeTimeLimitEngine:
              latestEntry.lifeTimeLimitEngine?.toString() ??
              prev.lifeTimeLimitEngine,
            lifeTimeLimitPropeller:
              latestEntry.lifeTimeLimitPropeller?.toString() ??
              prev.lifeTimeLimitPropeller,

            // airframeFlightTime: "",
            // engineFlightTime: "",
            // propellerFlightTime: "",

            // airframeTotalTime: "",
            // engineTotalTime: "",
            // propellerTotalTime: "",

            // airFramePrevTime:
            //   latestEntry.airFramePrevTime?.toString() || prev.airFramePrevTime,
            // enginePrevTime:
            //   latestEntry.enginePrevTime?.toString() || prev.enginePrevTime,
            // propellerPrevTime:
            //   latestEntry.propellerPrevTime?.toString() || prev.propellerPrevTime,
          }));
        } else {
          setLatestSequenceNo(null);
        }
      }
    } catch (error) {
      console.error("Error fetching latest technical log:", error);
      // Silently fail - don't show error to user, just use empty values
    }
  };

  // Debounce remarks search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRemarksSearch(remarksSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [remarksSearchTerm]);

  // Debounce actions taken search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedActionsTakenSearch(actionsTakenSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [actionsTakenSearchTerm]);

  // Debounce pilot search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPilotSearch(pilotSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [pilotSearchTerm]);

  // Debounce RTS search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRtsSearch(rtsSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [rtsSearchTerm]);

  // Fetch remarks accounts when dropdown opens or search changes
  useEffect(() => {
    if (isRemarksDropdownOpen) {
      fetchRemarksAccounts(debouncedRemarksSearch);
    }
  }, [debouncedRemarksSearch, isRemarksDropdownOpen]);

  // Fetch actions taken accounts when dropdown opens or search changes
  useEffect(() => {
    if (isActionsTakenDropdownOpen) {
      fetchActionsTakenAccounts(debouncedActionsTakenSearch);
    }
  }, [debouncedActionsTakenSearch, isActionsTakenDropdownOpen]);

  // Fetch pilot accounts when dropdown opens or search changes
  useEffect(() => {
    if (isPilotDropdownOpen) {
      fetchPilotAccounts(debouncedPilotSearch);
    }
  }, [debouncedPilotSearch, isPilotDropdownOpen]);

  // Fetch RTS accounts when dropdown opens or search changes
  useEffect(() => {
    if (isRtsDropdownOpen) {
      fetchRtsAccounts(debouncedRtsSearch);
    }
  }, [debouncedRtsSearch, isRtsDropdownOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aircraftDropdownRef.current &&
        !aircraftDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAircraftDropdownOpen(false);
      }
      if (
        remarksDropdownRef.current &&
        !remarksDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRemarksDropdownOpen(false);
      }
      if (
        actionsTakenDropdownRef.current &&
        !actionsTakenDropdownRef.current.contains(event.target as Node)
      ) {
        setIsActionsTakenDropdownOpen(false);
      }
      if (
        pilotDropdownRef.current &&
        !pilotDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPilotDropdownOpen(false);
      }
      if (
        rtsDropdownRef.current &&
        !rtsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRtsDropdownOpen(false);
      }
    };

    if (
      isAircraftDropdownOpen ||
      isRemarksDropdownOpen ||
      isActionsTakenDropdownOpen ||
      isPilotDropdownOpen ||
      isRtsDropdownOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    isAircraftDropdownOpen,
    isRemarksDropdownOpen,
    isActionsTakenDropdownOpen,
    isPilotDropdownOpen,
    isRtsDropdownOpen,
  ]);

  const fetchAircrafts = async () => {
    setLoadingAircrafts(true);
    try {
      const response = await getAircrafts(1, 100, "", "", "");
      const aircraftList = response.data.items.map((item: any) => ({
        id: item.id,
        registration: item.registration,
      }));
      setAircrafts(aircraftList);
    } catch (err) {
      console.error("Error fetching aircrafts:", err);
      setAircrafts([]);
    } finally {
      setTimeout(() => setLoadingAircrafts(false), 360);
    }
  };

  // Filter aircrafts based on search term
  const filteredAircrafts = aircrafts.filter((aircraft) =>
    aircraft.registration
      .toLowerCase()
      .includes(aircraftSearchTerm.toLowerCase())
  );

  const handleAircraftSelect = async (id: number, registration: string) => {
    if (!editEntry) {
      try {
        const res = await getAircraftById(id);
        const aircraftCamel = toCamel(res.data) as Aircraft;
        const missing = getMissingAircraftFieldsForNewAtl(aircraftCamel);
        if (missing.length > 0) {
          await Swal.fire({
            icon: "warning",
            title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
            html: buildAircraftDetailsRequiredForAtlHtml(aircraftCamel),
            confirmButtonColor: "#2563eb",
          });
          return;
        }
      } catch (err) {
        console.error("Could not verify aircraft for ATL:", err);
        await Swal.fire({
          icon: "error",
          title: "Validation error",
          text: "Could not load aircraft information. Please try again.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
    }

    setFormData({ ...formData, acReg: registration });
    setSelectedAircraftId(id);
    setAircraftSearchTerm("");
    setIsAircraftDropdownOpen(false);
    // Clear validation error when aircraft is selected
    if (validationErrors.acReg) {
      setValidationErrors({ ...validationErrors, acReg: "" });
    }

    // Fetch latest technical log for the selected aircraft and update start values (only for new entries)
    if (!editEntry) {
      try {
        const latestEntry = await getLatestAircraftTechnicalLog(id);
        if (latestEntry) {
          setLatestSequenceNo(latestEntry.sequenceNo ?? null);
          setPreviousEngineTsn(
            parseFloat(
              String(
                latestEntry.engineTsn != null &&
                  latestEntry.engineTsn !== ""
                  ? latestEntry.engineTsn
                  : 0
              )
            ) || 0
          );
          setPreviousEngineTso(Number(latestEntry.engineTso) || 0);
          setPreviousPropellerTsn(
            parseFloat(String(latestEntry.propellerTsn)) || 0
          );
          setPreviousPropellerTso(Number(latestEntry.propellerTso) || 0);
          setFormData((prev) => ({
            ...prev,
            hobbsMeterStart:
              latestEntry.hobbsMeterEnd != null &&
              latestEntry.hobbsMeterEnd !== 0
                ? latestEntry.hobbsMeterEnd.toString()
                : prev.hobbsMeterStart,
            tachometerStart:
              latestEntry.tachometerEnd != null &&
              latestEntry.tachometerEnd !== 0
                ? latestEntry.tachometerEnd.toString()
                : prev.tachometerStart,

            airframePrevTime:
              latestEntry.airframeTotalTime?.toString() ||
              latestEntry.airframeAftt?.toString() ||
              prev.airframePrevTime,
            enginePrevTime:
              latestEntry.engineTotalTime?.toString() || prev.enginePrevTime,
            propellerPrevTime:
              latestEntry.propellerTotalTime?.toString() ||
              prev.propellerPrevTime,
            airframeRunTime:
              latestEntry.airframeRunTime?.toString() ??
              latestEntry.airframeTotalTime?.toString() ??
              prev.airframeRunTime,
            airframeAftt:
              latestEntry.airframeAftt?.toString() ?? prev.airframeAftt,
            engineRunTime:
              latestEntry.engineRunTime?.toString() ??
              latestEntry.engineTotalTime?.toString() ??
              prev.engineRunTime,
            engineTsn:
              latestEntry.engineTsn != null && latestEntry.engineTsn !== ""
                ? String(latestEntry.engineTsn)
                : prev.engineTsn != null
                ? String(prev.engineTsn)
                : "",
            engineTso: latestEntry.engineTso?.toString() ?? prev.engineTso,
            engineTbo: latestEntry.engineTbo?.toString() ?? prev.engineTbo,
            propellerRunTime:
              latestEntry.propellerRunTime?.toString() ??
              latestEntry.propellerTotalTime?.toString() ??
              prev.propellerRunTime,
            propellerTsn:
              latestEntry.propellerTsn?.toString() ?? prev.propellerTsn,
            propellerTso:
              latestEntry.propellerTso?.toString() ?? prev.propellerTso,
            propellerTbo:
              latestEntry.propellerTbo?.toString() ?? prev.propellerTbo,
            lifeTimeLimitEngine:
              latestEntry.lifeTimeLimitEngine?.toString() ??
              prev.lifeTimeLimitEngine,
            lifeTimeLimitPropeller:
              latestEntry.lifeTimeLimitPropeller?.toString() ??
              prev.lifeTimeLimitPropeller,
          }));
        } else {
          setLatestSequenceNo(null);
          // If no latest entry exists, clear the start values
          setFormData((prev) => ({
            ...prev,
            hobbsMeterStart: "0",
            tachometerStart: "0",
          }));
        }
      } catch (error) {
        console.error("Error fetching latest technical log:", error);
        // Silently fail - don't show error to user
      }
    }
  };

  // Fetch accounts for Remarks (Pilot and Mechanic)
  const fetchRemarksAccounts = async (search: string = "") => {
    setLoadingRemarksAccounts(true);
    try {
      const accounts = await getAccountsByDesignation(
        ["Pilot", "Mechanic"],
        search
      );
      setRemarksAccounts(accounts);
    } catch (err) {
      console.error("Error fetching remarks accounts:", err);
      setRemarksAccounts([]);
    } finally {
      setTimeout(() => setLoadingRemarksAccounts(false), 360);
    }
  };

  // Fetch accounts for Actions Taken (Mechanic only)
  const fetchActionsTakenAccounts = async (search: string = "") => {
    setLoadingActionsTakenAccounts(true);
    try {
      const accounts = await getAccountsByDesignation(["Mechanic"], search);
      setActionsTakenAccounts(accounts);
    } catch (err) {
      console.error("Error fetching actions taken accounts:", err);
      setActionsTakenAccounts([]);
    } finally {
      setTimeout(() => setLoadingActionsTakenAccounts(false), 360);
    }
  };

  // Fetch accounts for Pilot Name (Pilot only)
  const fetchPilotAccounts = async (search: string = "") => {
    setLoadingPilotAccounts(true);
    try {
      const accounts = await getAccountsByDesignation(["Pilot"], search);
      setPilotAccounts(accounts);
    } catch (err) {
      console.error("Error fetching pilot accounts:", err);
      setPilotAccounts([]);
    } finally {
      setTimeout(() => setLoadingPilotAccounts(false), 360);
    }
  };

  // Fetch accounts for RTS Name (Mechanic or Mechanic)
  const fetchRtsAccounts = async (search: string = "") => {
    setLoadingRtsAccounts(true);
    try {
      const accounts = await getAccountsByDesignation(
        ["Mechanic", "Mechanic"],
        search
      );
      setRtsAccounts(accounts);
    } catch (err) {
      console.error("Error fetching RTS accounts:", err);
      setRtsAccounts([]);
    } finally {
      setTimeout(() => setLoadingRtsAccounts(false), 360);
    }
  };

  // Handle remarks person select
  const handleRemarksPersonSelect = (
    accountId: string,
    displayValue: string
  ) => {
    setFormData({ ...formData, remarksPerson: accountId });
    setRemarksSearchTerm("");
    setIsRemarksDropdownOpen(false);
  };

  // Handle actions taken person select
  const handleActionsTakenPersonSelect = (
    accountId: string,
    displayValue: string
  ) => {
    setFormData({ ...formData, actionsTakenPerson: accountId });
    setActionsTakenSearchTerm("");
    setIsActionsTakenDropdownOpen(false);
  };

  // Get selected account display value
  const getSelectedRemarksPerson = () => {
    if (!formData.remarksPerson) return "";
    const account = remarksAccounts.find(
      (acc) => acc.id.toString() === formData.remarksPerson
    );
    return account ? `${account.fullName}-${account.licenseNo}` : "";
  };

  const getSelectedActionsTakenPerson = () => {
    if (!formData.actionsTakenPerson) return "";
    const account = actionsTakenAccounts.find(
      (acc) => acc.id.toString() === formData.actionsTakenPerson
    );
    return account ? `${account.fullName}-${account.licenseNo}` : "";
  };

  // Handle pilot name select
  const handlePilotSelect = (accountId: string, displayValue: string) => {
    setFormData({ ...formData, pilotFk: accountId, pilotName: displayValue });
    setPilotSearchTerm("");
    setIsPilotDropdownOpen(false);
    // Clear validation error when pilot is selected
    if (validationErrors.pilotFk) {
      setValidationErrors({ ...validationErrors, pilotFk: "" });
    }
  };

  // Get selected pilot display value
  const getSelectedPilot = () => {
    // If pilotName is set, use it (it's set when pilot is selected)
    if (formData.pilotName) return formData.pilotName;
    // Otherwise try to find in accounts list
    if (formData.pilotFk && pilotAccounts.length > 0) {
      const account = pilotAccounts.find(
        (acc) => acc.id.toString() === formData.pilotFk
      );
      if (account) return `${account.fullName}-${account.licenseNo}`;
    }
    return "";
  };

  // Filter pilot accounts based on search term
  const filteredPilotAccounts = pilotAccounts.filter((account) =>
    `${account.fullName}-${account.licenseNo}`
      .toLowerCase()
      .includes(pilotSearchTerm.toLowerCase())
  );

  // Handle RTS name select
  const handleRtsSelect = (accountId: string, displayValue: string) => {
    setFormData({ ...formData, rtsSignedBy: accountId, rtsName: displayValue });
    setRtsSearchTerm("");
    setIsRtsDropdownOpen(false);
    // Clear validation error when RTS is selected
    if (validationErrors.rtsSignedBy) {
      setValidationErrors({ ...validationErrors, rtsSignedBy: "" });
    }
  };

  // Get selected RTS display value
  const getSelectedRts = () => {
    // If rtsName is set, use it (it's set when RTS is selected)
    if (formData.rtsName) return formData.rtsName;
    // Otherwise try to find in accounts list
    if (formData.rtsSignedBy && rtsAccounts.length > 0) {
      const account = rtsAccounts.find(
        (acc) => acc.id.toString() === formData.rtsSignedBy
      );
      if (account) return `${account.fullName}-${account.licenseNo}`;
    }
    return "";
  };

  // Filter RTS accounts based on search term
  const filteredRtsAccounts = rtsAccounts.filter((account) =>
    `${account.fullName}-${account.licenseNo}`
      .toLowerCase()
      .includes(rtsSearchTerm.toLowerCase())
  );

  // Format time input to HH:MM format
  const formatTimeInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");

    // Limit to 4 digits
    const limited = numbers.slice(0, 4);

    // Add colon after 2 digits if we have more than 2
    if (limited.length > 2) {
      return `${limited.slice(0, 2)}:${limited.slice(2)}`;
    }

    return limited;
  };

  // Convert time to API format: HH:MM or HH:MM:SS (24-hour). API expects colon format, not HHMM.
  const convertTimeToAPIFormat = (timeStr: string): string => {
    if (!timeStr || !timeStr.trim()) return "";
    const cleaned = timeStr.replace(/\s/g, "").replace(/^Z$/i, "");
    if (!cleaned) return "";
    // Already HH:MM or HH:MM:SS
    if (cleaned.includes(":")) {
      const parts = cleaned.split(":");
      if (parts.length >= 2) {
        const h = parts[0].padStart(2, "0");
        const m = parts[1].padStart(2, "0");
        const s = parts[2] != null ? parts[2].padStart(2, "0") : null;
        const hh = parseInt(h, 10);
        const mm = parseInt(m, 10);
        const ss = s != null ? parseInt(s, 10) : null;
        if (
          hh >= 0 &&
          hh <= 23 &&
          mm >= 0 &&
          mm <= 59 &&
          (ss == null || (ss >= 0 && ss <= 59))
        ) {
          return ss != null ? `${h}:${m}:${s}` : `${h}:${m}`;
        }
      }
    }
    // 4-digit HHMM -> HH:MM
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length === 4 && /^\d{4}$/.test(digitsOnly)) {
      const hours = digitsOnly.substring(0, 2);
      const minutes = digitsOnly.substring(2, 4);
      const hh = parseInt(hours, 10);
      const mm = parseInt(minutes, 10);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        return `${hours}:${minutes}`;
      }
    }
    // 6-digit HHMMSS -> HH:MM:SS
    if (digitsOnly.length === 6 && /^\d{6}$/.test(digitsOnly)) {
      const hours = digitsOnly.substring(0, 2);
      const minutes = digitsOnly.substring(2, 4);
      const seconds = digitsOnly.substring(4, 6);
      const hh = parseInt(hours, 10);
      const mm = parseInt(minutes, 10);
      const ss = parseInt(seconds, 10);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59) {
        return `${hours}:${minutes}:${seconds}`;
      }
    }
    return "";
  };

  // Format time from API (HHMM) to display format (HH:MM)
  const formatTimeFromAPI = (timeStr: string | undefined): string => {
    if (!timeStr) return "";
    try {
      // Remove any existing "Z" suffix, colons, and whitespace
      const cleaned = timeStr.replace(/[Z\s:]/g, "");

      // Handle HHMM format (4 digits) - convert to HH:MM
      if (cleaned.length === 4 && /^\d{4}$/.test(cleaned)) {
        const hours = cleaned.substring(0, 2);
        const minutes = cleaned.substring(2, 4);
        // Validate hours (0-23) and minutes (0-59)
        const hoursNum = parseInt(hours, 10);
        const minutesNum = parseInt(minutes, 10);
        if (
          hoursNum >= 0 &&
          hoursNum <= 23 &&
          minutesNum >= 0 &&
          minutesNum <= 59
        ) {
          return `${hours}:${minutes}`;
        }
      }

      // Handle HH:MM format - return as is
      if (timeStr.includes(":")) {
        const parts = timeStr.split(":");
        if (parts.length >= 2) {
          const hours = parts[0].padStart(2, "0");
          const minutes = parts[1].padStart(2, "0");
          // Validate hours (0-23) and minutes (0-59)
          const hoursNum = parseInt(hours, 10);
          const minutesNum = parseInt(minutes, 10);
          if (
            hoursNum >= 0 &&
            hoursNum <= 23 &&
            minutesNum >= 0 &&
            minutesNum <= 59
          ) {
            return `${hours}:${minutes}`;
          }
        }
      }

      return ""; // Return empty if invalid
    } catch {
      return "";
    }
  };

  // Total flight time = destination − origin using UTC dates + Zulu times when dates are set;
  // otherwise time-of-day only (overnight +24h wrap), same as Operations / view modal.
  useEffect(() => {
    const calculatedTime = computeTotalBlockTimeFromUtc(
      formData.offBlocksDate,
      formData.offBlocksTime,
      formData.onBlocksDate,
      formData.onBlocksTime
    );
    setFormData((prev) => ({
      ...prev,
      totalFlightTime: calculatedTime === "0" ? "" : calculatedTime,
    }));
  }, [
    formData.offBlocksDate,
    formData.offBlocksTime,
    formData.onBlocksDate,
    formData.onBlocksTime,
  ]);

  // hobbsMeterTotal = hobbsMeterEnd - hobbsMeterStart (accepts negative)
  useEffect(() => {
    const start = parseFloat(formData.hobbsMeterStart) || 0;
    const end = parseFloat(formData.hobbsMeterEnd) || 0;
    const total = end - start;
    setFormData((prev) => ({
      ...prev,
      hobbsMeterTotal: total.toFixed(2),
    }));
  }, [formData.hobbsMeterStart, formData.hobbsMeterEnd]);

  // tachometerTotal = tachometerEnd - tachometerStart (accepts negative)
  useEffect(() => {
    const start = parseFloat(formData.tachometerStart) || 0;
    const end = parseFloat(formData.tachometerEnd) || 0;
    const total = end - start;
    setFormData((prev) => ({
      ...prev,
      tachometerTotal: total.toFixed(2),
    }));
  }, [formData.tachometerStart, formData.tachometerEnd]);

  // ATL table auto-compute: Airframe Run, AFTT; Engine Run, TSN, TSO, TBO; Propeller Run, TSN, TSO, TBO
  // If no previous time: use existing data else 0 for previous in formulas
  useEffect(() => {
    const tachStart = parseFloat(formData.tachometerStart) || 0;
    const tachEnd = parseFloat(formData.tachometerEnd) || 0;
    const airframeRunTime = tachEnd >= tachStart ? tachEnd - tachStart : 0;
    const prevAftt = parseFloat(formData.airframePrevTime) || 0;
    const airframeAftt = prevAftt + airframeRunTime;
    const engineRunTime = airframeRunTime;
    const prevEngineTsn = previousEngineTsn || 0;
    const engineTsnVal = prevEngineTsn + engineRunTime;
    const prevEngineTso = previousEngineTso || 0;
    const engineTso = prevEngineTso + engineRunTime;
    const lifeEngine = parseFloat(formData.lifeTimeLimitEngine) || 0;
    const engineTbo = lifeEngine > 0 ? Math.max(0, lifeEngine - engineTso) : 0;
    const propellerRunTime = airframeRunTime;
    const prevPropTsn = previousPropellerTsn || 0;
    const propellerTsn = prevPropTsn + propellerRunTime;
    const prevPropTso = previousPropellerTso || 0;
    const propellerTso = prevPropTso + propellerRunTime;
    const lifeProp = parseFloat(formData.lifeTimeLimitPropeller) || 0;
    const propellerTbo =
      lifeProp > 0 ? Math.max(0, lifeProp - propellerTso) : 0;

    setFormData((prev) => {
      const hasPrevAftt = prevAftt > 0;
      const hasPrevEngineTsn = previousEngineTsn > 0;
      const hasPrevEngineTso = previousEngineTso > 0;
      const hasPrevPropTsn = previousPropellerTsn > 0;
      const hasPrevPropTso = previousPropellerTso > 0;
      return {
        ...prev,
        airframeRunTime: airframeRunTime.toFixed(2),
        airframeAftt: hasPrevAftt
          ? airframeAftt.toFixed(2)
          : (parseFloat(prev.airframeAftt) || airframeRunTime).toFixed(2),
        engineRunTime: engineRunTime.toFixed(2),
        engineTsn: hasPrevEngineTsn
          ? engineTsnVal.toFixed(2)
          : prev.engineTsn || engineRunTime.toFixed(2),
        engineTso: hasPrevEngineTso
          ? engineTso.toFixed(2)
          : prev.engineTso || engineRunTime.toFixed(2),
        engineTbo: engineTbo.toFixed(2),
        propellerRunTime: propellerRunTime.toFixed(2),
        propellerTsn: hasPrevPropTsn
          ? propellerTsn.toFixed(2)
          : prev.propellerTsn || propellerRunTime.toFixed(2),
        propellerTso: hasPrevPropTso
          ? propellerTso.toFixed(2)
          : prev.propellerTso || propellerRunTime.toFixed(2),
        propellerTbo: propellerTbo.toFixed(2),
      };
    });
  }, [
    formData.tachometerStart,
    formData.tachometerEnd,
    formData.airframePrevTime,
    formData.lifeTimeLimitEngine,
    formData.lifeTimeLimitPropeller,
    previousEngineTsn,
    previousEngineTso,
    previousPropellerTsn,
    previousPropellerTso,
  ]);

  if (!isOpen) return null;

  // Parse numeric part length from latest sequence (e.g. "00013" → 5)
  const getLatestNumericLength = (seq: string): number => {
    const match = (seq || "").trim().match(/(\d+)$/);
    return match ? match[1].length : 0;
  };

  // Validation function
  const validateForm = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    // Required: Sequence No. must be set and must be numeric only
    const seqTrim = formData.seqNo?.trim() ?? "";
    if (!seqTrim) {
      errors.seqNo = "Sequence No. is required";
    } else if (!/^\d+$/.test(seqTrim)) {
      errors.seqNo = "Sequence No. must be a number (e.g. 1 or 001)";
    }

    // Sequence No. must match digit length of latest entry — only when numeric check passed
    if (
      !errors.seqNo &&
      !editEntry &&
      latestSequenceNo &&
      formData.seqNo &&
      formData.seqNo.trim() !== ""
    ) {
      const latestNumLen = getLatestNumericLength(latestSequenceNo);
      const enteredNumLen = seqTrim.length;
      if (latestNumLen > 0 && enteredNumLen !== latestNumLen) {
        const latestNumPart =
          (latestSequenceNo || "").trim().match(/(\d+)$/)?.[1] ?? "";
        errors.seqNo = `Sequence No. must be the same length as the latest entry (e.g. ${latestNumPart}). Expected ${latestNumLen} digit(s).`;
      }

      // GAP limit 15 upon creation: new sequence no must not exceed latest + 15
      const latestNumMatch = (latestSequenceNo || "").trim().match(/(\d+)$/);
      const enteredNumMatch = (formData.seqNo || "").trim().match(/(\d+)$/);
      const latestNum = latestNumMatch ? parseInt(latestNumMatch[1], 10) : null;
      const enteredNum = enteredNumMatch
        ? parseInt(enteredNumMatch[1], 10)
        : null;
      if (
        latestNum != null &&
        enteredNum != null &&
        enteredNum > latestNum + 15
      ) {
        const maxNum = latestNum + 15;
        const padLen = (latestNumMatch?.[1] || "").length;
        const maxSeq = (latestSequenceNo || "").replace(
          /\d+$/,
          String(maxNum).padStart(padLen, "0")
        );
        const latestDisplay = (latestSequenceNo || "").trim();
        errors.seqNo = `Sequence No. gap must not exceed 15 from the latest entry. Latest: ${latestDisplay}, max allowed: ${maxSeq}.`;
      }
    }

    // Only validate A/C Registration if aircraftId prop is not provided
    if (!aircraftId && (!formData.acReg || !selectedAircraftId)) {
      errors.acReg = "A/C Registration is required";
    }

    // Nature of Flight can be blank/empty; when blank we send VOID to the endpoint (no validation error)

    // Off-Blocks / Origin and On-Blocks / Destination: optional (format validation only when provided)
    if (formData.offBlocksTime && formData.offBlocksTime.trim() !== "") {
      if (!/^\d{2}:\d{2}$/.test(formData.offBlocksTime)) {
        errors.offBlocksTime = "Time must be in HH:MM format (e.g., 23:17)";
      } else {
        const [hours, minutes] = formData.offBlocksTime.split(":").map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          errors.offBlocksTime =
            "Time must be valid (hours: 0-23, minutes: 0-59)";
        }
      }
    }

    if (formData.onBlocksTime && formData.onBlocksTime.trim() !== "") {
      if (!/^\d{2}:\d{2}$/.test(formData.onBlocksTime)) {
        errors.onBlocksTime = "Time must be in HH:MM format (e.g., 23:17)";
      } else {
        const [hours, minutes] = formData.onBlocksTime.split(":").map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          errors.onBlocksTime =
            "Time must be valid (hours: 0-23, minutes: 0-59)";
        }
      }
    }

    // Numeric field validations
    if (
      formData.numberOfLandings &&
      isNaN(parseFloat(formData.numberOfLandings))
    ) {
      errors.numberOfLandings = "Number of Landings must be a valid number";
    }

    if (
      formData.hobbsMeterStart &&
      isNaN(parseFloat(formData.hobbsMeterStart))
    ) {
      errors.hobbsMeterStart = "Hobbs Meter Start must be a valid number";
    }

    if (formData.hobbsMeterEnd && isNaN(parseFloat(formData.hobbsMeterEnd))) {
      errors.hobbsMeterEnd = "Hobbs Meter End must be a valid number";
    }

    if (
      formData.tachometerStart &&
      isNaN(parseFloat(formData.tachometerStart))
    ) {
      errors.tachometerStart = "Tachometer Start must be a valid number";
    }

    if (formData.tachometerEnd && isNaN(parseFloat(formData.tachometerEnd))) {
      errors.tachometerEnd = "Tachometer End must be a valid number";
    }

    // Time format validation for Zulu times
    if (formData.pilotAcceptTime && formData.pilotAcceptTime.trim() !== "") {
      if (!/^\d{2}:\d{2}$/.test(formData.pilotAcceptTime)) {
        errors.pilotAcceptTime = "Time must be in HH:MM format (e.g., 23:17)";
      } else {
        // Validate hours (0-23) and minutes (0-59)
        const [hours, minutes] = formData.pilotAcceptTime
          .split(":")
          .map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          errors.pilotAcceptTime =
            "Time must be valid (hours: 0-23, minutes: 0-59)";
        }
      }
    }

    if (formData.rtsTime && formData.rtsTime.trim() !== "") {
      if (!/^\d{2}:\d{2}$/.test(formData.rtsTime)) {
        errors.rtsTime = "Time must be in HH:MM format (e.g., 23:17)";
      } else {
        // Validate hours (0-23) and minutes (0-59)
        const [hours, minutes] = formData.rtsTime.split(":").map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          errors.rtsTime = "Time must be valid (hours: 0-23, minutes: 0-59)";
        }
      }
    }

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (attachmentsOnlyLocked) {
      if (
        !(formData.whiteAtl instanceof File || formData.dfp instanceof File)
      ) {
        return;
      }
      setValidationErrors({});
    } else {
      const validationResult = validateForm();
      if (!validationResult.isValid) {
        return;
      }
    }

    // Before creating/editing ATL: engine/propeller limits + Engine TSO/TSN + Propeller TSO/TSN on aircraft master
    const aid = aircraftId ?? selectedAircraftId ?? null;
    if (aid != null && !attachmentsOnlyLocked) {
      try {
        const res = await getAircraftById(aid);
        const aircraftCamel = toCamel(res.data) as Aircraft;
        const missing = getMissingAircraftFieldsForNewAtl(aircraftCamel);
        if (missing.length > 0) {
          await Swal.fire({
            icon: "warning",
            title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
            html: buildAircraftDetailsRequiredForAtlHtml(aircraftCamel),
            confirmButtonColor: "#2563eb",
          });
          return;
        }
      } catch (err) {
        console.error("Failed to validate aircraft prerequisites:", err);
        await Swal.fire({
          icon: "error",
          title: "Validation error",
          text: "Could not load aircraft information. Please try again.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // On create: resolve current user's account_information_id for created_by (Fleet Time Monitoring)
      let createdByAccountId: number | undefined;
      if (!editEntry) {
        try {
          const me = await getMe();
          if (me.accountInformationId) {
            createdByAccountId = me.accountInformationId;
          } else {
            const username = localStorage.getItem("auth_username");
            if (username) {
              const accounts = await getAllAccounts();
              const account = accounts.find(
                (a) =>
                  a.username?.toLowerCase() === String(username).toLowerCase()
              );
              if (account) createdByAccountId = account.id;
            }
          }
        } catch (err) {
          console.warn(
            "Could not resolve current user account_information_id:",
            err
          );
        }
      }

      // Transform formData to API format (camelCase). ATL table → database via aircraft-technical-log endpoint (create/update).
      const aircraftFkValue = aircraftId ?? selectedAircraftId;
      if (
        !editEntry &&
        (aircraftFkValue == null || aircraftFkValue === undefined)
      ) {
        setIsSubmitting(false);
        Swal.fire({
          icon: "error",
          title: "Aircraft required",
          text: "Please select an aircraft (A/C Registration) before creating an entry.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
      const apiDataCamel: any = {
        aircraftFk: aircraftFkValue!,
        sequenceNo: formData.seqNo.trim(),
        // Blank/empty -> VOID (API requires valid enum); "VOID" -> VOID
        // "-" option (value "") submits "" in JSON; only explicit VOID sends "VOID"
        natureOfFlight:
          formData.natureOfFlight === "VOID"
            ? "VOID"
            : formData.natureOfFlight?.trim() ?? "",
        nextInspectionDue: formData.nextInspectionDue || undefined,
        tachTimeDue: formData.tachTimeDue
          ? parseFloat(formData.tachTimeDue)
          : undefined,
        originStation: formData.offBlocksStation,
        originDate: formData.offBlocksDate,
        originTime: convertTimeToAPIFormat(formData.offBlocksTime),
        destinationStation: formData.onBlocksStation,
        destinationDate: formData.onBlocksDate,
        destinationTime: convertTimeToAPIFormat(formData.onBlocksTime),
        numberOfLandings: parseFloat(formData.numberOfLandings) || 0,
        // Always save hobbs/tachometer Start and End (0 when empty) - ensure 0 persists in DB
        hobbsMeterStart:
          formData.hobbsMeterStart === "" ||
          formData.hobbsMeterStart === undefined
            ? 0
            : parseFloat(formData.hobbsMeterStart) || 0,
        hobbsMeterEnd:
          formData.hobbsMeterEnd === "" || formData.hobbsMeterEnd === undefined
            ? 0
            : parseFloat(formData.hobbsMeterEnd) || 0,
        hobbsMeterTotal:
          (parseFloat(formData.hobbsMeterEnd) || 0) -
          (parseFloat(formData.hobbsMeterStart) || 0),
        tachometerStart:
          formData.tachometerStart === "" ||
          formData.tachometerStart === undefined
            ? 0
            : parseFloat(formData.tachometerStart) || 0,
        tachometerEnd:
          formData.tachometerEnd === "" || formData.tachometerEnd === undefined
            ? 0
            : parseFloat(formData.tachometerEnd) || 0,
        tachometerTotal:
          (parseFloat(formData.tachometerEnd) || 0) -
          (parseFloat(formData.tachometerStart) || 0),
        airframePrevTime: formData.airframePrevTime
          ? parseFloat(formData.airframePrevTime)
          : undefined,
        airframeFlightTime: formData.airframeFlightTime
          ? parseFloat(formData.airframeFlightTime)
          : undefined,
        airframeTotalTime: formData.airframeTotalTime
          ? parseFloat(formData.airframeTotalTime)
          : undefined,
        enginePrevTime: formData.enginePrevTime
          ? parseFloat(formData.enginePrevTime)
          : undefined,
        engineFlightTime: formData.engineFlightTime
          ? parseFloat(formData.engineFlightTime)
          : undefined,
        engineTotalTime: formData.engineTotalTime
          ? parseFloat(formData.engineTotalTime)
          : undefined,
        propellerPrevTime: formData.propellerPrevTime
          ? parseFloat(formData.propellerPrevTime)
          : undefined,
        propellerFlightTime: formData.propellerFlightTime
          ? parseFloat(formData.propellerFlightTime)
          : undefined,
        propellerTotalTime: formData.propellerTotalTime
          ? parseFloat(formData.propellerTotalTime)
          : undefined,
        airframeRunTime: formData.airframeRunTime
          ? parseFloat(formData.airframeRunTime)
          : formData.airframeTotalTime
          ? parseFloat(formData.airframeTotalTime)
          : undefined,
        airframeAftt: formData.airframeAftt
          ? parseFloat(formData.airframeAftt)
          : undefined,
        engineRunTime: formData.engineRunTime
          ? parseFloat(formData.engineRunTime)
          : formData.engineTotalTime
          ? parseFloat(formData.engineTotalTime)
          : undefined,
        engineTsn: resolveEngineTsnForApi(formData),
        engineTso: formData.engineTso
          ? parseFloat(formData.engineTso)
          : undefined,
        engineTbo: formData.engineTbo
          ? parseFloat(formData.engineTbo)
          : undefined,
        propellerRunTime: formData.propellerRunTime
          ? parseFloat(formData.propellerRunTime)
          : formData.propellerTotalTime
          ? parseFloat(formData.propellerTotalTime)
          : undefined,
        propellerTsn: formData.propellerTsn || undefined,
        propellerTso: formData.propellerTso
          ? parseFloat(formData.propellerTso)
          : undefined,
        propellerTbo: formData.propellerTbo
          ? parseFloat(formData.propellerTbo)
          : undefined,
        lifeTimeLimitEngine: formData.lifeTimeLimitEngine
          ? parseFloat(formData.lifeTimeLimitEngine)
          : undefined,
        lifeTimeLimitPropeller: formData.lifeTimeLimitPropeller
          ? parseFloat(formData.lifeTimeLimitPropeller)
          : undefined,
        fuelQtyLeftUpliftQty: formData.fuelQtyLeftUpliftQty
          ? parseFloat(formData.fuelQtyLeftUpliftQty)
          : undefined,
        fuelQtyRightUpliftQty: formData.fuelQtyRightUpliftQty
          ? parseFloat(formData.fuelQtyRightUpliftQty)
          : undefined,
        fuelQtyLeftPriorDeparture: formData.fuelQtyLeftPriorDeparture
          ? parseFloat(formData.fuelQtyLeftPriorDeparture)
          : undefined,
        fuelQtyRightPriorDeparture: formData.fuelQtyRightPriorDeparture
          ? parseFloat(formData.fuelQtyRightPriorDeparture)
          : undefined,
        fuelQtyLeftAfterOnBlks: formData.fuelQtyLeftAfterOnBlks
          ? parseFloat(formData.fuelQtyLeftAfterOnBlks)
          : undefined,
        fuelQtyRightAfterOnBlks: formData.fuelQtyRightAfterOnBlks
          ? parseFloat(formData.fuelQtyRightAfterOnBlks)
          : undefined,
        oilQtyUpliftQty: formData.oilQtyUpliftQty
          ? parseFloat(formData.oilQtyUpliftQty)
          : undefined,
        oilQtyPriorDeparture: formData.oilQtyPriorDeparture
          ? parseFloat(formData.oilQtyPriorDeparture)
          : undefined,
        oilQtyAfterOnBlks: formData.oilQtyAfterOnBlks
          ? parseFloat(formData.oilQtyAfterOnBlks)
          : undefined,
        remarks: formData.pilotReport || undefined,
        actionsTaken: formData.actionsTaken || undefined,
        pilotFk: formData.pilotFk ? parseInt(formData.pilotFk) : undefined,
        maintenanceFk: formData.remarksPerson
          ? parseInt(formData.remarksPerson)
          : formData.actionsTakenPerson
          ? parseInt(formData.actionsTakenPerson)
          : undefined,
        pilotAcceptedBy: formData.pilotFk
          ? parseInt(formData.pilotFk)
          : undefined, // Connected to Pilot's Acceptance Name dropdown
        pilotAcceptDate: formData.pilotAcceptDate || undefined,
        pilotAcceptTime: formData.pilotAcceptTime
          ? convertTimeToAPIFormat(formData.pilotAcceptTime)
          : undefined,
        rtsSignedBy: formData.rtsSignedBy
          ? parseInt(formData.rtsSignedBy)
          : undefined, // Connected to Return to Service Name dropdown
        rtsDate: formData.rtsDate || undefined,
        rtsTime: formData.rtsTime
          ? convertTimeToAPIFormat(formData.rtsTime)
          : undefined,
        // When uploading new file: omit from JSON (sent via multipart). When editing: omit whiteAtl/dfp from JSON so backend keeps existing files (sending string URL causes "value is not a valid dict").
        ...(!editEntry &&
        formData.whiteAtl !== undefined &&
        formData.whiteAtl !== null &&
        !(formData.whiteAtl instanceof File)
          ? { whiteAtl: formData.whiteAtl }
          : {}),
        ...(!editEntry &&
        formData.dfp !== undefined &&
        formData.dfp !== null &&
        !(formData.dfp instanceof File)
          ? { dfp: formData.dfp }
          : {}),
        componentParts: componentRecords.map((record) => ({
          qty: parseFloat(record.qty) || 0,
          unit: record.unit,
          nomenclature: record.nomenclature,
          removedPartNo: record.removedPartNo || undefined,
          removedSerialNo: record.removedSerialNo || undefined,
          installedPartNo: record.installedPartNo || undefined,
          installedSerialNo: record.installedSerialNo || undefined,
          ataChapter: record.ataChapter || undefined,
        })),
        // Fleet Time Monitoring: on update send work_status from form (connected to update API); on create overwritten to FOR_REVIEW below
        workStatus: formData.workStatus || undefined,
      };

      // Fleet Time Monitoring: on create only, default work_status FOR_REVIEW (API enum name); on update workStatus is already in apiDataCamel from form
      if (!editEntry) {
        apiDataCamel.workStatus = "FOR_REVIEW";
        if (createdByAccountId != null)
          apiDataCamel.createdBy = createdByAccountId;
      }

      // Operation / Technical Publication: new White ATL or DFP implies Pending if status left blank
      if (
        editEntry &&
        attachmentsOnlyLocked &&
        canUploadAtlAttachments &&
        (formData.whiteAtl instanceof File || formData.dfp instanceof File) &&
        !String(apiDataCamel.workStatus ?? "").trim()
      ) {
        apiDataCamel.workStatus = "PENDING";
      }

      // Convert camelCase to snake_case before sending to API
      const apiDataSnake = snakeAllKeys(apiDataCamel);

      const files =
        canUploadAtlAttachments &&
        (formData.whiteAtl instanceof File || formData.dfp instanceof File)
          ? {
              whiteAtl:
                formData.whiteAtl instanceof File ? formData.whiteAtl : null,
              dfp: formData.dfp instanceof File ? formData.dfp : null,
            }
          : undefined;

      if (editEntry) {
        // Update existing entry
        const updatedEntry = await updateAircraftTechnicalLog(
          editEntry.id,
          apiDataSnake as AircraftTechnicalLogUpdate,
          files
        );

        // Show success message
        await Swal.fire({
          title: "Success!",
          text: `Aircraft Technical Logbook entry (Sequence No. ${formData.seqNo}) has been successfully updated.`,
          icon: "success",
          confirmButtonColor: "#1f2937",
          confirmButtonText: "OK",
          timer: 3000,
          timerProgressBar: true,
        });

        // Call onSuccess callback if provided (this will refresh the list)
        if (onSuccess) {
          onSuccess();
        }

        // Close modal
        onClose();
        return;
      }

      // Create new entry — payload is snake_case for backend; work_status FOR_REVIEW and createdBy set above
      const createdEntry = await createAircraftTechnicalLog(
        apiDataSnake,
        files
      );

      // Show success message
      await Swal.fire({
        title: "Success!",
        text: `Aircraft Technical Logbook entry (Sequence No. ${formData.seqNo}) has been successfully created.`,
        icon: "success",
        confirmButtonColor: "#1f2937",
        confirmButtonText: "OK",
        timer: 3000,
        timerProgressBar: true,
      });

      // Call onSuccess callback if provided (this will refresh the list)
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setFormData({
        seqNo: "",
        workStatus: "FOR_REVIEW",
        acReg: "",
        natureOfFlight: "",
        offBlocksDate: "",
        offBlocksTime: "",
        offBlocksStation: "",
        onBlocksDate: "",
        onBlocksTime: "",
        onBlocksStation: "",
        totalFlightTime: "",
        numberOfLandings: "",
        fuelQtyLeftUpliftQty: "",
        fuelQtyRightUpliftQty: "",
        fuelQtyLeftPriorDeparture: "",
        fuelQtyRightPriorDeparture: "",
        fuelQtyLeftAfterOnBlks: "",
        fuelQtyRightAfterOnBlks: "",
        oilQtyUpliftQty: "",
        oilQtyPriorDeparture: "",
        oilQtyAfterOnBlks: "",
        priorDepartureHours: "",
        priorDepartureMinutes: "",
        afterLandingHours: "",
        afterLandingMinutes: "",
        tachometerStart: "0",
        tachometerEnd: "0",
        tachometerTotal: "0",
        hobbsMeterStart: "0",
        hobbsMeterEnd: "0",
        hobbsMeterTotal: "0",
        nextInspectionDue: "",
        tachTimeDue: "",
        pilotReport: "",
        remarksPerson: "",
        actionsTaken: "",
        actionsTakenPerson: "",
        pilotName: "",
        pilotFk: "",
        pilotAcceptDate: "",
        pilotAcceptTime: "",
        pilotSignature: null,
        rtsName: "",
        rtsSignedBy: "",
        rtsDate: "",
        rtsTime: "",
        mechanicAuth: "",
        mechanicSignature: null,
        whiteAtl: null,
        dfp: null,
        airframePrevTime: "",
        airframeFlightTime: "",
        airframeTotalTime: "",
        airframeRunTime: "",
        airframeAftt: "",
        enginePrevTime: "",
        engineFlightTime: "",
        engineTotalTime: "",
        engineRunTime: "",
        engineTsn: "",
        engineTso: "",
        engineTbo: "",
        propellerPrevTime: "",
        propellerFlightTime: "",
        propellerTotalTime: "",
        propellerRunTime: "",
        propellerTsn: "",
        propellerTso: "",
        propellerTbo: "",
        lifeTimeLimitEngine: "",
        lifeTimeLimitPropeller: "",
      });
      setComponentRecords([]);
      setSelectedAircraftId(null);
      setWhiteAtlFileName("");
      setDfpFileName("");
      setValidationErrors({});

      // Close modal
      onClose();
    } catch (error: any) {
      console.error(
        `Error ${editEntry ? "updating" : "creating"} entry:`,
        error
      );

      // Extract error message safely
      let errorMessage = editEntry
        ? "Failed to update entry"
        : "Failed to create entry";

      if (error.response?.data) {
        // Handle different error response formats
        if (typeof error.response.data.detail === "string") {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation errors array
          errorMessage = error.response.data.detail
            .map((err: any) => {
              if (typeof err === "string") return err;
              if (err.msg) return err.msg;
              if (err.message) return err.message;
              if (err.loc && err.msg) {
                // Handle Pydantic validation errors
                return `${err.loc.join(".")}: ${err.msg}`;
              }
              return JSON.stringify(err);
            })
            .join("\n");
        } else if (error.response.data.detail) {
          // Handle object error
          if (typeof error.response.data.detail === "object") {
            // Try to extract meaningful message from object
            if (error.response.data.detail.message) {
              errorMessage = error.response.data.detail.message;
            } else {
              errorMessage = JSON.stringify(error.response.data.detail);
            }
          } else {
            errorMessage = String(error.response.data.detail);
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Convert to string and check for duplicate sequence number
      const errorMessageStr = String(errorMessage).toLowerCase();

      // Check if this is a duplicate sequence number error
      // Look for keywords that indicate duplicate sequence number
      const hasSequenceKeyword = errorMessageStr.includes("sequence");
      const hasAlreadyKeyword =
        errorMessageStr.includes("already exist") ||
        errorMessageStr.includes("already exists");
      const hasDuplicateKeyword = errorMessageStr.includes("duplicate");
      const hasUniqueConstraint =
        errorMessageStr.includes("unique constraint") ||
        errorMessageStr.includes("uniqueconstraint");

      const isDuplicateSequence =
        hasSequenceKeyword &&
        (hasAlreadyKeyword || hasDuplicateKeyword || hasUniqueConstraint);

      // If it's a duplicate sequence error, show appropriate message
      if (isDuplicateSequence) {
        // Try to extract sequence number from error message
        const sequenceMatch =
          errorMessage.match(/sequence\s+no\.?\s*([A-Z0-9-]+)/i) ||
          errorMessage.match(/sequence\s+([A-Z0-9-]+)/i) ||
          errorMessage.match(/([A-Z0-9-]+)\s+already/i);

        const extractedSeqNo =
          sequenceMatch && sequenceMatch[1] ? sequenceMatch[1] : formData.seqNo;

        // Use the error message from API if it already contains the sequence number
        // Otherwise, construct our own message
        if (extractedSeqNo && errorMessage.includes(extractedSeqNo)) {
          Swal.fire({
            title: "Error!",
            text: errorMessage,
            icon: "error",
            confirmButtonColor: "#dc2626",
          });
        } else if (extractedSeqNo) {
          Swal.fire({
            title: "Error!",
            text: `Sequence No. ${extractedSeqNo} already exists. Please use a different Sequence No.`,
            icon: "error",
            confirmButtonColor: "#dc2626",
          });
        } else {
          // Fallback if we can't extract sequence number
          Swal.fire({
            title: "Error!",
            text:
              errorMessage ||
              "Sequence No. already exists. Please use a different Sequence No.",
            icon: "error",
            confirmButtonColor: "#dc2626",
          });
        }
      } else {
        // Show generic error message for other validation errors
        Swal.fire({
          title: "Error!",
          text: errorMessage,
          icon: "error",
          confirmButtonColor: "#dc2626",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (
    field: "pilotSignature" | "mechanicSignature" | "whiteAtl" | "dfp",
    file: File | null
  ) => {
    setFormData((prev) => {
      const next: typeof prev = { ...prev, [field]: file };
      if (
        attachmentsOnlyLocked &&
        editEntry &&
        (field === "whiteAtl" || field === "dfp") &&
        file instanceof File
      ) {
        next.workStatus = "PENDING";
      }
      return next;
    });
    if (field === "whiteAtl") {
      setWhiteAtlFileName(file ? file.name : "");
    } else if (field === "dfp") {
      setDfpFileName(file ? file.name : "");
    }
  };

  const handleRemoveFile = (field: "whiteAtl" | "dfp") => {
    setFormData((prev) => ({ ...prev, [field]: null }));
    if (field === "whiteAtl") {
      setWhiteAtlFileName("");
    } else if (field === "dfp") {
      setDfpFileName("");
    }
  };

  /** Download file via GET /api/v1/{folder}/download/{filePath} (White ATL / DFP in Edit Entry) */
  const handleDownloadAtlFile = async (
    folder: "white_atl" | "dfp",
    filePath: string,
    displayName?: string
  ) => {
    if (!filePath?.trim()) return;
    let path = filePath
      .trim()
      .replace(/^\/+/, "")
      .replace(/^api\/v1\//, "");
    const endpoint = `${folder}/download/${path}`;
    try {
      const response = await apiClient.get(endpoint, {
        responseType: "blob",
        headers: { Accept: "application/octet-stream" },
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = displayName || path.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text:
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to download file.",
      });
    }
  };

  const getMimeFromFilename = (path: string): string | null => {
    const ext = (path.split("/").pop() || path).split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "gif") return "image/gif";
    if (ext === "webp") return "image/webp";
    return null;
  };

  /** True if file path is an image (show View button); otherwise only Download. */
  const isImageFilePath = (path: string): boolean => {
    const mime = getMimeFromFilename(path);
    return !!(mime && mime.startsWith("image/"));
  };

  /** View file in modal (image popup; other types get download/open link) */
  const handleViewAtlFile = async (
    folder: "white_atl" | "dfp",
    filePath: string
  ) => {
    if (!filePath?.trim()) return;
    setFileViewLoading(true);
    setFileViewError(null);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setShowFileViewModal(true);
    let path = filePath
      .trim()
      .replace(/^\/+/, "")
      .replace(/^api\/v1\//, "");
    const endpoint = `${folder}/download/${path}`;
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
      const mimeType = isOctetStream ? getMimeFromFilename(path) : serverType;
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
    if (fileViewBlobUrl) window.URL.revokeObjectURL(fileViewBlobUrl);
    setShowFileViewModal(false);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setFileViewError(null);
  };

  // Calculate total time from prev time + flight time
  const calculateTotalTime = (prevTime: string, flightTime: string): string => {
    const prev = parseFloat(prevTime) || 0;
    const flight = parseFloat(flightTime) || 0;
    const total = prev + flight;
    return total > 0 ? total.toFixed(2) : "";
  };

  // Handle time field changes and auto-calculate totals
  const handleTimeFieldChange = (
    field: string,
    value: string,
    type: "airframe" | "engine" | "propeller"
  ) => {
    const updates: any = { [field]: value };

    if (type === "airframe") {
      if (field === "airframePrevTime" || field === "airframeFlightTime") {
        updates.airframeTotalTime = calculateTotalTime(
          field === "airframePrevTime" ? value : formData.airframePrevTime,
          field === "airframeFlightTime" ? value : formData.airframeFlightTime
        );
      }
    } else if (type === "engine") {
      if (field === "enginePrevTime" || field === "engineFlightTime") {
        updates.engineTotalTime = calculateTotalTime(
          field === "enginePrevTime" ? value : formData.enginePrevTime,
          field === "engineFlightTime" ? value : formData.engineFlightTime
        );
      }
    } else if (type === "propeller") {
      if (field === "propellerPrevTime" || field === "propellerFlightTime") {
        updates.propellerTotalTime = calculateTotalTime(
          field === "propellerPrevTime" ? value : formData.propellerPrevTime,
          field === "propellerFlightTime" ? value : formData.propellerFlightTime
        );
      }
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Component Record handlers
  const addComponentRecord = () => {
    const newRecord: ComponentRecord = {
      id: `component-${Date.now()}-${Math.random()}`,
      qty: "",
      unit: "",
      nomenclature: "",
      removedPartNo: "",
      removedSerialNo: "",
      installedPartNo: "",
      installedSerialNo: "",
      ataChapter: "",
    };
    setComponentRecords([...componentRecords, newRecord]);
  };

  const removeComponentRecord = (id: string) => {
    setComponentRecords(componentRecords.filter((record) => record.id !== id));
  };

  const updateComponentRecord = (
    id: string,
    field: keyof ComponentRecord,
    value: string
  ) => {
    setComponentRecords(
      componentRecords.map((record) =>
        record.id === id ? { ...record, [field]: value } : record
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay with blur */}
      <div
        className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Loading overlay on create/edit submit */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-gray-700">
                {editEntry ? "Updating entry..." : "Creating entry..."}
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editEntry ? "Edit Entry" : "Add New Entry"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div
              className={`space-y-6 ${
                attachmentsOnlyLocked
                  ? "pointer-events-none select-none opacity-[0.92]"
                  : ""
              }`}
            >
              {/* Sequence No. | Work Status | A/C Registration (same order in View / Add / Edit) */}
              <div
                className={`grid gap-4 ${
                  !aircraftId ? "grid-cols-3" : "grid-cols-2"
                }`}
              >
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Sequence No. *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.seqNo}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, seqNo: digits });
                      if (validationErrors.seqNo) {
                        setValidationErrors({ ...validationErrors, seqNo: "" });
                      }
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400 ${
                      validationErrors.seqNo
                        ? "border-red-500 ring-1 ring-red-400"
                        : "border-gray-300"
                    }`}
                    placeholder="e.g. 001"
                    required
                  />
                  {validationErrors.seqNo && (
                    <p className="mt-1 text-xs text-red-600">
                      {validationErrors.seqNo}
                    </p>
                  )}
                </div>
                <div
                  className={
                    attachmentsOnlyLocked
                      ? "pointer-events-auto relative z-[1]"
                      : undefined
                  }
                >
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Work Status
                  </label>
                  {editEntry ? (
                    <select
                      value={formData.workStatus}
                      onChange={(e) =>
                        setFormData({ ...formData, workStatus: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                      aria-label="Work status"
                    >
                      <option value="">— Select —</option>
                      {workStatusDropdownKeys.map((key) => (
                        <option key={key} value={key}>
                          {formatAtlWorkStatusLabel(key)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                      FOR REVIEW
                    </div>
                  )}
                </div>
                {!aircraftId && (
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      A/C Registration *
                    </label>
                    {editEntry ? (
                      <input
                        type="text"
                        value={formData.acReg}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        aria-label="A/C Registration"
                      />
                    ) : (
                      <div className="relative" ref={aircraftDropdownRef}>
                        <div className="relative">
                          <input
                            type="text"
                            value={
                              isAircraftDropdownOpen
                                ? aircraftSearchTerm
                                : formData.acReg
                            }
                            onChange={(e) => {
                              setAircraftSearchTerm(e.target.value);
                              setIsAircraftDropdownOpen(true);
                              // Clear error when user starts typing
                              if (validationErrors.acReg) {
                                setValidationErrors({
                                  ...validationErrors,
                                  acReg: "",
                                });
                              }
                            }}
                            onFocus={() => {
                              setIsAircraftDropdownOpen(true);
                              setAircraftSearchTerm("");
                            }}
                            className={`w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white text-gray-900 ${
                              validationErrors.acReg
                                ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                                : "border-gray-300 focus:ring-gray-400 focus:border-gray-400"
                            }`}
                            required
                            placeholder="Search aircraft registration..."
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setIsAircraftDropdownOpen(!isAircraftDropdownOpen)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto text-gray-400"
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
                                  ? "No aircrafts found"
                                  : "No aircrafts available"}
                              </div>
                            ) : (
                              <ul className="py-1">
                                {filteredAircrafts.map((aircraft) => (
                                  <li
                                    key={aircraft.id}
                                    onClick={() =>
                                      handleAircraftSelect(
                                        aircraft.id,
                                        aircraft.registration
                                      )
                                    }
                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                      formData.acReg === aircraft.registration
                                        ? "bg-blue-50"
                                        : ""
                                    }`}
                                  >
                                    <span className="text-gray-900">
                                      {aircraft.registration}
                                    </span>
                                    {formData.acReg === aircraft.registration && (
                                      <Check className="w-4 h-4 text-blue-600" />
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {validationErrors.acReg && (
                      <p className="mt-1 text-xs text-red-600">
                        {validationErrors.acReg}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Nature of Flight, NEXT INSP. DUE, TACH TIME DUE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Nature of Flight
                  </label>
                  <select
                    value={formData.natureOfFlight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        natureOfFlight: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                  >
                    <option value="">-</option>
                    <option value="TR">TR - Training Flight</option>
                    <option value="PSF">PSF - Post Flight Inspection</option>
                    <option value="PRF">PRF - Pre Flight Inspection</option>
                    <option value="EGR">EGR - Engine Run-up</option>
                    <option value="ME">ME - Maintenance Entry</option>
                    <option value="TR_WITH_PIREM">
                      TR W/ PIREM - Training Flight with Pilot Remarks
                    </option>
                    <option value="VOID">VOID - Void</option>
                    <option value="ATL_REPL">ATL REPL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    NEXT INSP. DUE
                  </label>
                  <input
                    type="text"
                    value={formData.nextInspectionDue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nextInspectionDue: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    TACH TIME DUE
                  </label>
                  <input
                    type="text"
                    value={formData.tachTimeDue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tachTimeDue: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Off-Blocks/Origin & On-Blocks/Destination */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Off-Blocks/Origin */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Off-Blocks / Origin</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Station (STN)
                      </label>
                      <input
                        type="text"
                        value={formData.offBlocksStation}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            offBlocksStation: e.target.value,
                          });
                          if (validationErrors.offBlocksStation) {
                            setValidationErrors({
                              ...validationErrors,
                              offBlocksStation: "",
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 bg-white text-gray-900 ${
                          validationErrors.offBlocksStation
                            ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                            : "border-gray-300 focus:ring-gray-400 focus:border-gray-400"
                        }`}
                      />
                      {validationErrors.offBlocksStation && (
                        <p className="mt-1 text-xs text-red-600">
                          {validationErrors.offBlocksStation}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Date (UTC)
                        </label>
                        <input
                          type="date"
                          value={formData.offBlocksDate}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              offBlocksDate: e.target.value,
                            });
                            if (validationErrors.offBlocksDate) {
                              setValidationErrors({
                                ...validationErrors,
                                offBlocksDate: "",
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 ${
                            validationErrors.offBlocksDate
                              ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                              : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                          }`}
                        />
                        {validationErrors.offBlocksDate && (
                          <p className="mt-1 text-xs text-red-600">
                            {validationErrors.offBlocksDate}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Zulu Time
                        </label>
                        <div>
                          <input
                            type="text"
                            value={formData.offBlocksTime}
                            onChange={(e) => {
                              const formatted = formatTimeInput(e.target.value);
                              setFormData({
                                ...formData,
                                offBlocksTime: formatted,
                              });
                              if (validationErrors.offBlocksTime) {
                                setValidationErrors({
                                  ...validationErrors,
                                  offBlocksTime: "",
                                });
                              }
                            }}
                            maxLength={5}
                            placeholder="HH:MM"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 font-mono"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Format: HH:MM (24-hour, e.g., 23:17)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* On-Blocks/Destination */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">
                    On-Blocks / Destination
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Station (STN)
                      </label>
                      <input
                        type="text"
                        value={formData.onBlocksStation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            onBlocksStation: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Date (UTC)
                        </label>
                        <input
                          type="date"
                          value={formData.onBlocksDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              onBlocksDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Zulu Time
                        </label>
                        <div>
                          <input
                            type="text"
                            value={formData.onBlocksTime}
                            onChange={(e) => {
                              const formatted = formatTimeInput(e.target.value);
                              setFormData({
                                ...formData,
                                onBlocksTime: formatted,
                              });
                              if (validationErrors.onBlocksTime) {
                                setValidationErrors({
                                  ...validationErrors,
                                  onBlocksTime: "",
                                });
                              }
                            }}
                            maxLength={5}
                            placeholder="HH:MM"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 font-mono"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Format: HH:MM (24-hour, e.g., 23:17)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Flight Time & Number of Landings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Total Flight Time
                  </label>
                  <input
                    type="text"
                    value={formData.totalFlightTime}
                    disabled
                    readOnly
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Number of Landings
                  </label>
                  <input
                    type="text"
                    value={formData.numberOfLandings}
                    onChange={(e) => {
                      // Only allow numeric input
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        numberOfLandings: value,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Tachometer & Hobbs Meter */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tachometer */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Tachometer</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">
                          Start
                        </label>
                        <input
                          type="text"
                          value={formData.tachometerStart}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tachometerStart: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">
                          End
                        </label>
                        <input
                          type="text"
                          value={formData.tachometerEnd}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tachometerEnd: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">
                        Total
                      </label>
                      <input
                        type="text"
                        value={formData.tachometerTotal}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-900 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Hobbs Meter */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Hobbs Meter</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">
                          Start
                        </label>
                        <input
                          type="text"
                          value={formData.hobbsMeterStart}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hobbsMeterStart: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">
                          End
                        </label>
                        <input
                          type="text"
                          value={formData.hobbsMeterEnd}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hobbsMeterEnd: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">
                        Total
                      </label>
                      <input
                        type="text"
                        value={formData.hobbsMeterTotal}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-900 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fuel & Oil Section - Table Format */}
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300"></th>
                      <th
                        colSpan={3}
                        className="px-4 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300"
                      >
                        FUEL QTY. (GALS)
                      </th>
                      <th
                        colSpan={3}
                        className="px-4 py-2 text-center text-xs font-semibold text-gray-900"
                      >
                        OIL QTY. (QTS)
                      </th>
                    </tr>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300"></th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        UPLIFT QTY.
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        PRIOR DEPARTURE
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        AFTER ON-BLKS
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        UPLIFT QTY.
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        PRIOR DEPARTURE
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900">
                        AFTER ON-BLKS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {/* Row label */}
                      <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-white">
                        RIGHT
                      </td>

                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.fuelQtyRightUpliftQty}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fuelQtyRightUpliftQty: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* FUEL - PRIOR DEPARTURE RIGHT */}
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.fuelQtyRightPriorDeparture}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fuelQtyRightPriorDeparture: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* FUEL - AFTER ON-BLKS RIGHT */}
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.fuelQtyRightAfterOnBlks}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fuelQtyRightAfterOnBlks: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* OIL - UPLIFT QTY */}
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.oilQtyUpliftQty}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              oilQtyUpliftQty: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* OIL - PRIOR DEPARTURE */}
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.oilQtyPriorDeparture}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              oilQtyPriorDeparture: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* OIL - AFTER ON-BLKS */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={formData.oilQtyAfterOnBlks}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              oilQtyAfterOnBlks: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                    </tr>
                    <tr>
                      {/* Row label */}
                      <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-white">
                        LEFT
                      </td>
                      {/* FUEL - UPLIFT QTY LEFT */}
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.fuelQtyLeftUpliftQty}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fuelQtyLeftUpliftQty: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* FUEL - PRIOR DEPARTURE LEFT */}
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.fuelQtyLeftPriorDeparture}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fuelQtyLeftPriorDeparture: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* FUEL - AFTER ON-BLKS LEFT */}
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          value={formData.fuelQtyLeftAfterOnBlks}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fuelQtyLeftAfterOnBlks: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </td>
                      {/* OIL - Empty cells for alignment */}
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remarks Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">Remarks</label>
                  <textarea
                    value={formData.pilotReport}
                    onChange={(e) =>
                      setFormData({ ...formData, pilotReport: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                  />
                  <div className="mt-2">
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Name
                    </label>
                    <div className="relative" ref={remarksDropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            isRemarksDropdownOpen
                              ? remarksSearchTerm
                              : getSelectedRemarksPerson()
                          }
                          onChange={(e) => {
                            setRemarksSearchTerm(e.target.value);
                            setIsRemarksDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setIsRemarksDropdownOpen(true);
                            setRemarksSearchTerm("");
                          }}
                          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                          placeholder="Search name..."
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setIsRemarksDropdownOpen(!isRemarksDropdownOpen)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto text-gray-400"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isRemarksDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {isRemarksDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {loadingRemarksAccounts ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              Loading...
                            </div>
                          ) : remarksAccounts.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              {remarksSearchTerm
                                ? "No accounts found"
                                : "No accounts available"}
                            </div>
                          ) : (
                            <ul className="py-1">
                              {remarksAccounts.map((account) => (
                                <li
                                  key={account.id}
                                  onClick={() =>
                                    handleRemarksPersonSelect(
                                      account.id.toString(),
                                      `${account.fullName}-${account.licenseNo}`
                                    )
                                  }
                                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                    formData.remarksPerson ===
                                    account.id.toString()
                                      ? "bg-blue-50"
                                      : ""
                                  }`}
                                >
                                  <span className="text-gray-900 text-sm">
                                    {account.fullName}-{account.licenseNo}
                                  </span>
                                  {formData.remarksPerson ===
                                    account.id.toString() && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">
                    Actions Taken
                  </label>
                  <textarea
                    value={formData.actionsTaken}
                    onChange={(e) =>
                      setFormData({ ...formData, actionsTaken: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                  />
                  <div className="mt-2">
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Name
                    </label>
                    <div className="relative" ref={actionsTakenDropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            isActionsTakenDropdownOpen
                              ? actionsTakenSearchTerm
                              : getSelectedActionsTakenPerson()
                          }
                          onChange={(e) => {
                            setActionsTakenSearchTerm(e.target.value);
                            setIsActionsTakenDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setIsActionsTakenDropdownOpen(true);
                            setActionsTakenSearchTerm("");
                          }}
                          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                          placeholder="Search name..."
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setIsActionsTakenDropdownOpen(
                              !isActionsTakenDropdownOpen
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto text-gray-400"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isActionsTakenDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {isActionsTakenDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {loadingActionsTakenAccounts ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              Loading...
                            </div>
                          ) : actionsTakenAccounts.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              {actionsTakenSearchTerm
                                ? "No accounts found"
                                : "No accounts available"}
                            </div>
                          ) : (
                            <ul className="py-1">
                              {actionsTakenAccounts.map((account) => (
                                <li
                                  key={account.id}
                                  onClick={() =>
                                    handleActionsTakenPersonSelect(
                                      account.id.toString(),
                                      `${account.fullName}-${account.licenseNo}`
                                    )
                                  }
                                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                    formData.actionsTakenPerson ===
                                    account.id.toString()
                                      ? "bg-blue-50"
                                      : ""
                                  }`}
                                >
                                  <span className="text-gray-900 text-sm">
                                    {account.fullName}-{account.licenseNo}
                                  </span>
                                  {formData.actionsTakenPerson ===
                                    account.id.toString() && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AIRFRAME, ENGINE & PROPELLER TIMES */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                  <h3 className="text-white font-semibold">
                    AIRFRAME, ENGINE & PROPELLER TIMES
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700"></th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                          AIRFRAME
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                          ENGINE
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                          PROPELLER
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                          PREV. TIME
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.airframePrevTime}
                            onChange={(e) =>
                              handleTimeFieldChange(
                                "airframePrevTime",
                                e.target.value,
                                "airframe"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.enginePrevTime}
                            onChange={(e) =>
                              handleTimeFieldChange(
                                "enginePrevTime",
                                e.target.value,
                                "engine"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.propellerPrevTime}
                            onChange={(e) =>
                              handleTimeFieldChange(
                                "propellerPrevTime",
                                e.target.value,
                                "propeller"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                          FLIGHT TIME
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.airframeFlightTime}
                            onChange={(e) =>
                              handleTimeFieldChange(
                                "airframeFlightTime",
                                e.target.value,
                                "airframe"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.engineFlightTime}
                            onChange={(e) =>
                              handleTimeFieldChange(
                                "engineFlightTime",
                                e.target.value,
                                "engine"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.propellerFlightTime}
                            onChange={(e) =>
                              handleTimeFieldChange(
                                "propellerFlightTime",
                                e.target.value,
                                "propeller"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                          TOTAL TIME
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.airframeTotalTime}
                            disabled
                            readOnly
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.engineTotalTime}
                            disabled
                            readOnly
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.propellerTotalTime}
                            disabled
                            readOnly
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ATL component times: RUN TIME / AFTT / TSN / TSO / TBO — connected to ATL endpoint */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr>
                        <th
                          colSpan={2}
                          className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-gray-200"
                        >
                          AIRFRAME
                        </th>
                        <th
                          colSpan={4}
                          className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-gray-200"
                        >
                          ENGINE
                        </th>
                        <th
                          colSpan={4}
                          className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-gray-200"
                        >
                          PROPELLER
                        </th>
                      </tr>
                      <tr>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          RUN TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          AFTT
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          RUN TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSN
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSO
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TBO
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          RUN TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSN
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSO
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TBO
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.airframeRunTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                airframeRunTime: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="0"
                            title="Auto: tach end − tach start"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.airframeAftt}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                airframeAftt: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="AFTT"
                            title="Auto: Prev AFTT + Airframe Run"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.engineRunTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                engineRunTime: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="0"
                            title="Auto: = Airframe Run Time"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.engineTsn}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                engineTsn: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder=""
                            title=""
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.engineTso}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                engineTso: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="TSO"
                            title="Auto: Prev TSO + Engine Run"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.engineTbo}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                engineTbo: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="TBO"
                            title="Auto: life limit − TSO"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.propellerRunTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                propellerRunTime: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="0"
                            title="Auto: = Airframe Run Time"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.propellerTsn}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                propellerTsn: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder=""
                            title="Auto: Prev TSN + Prop Run"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.propellerTso}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                propellerTso: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="TSO"
                            title="Auto: Prev TSO + Prop Run"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.propellerTbo}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                propellerTbo: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="TBO"
                            title="Auto: life limit − TSO"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COMPONENT RECORD */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                  <h3 className="text-white font-semibold">COMPONENT RECORD</h3>
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
                            colSpan={10}
                            className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm"
                          >
                            No component records added. Click "Add another
                            Component" to add one.
                          </td>
                        </tr>
                      ) : (
                        componentRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
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
                                onClick={() => removeComponentRecord(record.id)}
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

              {/* Signatures Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pilot Signature */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Pilot's Acceptance</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Name
                      </label>
                      <div className="relative" ref={pilotDropdownRef}>
                        <div className="relative">
                          <input
                            type="text"
                            value={
                              isPilotDropdownOpen
                                ? pilotSearchTerm
                                : getSelectedPilot()
                            }
                            onChange={(e) => {
                              setPilotSearchTerm(e.target.value);
                              setIsPilotDropdownOpen(true);
                              // Clear error when user starts typing
                              if (validationErrors.pilotFk) {
                                setValidationErrors({
                                  ...validationErrors,
                                  pilotFk: "",
                                });
                              }
                            }}
                            onFocus={() => {
                              setIsPilotDropdownOpen(true);
                              // If there's a selected value, use it as initial search term, otherwise clear
                              if (formData.pilotName) {
                                setPilotSearchTerm(formData.pilotName);
                              } else {
                                setPilotSearchTerm("");
                              }
                              // Fetch accounts if not already loaded
                              if (pilotAccounts.length === 0) {
                                fetchPilotAccounts("");
                              }
                            }}
                            className={`w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white text-gray-900 ${
                              validationErrors.pilotFk
                                ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                                : "border-gray-300 focus:ring-gray-400 focus:border-gray-400"
                            }`}
                            placeholder="Search pilot..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsPilotDropdownOpen(!isPilotDropdownOpen);
                              // Fetch accounts if opening and not already loaded
                              if (
                                !isPilotDropdownOpen &&
                                pilotAccounts.length === 0
                              ) {
                                fetchPilotAccounts("");
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto text-gray-400"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                isPilotDropdownOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>

                        {isPilotDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {loadingPilotAccounts ? (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                Loading pilots...
                              </div>
                            ) : filteredPilotAccounts.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                {pilotSearchTerm
                                  ? "No pilots found"
                                  : "No pilots available"}
                              </div>
                            ) : (
                              <ul className="py-1">
                                {filteredPilotAccounts.map((account) => (
                                  <li
                                    key={account.id}
                                    onClick={() =>
                                      handlePilotSelect(
                                        account.id.toString(),
                                        `${account.fullName}-${account.licenseNo}`
                                      )
                                    }
                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                      formData.pilotFk === account.id.toString()
                                        ? "bg-blue-50"
                                        : ""
                                    }`}
                                  >
                                    <span className="text-gray-900 text-sm">
                                      {account.fullName}-{account.licenseNo}
                                    </span>
                                    {formData.pilotFk ===
                                      account.id.toString() && (
                                      <Check className="w-4 h-4 text-blue-600" />
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      {validationErrors.pilotFk && (
                        <p className="mt-1 text-xs text-red-600">
                          {validationErrors.pilotFk}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={formData.pilotAcceptDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pilotAcceptDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Time (Zulu)
                      </label>
                      <input
                        type="text"
                        value={formData.pilotAcceptTime}
                        onChange={(e) => {
                          const formatted = formatTimeInput(e.target.value);
                          setFormData({
                            ...formData,
                            pilotAcceptTime: formatted,
                          });
                          if (validationErrors.pilotAcceptTime) {
                            setValidationErrors({
                              ...validationErrors,
                              pilotAcceptTime: "",
                            });
                          }
                        }}
                        placeholder="HH:MM"
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Return to Service */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Return to Service</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Name
                      </label>
                      <div className="relative" ref={rtsDropdownRef}>
                        <div className="relative">
                          <input
                            type="text"
                            value={
                              isRtsDropdownOpen
                                ? rtsSearchTerm
                                : getSelectedRts()
                            }
                            onChange={(e) => {
                              setRtsSearchTerm(e.target.value);
                              setIsRtsDropdownOpen(true);
                              // Clear error when user starts typing
                              if (validationErrors.rtsSignedBy) {
                                setValidationErrors({
                                  ...validationErrors,
                                  rtsSignedBy: "",
                                });
                              }
                            }}
                            onFocus={() => {
                              setIsRtsDropdownOpen(true);
                              // If there's a selected value, use it as initial search term, otherwise clear
                              if (formData.rtsName) {
                                setRtsSearchTerm(formData.rtsName);
                              } else {
                                setRtsSearchTerm("");
                              }
                              // Fetch accounts if not already loaded
                              if (rtsAccounts.length === 0) {
                                fetchRtsAccounts("");
                              }
                            }}
                            className={`w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white text-gray-900 ${
                              validationErrors.rtsSignedBy
                                ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                                : "border-gray-300 focus:ring-gray-400 focus:border-gray-400"
                            }`}
                            placeholder="Search Mechanic or mechanic..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsRtsDropdownOpen(!isRtsDropdownOpen);
                              // Fetch accounts if opening and not already loaded
                              if (
                                !isRtsDropdownOpen &&
                                rtsAccounts.length === 0
                              ) {
                                fetchRtsAccounts("");
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto text-gray-400"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                isRtsDropdownOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>

                        {isRtsDropdownOpen && (
                          <div className="absolute z-50 w-full bottom-full mb-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {loadingRtsAccounts ? (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                Loading...
                              </div>
                            ) : filteredRtsAccounts.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                {rtsSearchTerm
                                  ? "No accounts found"
                                  : "No accounts available"}
                              </div>
                            ) : (
                              <ul className="py-1">
                                {filteredRtsAccounts.map((account) => (
                                  <li
                                    key={account.id}
                                    onClick={() =>
                                      handleRtsSelect(
                                        account.id.toString(),
                                        `${account.fullName}-${account.licenseNo}`
                                      )
                                    }
                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                      formData.rtsSignedBy ===
                                      account.id.toString()
                                        ? "bg-blue-50"
                                        : ""
                                    }`}
                                  >
                                    <span className="text-gray-900 text-sm">
                                      {account.fullName}-{account.licenseNo}
                                    </span>
                                    {formData.rtsSignedBy ===
                                      account.id.toString() && (
                                      <Check className="w-4 h-4 text-blue-600" />
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      {validationErrors.rtsSignedBy && (
                        <p className="mt-1 text-xs text-red-600">
                          {validationErrors.rtsSignedBy}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={formData.rtsDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            rtsDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Time (Zulu)
                      </label>
                      <input
                        type="text"
                        value={formData.rtsTime}
                        onChange={(e) => {
                          const formatted = formatTimeInput(e.target.value);
                          setFormData({
                            ...formData,
                            rtsTime: formatted,
                          });
                          if (validationErrors.rtsTime) {
                            setValidationErrors({
                              ...validationErrors,
                              rtsTime: "",
                            });
                          }
                        }}
                        placeholder="HH:MM"
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {attachmentsOnlyLocked && (
              <p className="text-sm text-gray-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                As Technical Publication, choose <strong>White ATL</strong> or{" "}
                <strong>DFP</strong> below — work status defaults to{" "}
                <strong>Pending</strong> (you can change it above). Then click
                Update Entry.
              </p>
            )}

            {/* White ATL / DFP — upload only for Admin / Technical Publication */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">White ATL</label>
                <div>
                  <input
                    type="file"
                    id="white-atl-file"
                    onChange={(e) =>
                      handleFileChange("whiteAtl", e.target.files?.[0] || null)
                    }
                    className="hidden"
                    disabled={!canUploadAtlAttachments}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
                  />
                  <label
                    htmlFor={
                      canUploadAtlAttachments ? "white-atl-file" : undefined
                    }
                    className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm flex items-center justify-between ${
                      canUploadAtlAttachments
                        ? "cursor-pointer hover:bg-gray-50 transition-colors"
                        : "cursor-not-allowed opacity-60 pointer-events-none"
                    }`}
                  >
                    <span
                      className={
                        whiteAtlFileName ? "text-gray-900" : "text-gray-400"
                      }
                    >
                      {whiteAtlFileName ||
                        (canUploadAtlAttachments
                          ? "Choose file or N/A"
                          : "Upload not permitted for your role")}
                    </span>
                    <Upload className="w-4 h-4 text-gray-400" />
                  </label>
                  {canUploadAtlAttachments && whiteAtlFileName && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("whiteAtl")}
                      className="text-xs text-red-600 hover:text-red-700 mt-1"
                    >
                      Remove file
                    </button>
                  )}
                  {editEntry?.whiteAtl && editEntry.whiteAtl.trim() !== "" && (
                    <div className="flex flex-col gap-1 mt-2">
                      {isImageFilePath(editEntry.whiteAtl) && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                          onClick={() =>
                            handleViewAtlFile("white_atl", editEntry.whiteAtl!)
                          }
                        >
                          <Eye className="w-4 h-4 flex-shrink-0" />
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                        onClick={() =>
                          handleDownloadAtlFile(
                            "white_atl",
                            editEntry.whiteAtl!,
                            editEntry.whiteAtl!.split("/").pop() || "white_atl"
                          )
                        }
                      >
                        <Download className="w-4 h-4 flex-shrink-0" />
                        Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">DFP</label>
                <div>
                  <input
                    type="file"
                    id="dfp-file"
                    onChange={(e) =>
                      handleFileChange("dfp", e.target.files?.[0] || null)
                    }
                    className="hidden"
                    disabled={!canUploadAtlAttachments}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
                  />
                  <label
                    htmlFor={canUploadAtlAttachments ? "dfp-file" : undefined}
                    className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm flex items-center justify-between ${
                      canUploadAtlAttachments
                        ? "cursor-pointer hover:bg-gray-50 transition-colors"
                        : "cursor-not-allowed opacity-60 pointer-events-none"
                    }`}
                  >
                    <span
                      className={
                        dfpFileName ? "text-gray-900" : "text-gray-400"
                      }
                    >
                      {dfpFileName ||
                        (canUploadAtlAttachments
                          ? "Choose file or N/A"
                          : "Upload not permitted for your role")}
                    </span>
                    <Upload className="w-4 h-4 text-gray-400" />
                  </label>
                  {canUploadAtlAttachments && dfpFileName && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("dfp")}
                      className="text-xs text-red-600 hover:text-red-700 mt-1"
                    >
                      Remove file
                    </button>
                  )}
                  {editEntry?.dfp && editEntry.dfp.trim() !== "" && (
                    <div className="flex flex-col gap-1 mt-2">
                      {isImageFilePath(editEntry.dfp) && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                          onClick={() =>
                            handleViewAtlFile("dfp", editEntry.dfp!)
                          }
                        >
                          <Eye className="w-4 h-4 flex-shrink-0" />
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                        onClick={() =>
                          handleDownloadAtlFile(
                            "dfp",
                            editEntry.dfp!,
                            editEntry.dfp!.split("/").pop() || "dfp"
                          )
                        }
                      >
                        <Download className="w-4 h-4 flex-shrink-0" />
                        Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {allowSubmit && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editEntry ? "Update Entry" : "Save Entry"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* File View Modal – View button for White ATL / DFP (image popup or download for other types) */}
      {showFileViewModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
                  <Loader2 className="w-8 h-8 animate-spin" />
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
                  {(fileViewMimeType?.startsWith("image/") ||
                    fileViewMimeType === "image/jpeg" ||
                    fileViewMimeType === "image/jpg") && (
                    <img
                      src={fileViewBlobUrl}
                      alt="File preview"
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )}
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
