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
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type ChangeEvent,
} from "react";
import Swal from "../utils/swalDefaults";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import { getAircrafts, getAircraftById } from "../api/aircraftApi";
import {
  getAccountsByDesignation,
  getAllAccounts,
  getAccount,
  Account,
} from "../api/accountApi";
import { getMe } from "../api/authApi";
import {
  resolvePreviousAtlForNewEntry,
  getLatestAircraftTechnicalLog,
  AircraftTechnicalLog,
  createAircraftTechnicalLog,
  AircraftTechnicalLogCreate,
  updateAircraftTechnicalLog,
  AircraftTechnicalLogUpdate,
  resolveAtlPersistedComponentMetric,
  getAtlBatchesForSelect,
  hasTsnValue,
  type AtlBatch,
} from "../api/aircraftTechnicalLogApi";
import {
  snakeAllKeys,
  computeTotalBlockTimeFromUtc,
  toCamel,
  formatAtlDateReportedManilaFromParts,
  formatPhilippinesDateTime,
  formatOptionalNumber2dp,
  formatAtlTboDisplay1dp,
  formatTotalFlightTimeForDisplay,
  getManilaDateTimeParts,
  splitAtlDateTimeReportedFromApi,
  formatZuluTimeKeyboardInput,
  normalizeOptionalZuluTimeInput,
  validateOptionalZuluTime,
  zuluTimeToTimeInputValue,
  resolveAtlRemarksSectionVisibility,
  formatAccountNameLicense,
  resolveAccountNameLicenseDisplay,
} from "../utility/utils";
import { DateInput } from "./ui/DateInput";
import {
  getMissingAircraftFieldsForNewAtlWhenNoPrevious,
  buildAircraftDetailsRequiredForAtlHtml,
  buildAtlInitialValuesFromAircraftFallback,
  resolveAircraftEnginePropHour,
  ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
} from "../utility/atlAircraftPrerequisites";
import type { Aircraft } from "../types/Aircraft";
import apiClient from "../api/index";
import {
  formatShortDisplayFileName,
  getAtlStoredUploadFilePath,
} from "../api/fileUploadApi";
import { useUserPermissions } from "../hooks/useUserPermissions";
import {
  formatAtlWorkStatusLabel,
  getAtlWorkStatusDropdownKeysForRole,
  isMaintenancePlannerAtlWorkStatusLockedOnEdit,
  canManageAtlBatchFilter,
  canUpdateAtlWhiteAtlDfpFields,
  canShowAtlWhiteAtlDfpSection,
  canEditAtlWhiteAtlDfpFields,
  isAtlWhiteAtlDfpOnlyEdit,
  getAtlEditDeniedMessage,
  canEditAtlFields,
  isAdminRole,
  isAtlCompletedWorkStatus,
  isAtlEditAllowedForRoleAndWorkStatus,
  isTechnicalPublicationRestrictedEdit,
  isTechnicalPublicationRole,
  normalizeAtlWorkStatus,
} from "../utility/atlEditRbac";

/**
 * Flat + nested engine/propeller/airframe shapes from the ATL API (matches Operation list display).
 */
const DEFAULT_ATL_PREV_TIME = "0.00";

function parseAtlBatchFkForLatest(
  raw: string | null | undefined
): number | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function formatAtlPrevTimeFromLatest(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return DEFAULT_ATL_PREV_TIME;
  }
  return Number(value).toFixed(2);
}

function formatAtlComputedDisplay1dp(value: unknown, fallback = ""): string {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : fallback;
}

function formatAtlComputedDisplay2dp(value: unknown, fallback = ""): string {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : fallback;
}

/** Life limits from a previous ATL row (empty when missing/invalid). */
function formatAtlLifeLimitFromPrevious(value: unknown): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

function getPrevTimesFromLatestAtl(latestEntry: AircraftTechnicalLog | null): {
  airframePrevTime: string;
  enginePrevTime: string;
  propellerPrevTime: string;
} {
  if (!latestEntry) {
    return {
      airframePrevTime: DEFAULT_ATL_PREV_TIME,
      enginePrevTime: DEFAULT_ATL_PREV_TIME,
      propellerPrevTime: DEFAULT_ATL_PREV_TIME,
    };
  }
  return {
    airframePrevTime: formatAtlPrevTimeFromLatest(
      latestEntry.airframeTotalTime
    ),
    enginePrevTime: formatAtlPrevTimeFromLatest(latestEntry.engineTotalTime),
    propellerPrevTime: formatAtlPrevTimeFromLatest(
      latestEntry.propellerTotalTime
    ),
  };
}

/**
 * Create-only: next Sequence No. from latest ATL sequence_no (+1).
 * Preserves leading-zero width when possible; never returns NaN.
 * No latest ATL → "1".
 */
function computeNextAtlSequenceNo(
  latestSequenceNo: string | number | null | undefined
): string {
  if (latestSequenceNo == null || String(latestSequenceNo).trim() === "") {
    return "1";
  }
  const raw = String(latestSequenceNo).trim();
  const match = raw.match(/(\d+)$/);
  if (!match) return "1";
  const digits = match[1];
  const num = Number.parseInt(digits, 10);
  if (!Number.isFinite(num)) return "1";
  const next = num + 1;
  if (!Number.isFinite(next)) return "1";
  const nextStr = String(next);
  // Preserve pad length when next still fits; allow growth on overflow (e.g. 999 → 1000)
  if (nextStr.length > digits.length) return nextStr;
  return nextStr.padStart(digits.length, "0");
}

/**
 * Create-only: Hobbs Meter Start from latest ATL hobbsMeterEnd.
 * Missing / null / blank → "" (manual entry). Valid 0 is kept.
 */
function resolveHobbsMeterStartFromLatest(
  latestEntry: AircraftTechnicalLog | null
): string {
  if (!latestEntry) return "";
  const end = latestEntry.hobbsMeterEnd;
  if (end == null || String(end).trim() === "") return "";
  const n = typeof end === "number" ? end : Number.parseFloat(String(end));
  if (!Number.isFinite(n)) return "";
  return String(end).trim();
}

/** Nature of Flight values that force End = Start (zero meter totals). */
const ZERO_FLIGHT_METER_NATURES = new Set(["PRF", "PSF", "VOID"]);

function isZeroFlightMeterNature(
  natureOfFlight: string | undefined | null
): boolean {
  return ZERO_FLIGHT_METER_NATURES.has(String(natureOfFlight ?? "").trim());
}

/** Set tachometerEnd / hobbsMeterEnd from their Start values (totals → 0). */
function applyZeroFlightMeterEndsFromStarts<
  T extends {
    tachometerStart: string;
    tachometerEnd: string;
    hobbsMeterStart: string;
    hobbsMeterEnd: string;
  },
>(form: T): T {
  return {
    ...form,
    tachometerEnd: form.tachometerStart,
    hobbsMeterEnd: form.hobbsMeterStart,
  };
}

/**
 * View/Create/Edit: remarks stores Pilot Report on line 1 and Maintenance Entry
 * on following lines (matches View modal split).
 */
function splitAtlRemarks(remarks?: string | null): {
  pilotReport: string;
  maintenanceEntry: string;
} {
  const raw = String(remarks ?? "");
  if (!raw) return { pilotReport: "", maintenanceEntry: "" };
  const lines = raw.split("\n");
  return {
    pilotReport: lines[0] ?? "",
    maintenanceEntry: lines.slice(1).join("\n"),
  };
}

function combineAtlRemarks(
  pilotReport: string,
  maintenanceEntry: string
): string | undefined {
  const pilot = String(pilotReport ?? "");
  const maint = String(maintenanceEntry ?? "");
  if (!pilot && !maint) return undefined;
  if (!maint) return pilot;
  if (!pilot) return `\n${maint}`;
  return `${pilot}\n${maint}`;
}

/**
 * Map persisted ATL component metrics for the edit form (matches Operation list view).
 * Reads only stored API fields — never auto_* computed values or list fallbacks.
 * AFTT shown to 2 decimal places; other runtimes/TSN/TSO to 1dp; TBO to 1dp.
 */
function resolveAtlEditComponentSources(entry: AircraftTechnicalLog) {
  const formatPersisted = (
    metric: Parameters<typeof resolveAtlPersistedComponentMetric>[1]
  ) =>
    formatAtlComputedDisplay1dp(
      resolveAtlPersistedComponentMetric(entry, metric),
      ""
    );

  return {
    airframeRunTime: formatPersisted("airframeRunTime"),
    airframeAftt: formatAtlComputedDisplay2dp(
      resolveAtlPersistedComponentMetric(entry, "airframeAftt"),
      ""
    ),
    engineRunTime: formatPersisted("engineRunTime"),
    engineTsn: formatPersisted("engineTsn"),
    engineTso: formatPersisted("engineTso"),
    engineTbo: formatAtlTboDisplay1dp(
      resolveAtlPersistedComponentMetric(entry, "engineTbo"),
      ""
    ),
    propellerRunTime: formatPersisted("propellerRunTime"),
    propellerTsn: formatPersisted("propellerTsn"),
    propellerTso: formatPersisted("propellerTso"),
    propellerTbo: formatAtlTboDisplay1dp(
      resolveAtlPersistedComponentMetric(entry, "propellerTbo"),
      ""
    ),
  };
}

function parseFiniteFloatField(
  value: string | undefined | null
): number | null {
  if (value == null) return null;
  const t = String(value).trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * engine_tsn / propeller_tsn: optional on form.
 * Empty / "UNK" (display-only) → null — never persist "UNK".
 */
function resolveTsnForApi(value: string | undefined | null): number | null {
  if (value == null) return null;
  const t = String(value).trim();
  if (t === "" || t.toUpperCase() === "UNK") return null;
  return parseFiniteFloatField(t);
}

/** Edit Entry: map displayed form fields directly to persisted snake_case payload keys. */
function applyAtlEditComponentMetricsPayload(
  payload: Record<string, unknown>,
  form: {
    airframeAftt: string;
    airframeRunTime: string;
    engineRunTime: string;
    propellerRunTime: string;
    engineTsn: string;
    engineTso: string;
    engineTbo: string;
    propellerTsn: string;
    propellerTso: string;
    propellerTbo: string;
  },
  tsnGate?: { engineTsnEnabled: boolean; propellerTsnEnabled: boolean }
): void {
  payload.airframe_aftt = parseFiniteFloatField(form.airframeAftt) ?? 0;
  payload.airframe_run_time = parseFiniteFloatField(form.airframeRunTime) ?? 0;
  payload.engine_run_time = parseFiniteFloatField(form.engineRunTime) ?? 0;
  payload.engine_tsn =
    tsnGate && !tsnGate.engineTsnEnabled
      ? null
      : resolveTsnForApi(form.engineTsn);
  payload.engine_tso = parseFiniteFloatField(form.engineTso) ?? 0;
  payload.engine_tbo = parseFiniteFloatField(form.engineTbo) ?? 0;
  payload.propeller_run_time =
    parseFiniteFloatField(form.propellerRunTime) ?? 0;
  payload.propeller_tsn =
    tsnGate && !tsnGate.propellerTsnEnabled
      ? null
      : resolveTsnForApi(form.propellerTsn);
  payload.propeller_tso = parseFiniteFloatField(form.propellerTso) ?? 0;
  payload.propeller_tbo = parseFiniteFloatField(form.propellerTbo) ?? 0;
}

/** Create entry: empty runtime → tachometerTotal before submit. */
function resolveAtlCreateRuntimeForPayload(
  formValue: string | undefined | null,
  tachometerTotal: string | undefined | null
): number | undefined {
  const parsed = parseFiniteFloatField(formValue);
  if (parsed != null) return parsed;
  return parseFiniteFloatField(tachometerTotal) ?? undefined;
}

function resolveAtlRuntimeForCompute(
  formValue: string | undefined | null,
  tachometerTotal: string | undefined | null,
  tachDelta: number
): number {
  return (
    parseFiniteFloatField(formValue) ??
    parseFiniteFloatField(tachometerTotal) ??
    tachDelta
  );
}

function hasAtlTachometerTotalValue(
  tachometerTotal: string | undefined | null
): boolean {
  return parseFiniteFloatField(tachometerTotal) != null;
}

function assignAtlRuntimesFromTachometerTotal(
  tachometerTotal: string
): Pick<
  Record<string, string>,
  "airframeRunTime" | "engineRunTime" | "propellerRunTime"
> {
  return {
    airframeRunTime: tachometerTotal,
    engineRunTime: tachometerTotal,
    propellerRunTime: tachometerTotal,
  };
}

type AtlComponentMetricsContext = {
  previousAirframeAftt: number;
  /** Baseline for auto-compute when engineTsnEnabled (from previous ATL or aircraft). */
  previousEngineTsn: number | null;
  previousEngineTso: number;
  /** Baseline for auto-compute when propellerTsnEnabled (from previous ATL or aircraft). */
  previousPropellerTsn: number | null;
  previousPropellerTso: number;
  /** From Aircraft Profile engine_tsn — gates auto-compute / inherit independently. */
  engineTsnEnabled: boolean;
  /** From Aircraft Profile propeller_tsn — gates auto-compute / inherit independently. */
  propellerTsnEnabled: boolean;
};

/** Aircraft Profile TSN gate: GET /api/v1/aircraft/{id} engine_tsn / propeller_tsn. */
function resolveAircraftProfileTsnGate(
  aircraft: Aircraft | null | undefined
): {
  engineTsnEnabled: boolean;
  propellerTsnEnabled: boolean;
  engineTsnBaseline: number | null;
  propellerTsnBaseline: number | null;
} {
  const engineRaw = resolveAircraftEnginePropHour(aircraft, "engineTsn");
  const propellerRaw = resolveAircraftEnginePropHour(aircraft, "propellerTsn");
  const engineTsnEnabled = hasTsnValue(engineRaw);
  const propellerTsnEnabled = hasTsnValue(propellerRaw);
  const engineN = Number(engineRaw);
  const propellerN = Number(propellerRaw);
  return {
    engineTsnEnabled,
    propellerTsnEnabled,
    engineTsnBaseline:
      engineTsnEnabled && Number.isFinite(engineN) ? engineN : null,
    propellerTsnBaseline:
      propellerTsnEnabled && Number.isFinite(propellerN) ? propellerN : null,
  };
}

/** Previous ATL TSN only when Aircraft Profile enables that field; else null (no inherit). */
function resolvePreviousTsnForAtl(
  enabled: boolean,
  previousAtlTsn: unknown,
  aircraftBaseline: number | null
): number | null {
  if (!enabled) return null;
  if (hasTsnValue(previousAtlTsn)) {
    const n = Number(previousAtlTsn);
    if (Number.isFinite(n)) return n;
  }
  return aircraftBaseline;
}

function computeAtlTboFromLifeLimitAndTso(
  lifeLimit: string | number | undefined | null,
  tso: string | number | undefined | null
): number | null {
  const life = parseFiniteFloatField(
    lifeLimit == null ? "" : String(lifeLimit)
  );
  const tsoNum = parseFiniteFloatField(tso == null ? "" : String(tso));
  if (life == null || life <= 0 || tsoNum == null) return null;
  const tbo = life - tsoNum;
  return Number.isFinite(tbo) ? tbo : null;
}

function formatAtlTboFromLifeLimitAndTso(
  lifeLimit: string | number | undefined | null,
  tso: string | number | undefined | null
): string {
  return formatAtlTboDisplay1dp(
    computeAtlTboFromLifeLimitAndTso(lifeLimit, tso),
    ""
  );
}

/**
 * engineTbo / propellerTbo:
 * life > 0 → life − TSO; otherwise null (empty).
 * Incomplete TSO with a valid life limit preserves the current TBO.
 */
function recomputeAtlTboOnTsoChange(
  lifeLimit: string,
  tso: string,
  currentTbo: string
): string {
  const life = parseFiniteFloatField(lifeLimit);
  if (life == null) return currentTbo;
  if (life <= 0) return "";
  const tsoNum = parseFiniteFloatField(tso);
  if (tsoNum == null) return currentTbo;
  const tbo = life - tsoNum;
  if (!Number.isFinite(tbo)) return currentTbo;
  return formatAtlTboDisplay1dp(tbo);
}

function resolveAtlLifeLimitForCompute(
  formLifeLimit: string,
  aircraftLifeLimit?: string
): string {
  if (parseFiniteFloatField(formLifeLimit) != null) return formLifeLimit;
  if (aircraftLifeLimit != null && parseFiniteFloatField(aircraftLifeLimit) != null) {
    return aircraftLifeLimit;
  }
  return formLifeLimit || aircraftLifeLimit || "";
}

/** Auto-compute AFTT, TSN, TSO, TBO from current form runtimes (after tachometerTotal sync). */
function computeAtlComponentMetricsPatch(
  form: {
    tachometerStart: string;
    tachometerEnd: string;
    tachometerTotal: string;
    airframeRunTime: string;
    engineRunTime: string;
    propellerRunTime: string;
    lifeTimeLimitEngine: string;
    lifeTimeLimitPropeller: string;
    airframeAftt: string;
    engineTsn: string;
    engineTso: string;
    engineTbo: string;
    propellerTsn: string;
    propellerTso: string;
    propellerTbo: string;
  },
  ctx: AtlComponentMetricsContext,
  options?: { recomputeTbo?: boolean }
): Partial<typeof form> {
  const tachStart = parseFiniteFloatField(form.tachometerStart);
  const tachEnd = parseFiniteFloatField(form.tachometerEnd);
  const tachDelta =
    tachStart != null && tachEnd != null && Number.isFinite(tachEnd - tachStart)
      ? Math.max(0, tachEnd - tachStart)
      : 0;
  const airframeRunTime = resolveAtlRuntimeForCompute(
    form.airframeRunTime,
    form.tachometerTotal,
    tachDelta
  );
  const airframeAfttVal = (ctx.previousAirframeAftt || 0) + airframeRunTime;
  const engineRunTime = resolveAtlRuntimeForCompute(
    form.engineRunTime,
    form.tachometerTotal,
    airframeRunTime
  );
  const prevEngineTso = ctx.previousEngineTso || 0;
  const engineTso = prevEngineTso + engineRunTime;
  const propellerRunTime = resolveAtlRuntimeForCompute(
    form.propellerRunTime,
    form.tachometerTotal,
    airframeRunTime
  );
  const prevPropTso = ctx.previousPropellerTso || 0;
  const propellerTso = prevPropTso + propellerRunTime;

  // TSN auto-compute gated by Aircraft Profile (engineTsnEnabled / propellerTsnEnabled).
  // Disabled → empty (UNK placeholder); never coerce to 0 or inherit previous ATL.
  const patch: Partial<typeof form> = {
    airframeRunTime: airframeRunTime.toFixed(1),
    airframeAftt: airframeAfttVal.toFixed(2),
    engineRunTime: engineRunTime.toFixed(1),
    engineTso: engineTso.toFixed(1),
    propellerRunTime: propellerRunTime.toFixed(1),
    propellerTso: propellerTso.toFixed(1),
  };
  if (ctx.engineTsnEnabled && ctx.previousEngineTsn != null) {
    patch.engineTsn = (ctx.previousEngineTsn + engineRunTime).toFixed(1);
  } else if (!ctx.engineTsnEnabled) {
    patch.engineTsn = "";
  }
  if (ctx.propellerTsnEnabled && ctx.previousPropellerTsn != null) {
    patch.propellerTsn = (ctx.previousPropellerTsn + propellerRunTime).toFixed(
      1
    );
  } else if (!ctx.propellerTsnEnabled) {
    patch.propellerTsn = "";
  }

  if (options?.recomputeTbo !== false) {
    patch.engineTbo = recomputeAtlTboOnTsoChange(
      form.lifeTimeLimitEngine,
      engineTso.toFixed(1),
      form.engineTbo
    );
    patch.propellerTbo = recomputeAtlTboOnTsoChange(
      form.lifeTimeLimitPropeller,
      propellerTso.toFixed(1),
      form.propellerTbo
    );
  }

  return patch;
}

function resolveAtlPersistedOrComputedTbo(
  entry: AircraftTechnicalLog,
  metric: "engineTbo" | "propellerTbo",
  lifeLimit: string,
  tso: string
): string {
  const persisted = resolveAtlPersistedComponentMetric(entry, metric);
  if (persisted != null && String(persisted).trim() !== "") {
    return formatAtlTboDisplay1dp(persisted, "");
  }
  return formatAtlTboFromLifeLimitAndTso(lifeLimit, tso);
}

type AtlComponentFormSlice = Parameters<
  typeof computeAtlComponentMetricsPatch
>[0];

function syncAtlComponentFlightTimesFromTachTotal(
  prev: {
    airframePrevTime: string;
    enginePrevTime: string;
    propellerPrevTime: string;
  },
  tachometerTotal: string
) {
  const syncTotalTime = (prevTime: string, flightTime: string): string => {
    const p = parseFiniteFloatField(prevTime);
    const flight = parseFiniteFloatField(flightTime);
    if (p == null || flight == null) return "";
    const sum = p + flight;
    if (!Number.isFinite(sum)) return "";
    return sum.toFixed(2);
  };
  return {
    tachometerTotal,
    airframeFlightTime: tachometerTotal,
    engineFlightTime: tachometerTotal,
    propellerFlightTime: tachometerTotal,
    airframeTotalTime: syncTotalTime(prev.airframePrevTime, tachometerTotal),
    engineTotalTime: syncTotalTime(prev.enginePrevTime, tachometerTotal),
    propellerTotalTime: syncTotalTime(prev.propellerPrevTime, tachometerTotal),
  };
}

/** tachometerTotal change — sync runtimes, then recompute dependent metrics (incl. TSO/TBO). */
function applyAtlTachometerTotalUserChange(
  form: AtlComponentFormSlice & {
    airframePrevTime: string;
    enginePrevTime: string;
    propellerPrevTime: string;
  },
  tachometerTotal: string,
  ctx: AtlComponentMetricsContext,
  aircraftLifeLimits?: { engine: string; propeller: string }
): Partial<typeof form> {
  const flightSync = syncAtlComponentFlightTimesFromTachTotal(
    form,
    tachometerTotal
  );

  const runtimeSync = assignAtlRuntimesFromTachometerTotal(tachometerTotal);
  const formAfterRuntimeSync = {
    ...form,
    ...flightSync,
    ...runtimeSync,
    lifeTimeLimitEngine: resolveAtlLifeLimitForCompute(
      form.lifeTimeLimitEngine,
      aircraftLifeLimits?.engine
    ),
    lifeTimeLimitPropeller: resolveAtlLifeLimitForCompute(
      form.lifeTimeLimitPropeller,
      aircraftLifeLimits?.propeller
    ),
  };

  const computedMetrics = computeAtlComponentMetricsPatch(
    formAfterRuntimeSync,
    ctx,
    { recomputeTbo: true }
  );

  return {
    ...flightSync,
    ...runtimeSync,
    ...computedMetrics,
  };
}

/** Editable Airframe / Engine / Propeller table fields that trigger full-table recompute. */
type AtlTableCalculationField =
  | "airframePrevTime"
  | "enginePrevTime"
  | "propellerPrevTime"
  | "airframeAftt"
  | "engineTsn"
  | "engineTso"
  | "propellerTsn"
  | "propellerTso";

type AtlCalculationField =
  | "offBlocksDate"
  | "offBlocksTime"
  | "onBlocksDate"
  | "onBlocksTime"
  | "totalFlightTime"
  | "hobbsMeterStart"
  | "hobbsMeterEnd"
  | "tachometerStart"
  | "tachometerEnd"
  | "tachometerTotal"
  | "airframeRunTime"
  | "engineRunTime"
  | "propellerRunTime"
  | "engineTso"
  | "propellerTso"
  | "lifeTimeLimitEngine"
  | "lifeTimeLimitPropeller"
  | "airframePrevTime"
  | "enginePrevTime"
  | "propellerPrevTime"
  | "airframeAftt"
  | "engineTsn"
  | "propellerTsn"
  | "previousAirframeAftt"
  | "previousEngineTsn"
  | "previousEngineTso"
  | "previousPropellerTsn"
  | "previousPropellerTso";

const ATL_TABLE_CALCULATION_FIELDS = new Set<string>([
  "airframePrevTime",
  "enginePrevTime",
  "propellerPrevTime",
  "airframeAftt",
  "engineTsn",
  "engineTso",
  "propellerTsn",
  "propellerTso",
]);

function isAtlTableCalculationField(
  field: string
): field is AtlTableCalculationField {
  return ATL_TABLE_CALCULATION_FIELDS.has(field);
}

function parseAtlCalcTime(value: unknown): number {
  const number = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(number) ? number : 0;
}

function formatAtlCalcTime(value: number): string {
  return value.toFixed(1);
}

function formatAtlCalcTime2dp(value: number): string {
  return value.toFixed(2);
}

type AtlTableMetricsFormSlice = {
  airframePrevTime: string;
  enginePrevTime: string;
  propellerPrevTime: string;
  airframeRunTime: string;
  engineRunTime: string;
  propellerRunTime: string;
  airframeTotalTime: string;
  engineTotalTime: string;
  propellerTotalTime: string;
  airframeAftt: string;
  engineTsn: string;
  engineTso: string;
  engineTbo: string;
  propellerTsn: string;
  propellerTso: string;
  propellerTbo: string;
  lifeTimeLimitEngine: string;
  lifeTimeLimitPropeller: string;
};

/**
 * Centralized Airframe / Engine / Propeller table recompute from current runtimes.
 * TSN stays empty (UNK) when Aircraft Profile TSN is unavailable.
 * Manual edits to AFTT / TSN / TSO are preserved when that field is the change source.
 *
 * Prev Time changes → Total Time, then AFTT / TSN / TSO / TBO all refresh.
 */
function recomputeAtlComponentTableFields<T extends AtlTableMetricsFormSlice>(
  form: T,
  field: AtlTableCalculationField | "tachometerRuntime",
  ctx: AtlComponentMetricsContext,
  aircraftLifeLimits?: { engine: string; propeller: string }
): T {
  const next = { ...form };

  const airframeRunTime = parseAtlCalcTime(next.airframeRunTime);
  const engineRunTime = parseAtlCalcTime(next.engineRunTime);
  const propellerRunTime = parseAtlCalcTime(next.propellerRunTime);

  next.lifeTimeLimitEngine = resolveAtlLifeLimitForCompute(
    next.lifeTimeLimitEngine,
    aircraftLifeLimits?.engine
  );
  next.lifeTimeLimitPropeller = resolveAtlLifeLimitForCompute(
    next.lifeTimeLimitPropeller,
    aircraftLifeLimits?.propeller
  );

  const isPrevTimeChange =
    field === "airframePrevTime" ||
    field === "enginePrevTime" ||
    field === "propellerPrevTime";

  // TOTAL TIME = Prev Time + Run Time
  next.airframeTotalTime = formatAtlCalcTime2dp(
    parseAtlCalcTime(next.airframePrevTime) + airframeRunTime
  );
  next.engineTotalTime = formatAtlCalcTime2dp(
    parseAtlCalcTime(next.enginePrevTime) + engineRunTime
  );
  next.propellerTotalTime = formatAtlCalcTime2dp(
    parseAtlCalcTime(next.propellerPrevTime) + propellerRunTime
  );

  // AFTT
  // - Prev Time change → follow Airframe Total Time
  // - Otherwise previous AFTT + run (unless user is typing AFTT)
  if (isPrevTimeChange) {
    next.airframeAftt = next.airframeTotalTime;
  } else if (field !== "airframeAftt") {
    next.airframeAftt = formatAtlCalcTime2dp(
      parseAtlCalcTime(ctx.previousAirframeAftt) + airframeRunTime
    );
  }

  // TSN: only when Aircraft Profile has a value; otherwise UNK (empty)
  if (!ctx.engineTsnEnabled) {
    next.engineTsn = "";
  } else if (field !== "engineTsn") {
    next.engineTsn = formatAtlCalcTime(
      parseAtlCalcTime(ctx.previousEngineTsn) + engineRunTime
    );
  }

  if (!ctx.propellerTsnEnabled) {
    next.propellerTsn = "";
  } else if (field !== "propellerTsn") {
    next.propellerTsn = formatAtlCalcTime(
      parseAtlCalcTime(ctx.previousPropellerTsn) + propellerRunTime
    );
  }

  // TSO
  // - Prev Time change → follow component Total Time
  // - Otherwise previous TSO + run (unless user is typing TSO)
  if (isPrevTimeChange) {
    next.engineTso = formatAtlCalcTime(parseAtlCalcTime(next.engineTotalTime));
    next.propellerTso = formatAtlCalcTime(
      parseAtlCalcTime(next.propellerTotalTime)
    );
  } else {
    if (field !== "engineTso") {
      next.engineTso = formatAtlCalcTime(
        parseAtlCalcTime(ctx.previousEngineTso) + engineRunTime
      );
    }
    if (field !== "propellerTso") {
      next.propellerTso = formatAtlCalcTime(
        parseAtlCalcTime(ctx.previousPropellerTso) + propellerRunTime
      );
    }
  }

  // TBO = life limit − TSO (always refresh after TSO)
  next.engineTbo = formatAtlCalcTime(
    parseAtlCalcTime(next.lifeTimeLimitEngine) -
      parseAtlCalcTime(next.engineTso)
  );
  next.propellerTbo = formatAtlCalcTime(
    parseAtlCalcTime(next.lifeTimeLimitPropeller) -
      parseAtlCalcTime(next.propellerTso)
  );

  return next;
}

type AtlReactiveFormSlice = AtlComponentFormSlice & {
  offBlocksDate: string;
  offBlocksTime: string;
  onBlocksDate: string;
  onBlocksTime: string;
  totalFlightTime: string;
  hobbsMeterStart: string;
  hobbsMeterEnd: string;
  hobbsMeterTotal: string;
  airframePrevTime: string;
  enginePrevTime: string;
  propellerPrevTime: string;
  airframeFlightTime: string;
  engineFlightTime: string;
  propellerFlightTime: string;
  airframeTotalTime: string;
  engineTotalTime: string;
  propellerTotalTime: string;
};

function formatAtlRunTimeValue(n: number): string {
  return n.toFixed(1);
}

function formatAtlTotalTimeValue(n: number): string {
  return n.toFixed(2);
}

function safeSumDisplay(
  a: number | null,
  b: number | null,
  format: (n: number) => string
): string | null {
  if (a == null || b == null) return null;
  const sum = a + b;
  if (!Number.isFinite(sum)) return null;
  return format(sum);
}

/** Full chain from an airframe runtime source of truth (does not touch tachometerTotal or flight times). */
function recomputeAirframeChainFromRunTime(
  form: AtlReactiveFormSlice,
  ctx: AtlComponentMetricsContext,
  runTime: number
): Partial<AtlReactiveFormSlice> {
  const runStr = formatAtlRunTimeValue(runTime);
  const patch: Partial<AtlReactiveFormSlice> = {
    airframeRunTime: runStr,
  };
  // TOTAL TIME = PREV + FLIGHT (flight always from tach)
  const flight =
    parseFiniteFloatField(form.airframeFlightTime) ??
    parseFiniteFloatField(form.tachometerTotal);
  const total = safeSumDisplay(
    parseFiniteFloatField(form.airframePrevTime),
    flight,
    formatAtlTotalTimeValue
  );
  if (total != null) patch.airframeTotalTime = total;
  // AFTT auto-computes from previous AFTT + runtime (manual edits otherwise).
  const aftt = safeSumDisplay(
    ctx.previousAirframeAftt,
    runTime,
    formatAtlTotalTimeValue
  );
  if (aftt != null) patch.airframeAftt = aftt;
  return patch;
}

/** Full chain from an engine runtime source of truth (does not touch tachometerTotal or flight times). */
function recomputeEngineChainFromRunTime(
  form: AtlReactiveFormSlice,
  ctx: AtlComponentMetricsContext,
  runTime: number,
  lifeLimit: string
): Partial<AtlReactiveFormSlice> {
  const runStr = formatAtlRunTimeValue(runTime);
  const patch: Partial<AtlReactiveFormSlice> = {
    engineRunTime: runStr,
  };
  const flight =
    parseFiniteFloatField(form.engineFlightTime) ??
    parseFiniteFloatField(form.tachometerTotal);
  const total = safeSumDisplay(
    parseFiniteFloatField(form.enginePrevTime),
    flight,
    formatAtlTotalTimeValue
  );
  if (total != null) patch.engineTotalTime = total;

  // TSN: Aircraft Profile empty/null → UNK (empty); else previous TSN + runtime.
  if (!ctx.engineTsnEnabled) {
    patch.engineTsn = "";
  } else if (ctx.previousEngineTsn != null) {
    const tsn = safeSumDisplay(
      ctx.previousEngineTsn,
      runTime,
      formatAtlRunTimeValue
    );
    if (tsn != null) patch.engineTsn = tsn;
  }

  // TSO = previous TSO + runtime; TBO follows TSO.
  const tso = safeSumDisplay(
    ctx.previousEngineTso,
    runTime,
    formatAtlRunTimeValue
  );
  if (tso != null) {
    patch.engineTso = tso;
    patch.engineTbo = recomputeAtlTboOnTsoChange(lifeLimit, tso, form.engineTbo);
  }
  return patch;
}

/** Full chain from a propeller runtime source of truth (does not touch tachometerTotal or flight times). */
function recomputePropellerChainFromRunTime(
  form: AtlReactiveFormSlice,
  ctx: AtlComponentMetricsContext,
  runTime: number,
  lifeLimit: string
): Partial<AtlReactiveFormSlice> {
  const runStr = formatAtlRunTimeValue(runTime);
  const patch: Partial<AtlReactiveFormSlice> = {
    propellerRunTime: runStr,
  };
  const flight =
    parseFiniteFloatField(form.propellerFlightTime) ??
    parseFiniteFloatField(form.tachometerTotal);
  const total = safeSumDisplay(
    parseFiniteFloatField(form.propellerPrevTime),
    flight,
    formatAtlTotalTimeValue
  );
  if (total != null) patch.propellerTotalTime = total;

  // TSN: Aircraft Profile empty/null → UNK (empty); else previous TSN + runtime.
  if (!ctx.propellerTsnEnabled) {
    patch.propellerTsn = "";
  } else if (ctx.previousPropellerTsn != null) {
    const tsn = safeSumDisplay(
      ctx.previousPropellerTsn,
      runTime,
      formatAtlRunTimeValue
    );
    if (tsn != null) patch.propellerTsn = tsn;
  }

  // TSO = previous TSO + runtime; TBO follows TSO.
  const tso = safeSumDisplay(
    ctx.previousPropellerTso,
    runTime,
    formatAtlRunTimeValue
  );
  if (tso != null) {
    patch.propellerTso = tso;
    patch.propellerTbo = recomputeAtlTboOnTsoChange(
      lifeLimit,
      tso,
      form.propellerTbo
    );
  }
  return patch;
}

/**
 * Central reactive recalculation: given an already-updated form snapshot and the
 * field that changed, walk the full direct + indirect dependency chain in order.
 * Uses `updatedForm` (not prior React state). Preserves values when operands
 * are incomplete; never writes NaN/Infinity. Component-only edits never mutate
 * tachometerTotal.
 */
function recomputeAllAffectedFields(
  updatedForm: AtlReactiveFormSlice,
  changedField: AtlCalculationField | AtlCalculationField[],
  ctx: AtlComponentMetricsContext,
  aircraftLifeLimits?: { engine: string; propeller: string }
): AtlReactiveFormSlice {
  const changed = new Set(
    Array.isArray(changedField) ? changedField : [changedField]
  );
  let next: AtlReactiveFormSlice = { ...updatedForm };

  next.lifeTimeLimitEngine = resolveAtlLifeLimitForCompute(
    next.lifeTimeLimitEngine,
    aircraftLifeLimits?.engine
  );
  next.lifeTimeLimitPropeller = resolveAtlLifeLimitForCompute(
    next.lifeTimeLimitPropeller,
    aircraftLifeLimits?.propeller
  );

  // --- Block / Hobbs ---
  const totalFlightTimeChanged =
    changed.has("offBlocksDate") ||
    changed.has("offBlocksTime") ||
    changed.has("onBlocksDate") ||
    changed.has("onBlocksTime") ||
    changed.has("totalFlightTime");

  if (
    changed.has("offBlocksDate") ||
    changed.has("offBlocksTime") ||
    changed.has("onBlocksDate") ||
    changed.has("onBlocksTime")
  ) {
    const calculatedTime = computeTotalBlockTimeFromUtc(
      next.offBlocksDate,
      next.offBlocksTime,
      next.onBlocksDate,
      next.onBlocksTime
    );
    next.totalFlightTime = calculatedTime === "0" ? "" : calculatedTime;
  }

  if (changed.has("hobbsMeterStart") || changed.has("hobbsMeterEnd")) {
    const start = parseFiniteFloatField(next.hobbsMeterStart);
    const end = parseFiniteFloatField(next.hobbsMeterEnd);
    if (start != null && end != null) {
      const total = end - start;
      if (Number.isFinite(total)) {
        next.hobbsMeterTotal = total.toFixed(2);
      }
    }
  }

  // --- Tachometer (full sync across all components) ---
  const tachStartEndChanged =
    changed.has("tachometerStart") || changed.has("tachometerEnd");
  const tachTotalDirectChanged = changed.has("tachometerTotal");

  // Recompute component chains when tach changes, and also when Total Flight Time changes.
  if (tachStartEndChanged || totalFlightTimeChanged) {
    const start = parseFiniteFloatField(next.tachometerStart);
    const end = parseFiniteFloatField(next.tachometerEnd);
    const total =
      start != null && end != null && Number.isFinite(end - start)
        ? Math.max(0, end - start).toFixed(2)
        : "0.00";
    next = {
      ...next,
      ...applyAtlTachometerTotalUserChange(
        next,
        total,
        ctx,
        aircraftLifeLimits
      ),
    };
  } else if (tachTotalDirectChanged) {
    // Tachometer total is read-only in the UI; keep sync if set programmatically.
    const tachTotal = parseFiniteFloatField(next.tachometerTotal);
    next = {
      ...next,
      ...applyAtlTachometerTotalUserChange(
        next,
        tachTotal != null ? Math.max(0, tachTotal).toFixed(2) : "0.00",
        ctx,
        aircraftLifeLimits
      ),
    };
  } else {
    // --- Component-scoped chains (never mutate tachometerTotal) ---
    // Total times are read-only outputs (prev + runtime / tach sync), never user sources.

    // Airframe
    if (changed.has("airframeRunTime")) {
      const run = parseFiniteFloatField(next.airframeRunTime);
      if (run != null) {
        next = {
          ...next,
          ...recomputeAirframeChainFromRunTime(next, ctx, run),
        };
      }
    } else {
      if (changed.has("airframePrevTime")) {
        const flight =
          parseFiniteFloatField(next.airframeFlightTime) ??
          parseFiniteFloatField(next.tachometerTotal);
        const total = safeSumDisplay(
          parseFiniteFloatField(next.airframePrevTime),
          flight,
          formatAtlTotalTimeValue
        );
        // Prev Time → Total Time only; AFTT stays manual / previous-AFTT based.
        if (total != null) next.airframeTotalTime = total;
      }
      if (changed.has("previousAirframeAftt")) {
        const aftt = safeSumDisplay(
          ctx.previousAirframeAftt,
          parseFiniteFloatField(next.airframeRunTime),
          formatAtlTotalTimeValue
        );
        if (aftt != null) next.airframeAftt = aftt;
      }
    }

    // Engine
    if (changed.has("engineRunTime")) {
      const run = parseFiniteFloatField(next.engineRunTime);
      if (run != null) {
        next = {
          ...next,
          ...recomputeEngineChainFromRunTime(
            next,
            ctx,
            run,
            next.lifeTimeLimitEngine
          ),
        };
      }
    } else {
      if (changed.has("enginePrevTime")) {
        const flight =
          parseFiniteFloatField(next.engineFlightTime) ??
          parseFiniteFloatField(next.tachometerTotal);
        const total = safeSumDisplay(
          parseFiniteFloatField(next.enginePrevTime),
          flight,
          formatAtlTotalTimeValue
        );
        // Prev Time → Total Time only; TSO/TBO are independent.
        if (total != null) next.engineTotalTime = total;
      }
      if (changed.has("previousEngineTsn")) {
        if (!ctx.engineTsnEnabled) {
          next.engineTsn = "";
        } else {
          const tsn = safeSumDisplay(
            ctx.previousEngineTsn,
            parseFiniteFloatField(next.engineRunTime),
            formatAtlRunTimeValue
          );
          if (tsn != null) next.engineTsn = tsn;
        }
      }
      if (changed.has("previousEngineTso")) {
        const tso = safeSumDisplay(
          ctx.previousEngineTso,
          parseFiniteFloatField(next.engineRunTime),
          formatAtlRunTimeValue
        );
        if (tso != null) {
          next.engineTso = tso;
          next.engineTbo = recomputeAtlTboOnTsoChange(
            next.lifeTimeLimitEngine,
            tso,
            next.engineTbo
          );
        }
      }
    }

    // Propeller
    if (changed.has("propellerRunTime")) {
      const run = parseFiniteFloatField(next.propellerRunTime);
      if (run != null) {
        next = {
          ...next,
          ...recomputePropellerChainFromRunTime(
            next,
            ctx,
            run,
            next.lifeTimeLimitPropeller
          ),
        };
      }
    } else {
      if (changed.has("propellerPrevTime")) {
        const flight =
          parseFiniteFloatField(next.propellerFlightTime) ??
          parseFiniteFloatField(next.tachometerTotal);
        const total = safeSumDisplay(
          parseFiniteFloatField(next.propellerPrevTime),
          flight,
          formatAtlTotalTimeValue
        );
        // Prev Time → Total Time only; TSO/TBO are independent.
        if (total != null) next.propellerTotalTime = total;
      }
      if (changed.has("previousPropellerTsn")) {
        if (!ctx.propellerTsnEnabled) {
          next.propellerTsn = "";
        } else {
          const tsn = safeSumDisplay(
            ctx.previousPropellerTsn,
            parseFiniteFloatField(next.propellerRunTime),
            formatAtlRunTimeValue
          );
          if (tsn != null) next.propellerTsn = tsn;
        }
      }
      if (changed.has("previousPropellerTso")) {
        const tso = safeSumDisplay(
          ctx.previousPropellerTso,
          parseFiniteFloatField(next.propellerRunTime),
          formatAtlRunTimeValue
        );
        if (tso != null) {
          next.propellerTso = tso;
          next.propellerTbo = recomputeAtlTboOnTsoChange(
            next.lifeTimeLimitPropeller,
            tso,
            next.propellerTbo
          );
        }
      }
    }
  }

  // Manual TSO / life-limit → TBO only (skip if already refreshed by a runtime chain above)
  const engineChainAlreadyRan =
    changed.has("engineRunTime") ||
    changed.has("previousEngineTso") ||
    tachStartEndChanged ||
    tachTotalDirectChanged;
  const propellerChainAlreadyRan =
    changed.has("propellerRunTime") ||
    changed.has("previousPropellerTso") ||
    tachStartEndChanged ||
    tachTotalDirectChanged;

  if (
    (changed.has("engineTso") || changed.has("lifeTimeLimitEngine")) &&
    !engineChainAlreadyRan
  ) {
    next.engineTbo = recomputeAtlTboOnTsoChange(
      next.lifeTimeLimitEngine,
      next.engineTso,
      next.engineTbo
    );
  }

  if (
    (changed.has("propellerTso") || changed.has("lifeTimeLimitPropeller")) &&
    !propellerChainAlreadyRan
  ) {
    next.propellerTbo = recomputeAtlTboOnTsoChange(
      next.lifeTimeLimitPropeller,
      next.propellerTso,
      next.propellerTbo
    );
  }

  return next;
}

function hasAtlDateReportedValue(
  formDate: string,
  formTime: string,
  apiValue?: string | null
): boolean {
  if (apiValue != null && String(apiValue).trim() !== "") return true;
  return Boolean(formDate?.trim() && formTime?.trim());
}

function hasTechPubAttachmentOrLinkUpdate(
  form: {
    whiteAtl: File | null;
    dfp: File | null;
    whiteAtlWebLink: string;
    dfpWebLink: string;
  },
  initialLinks: { whiteAtlWebLink: string; dfpWebLink: string }
): boolean {
  if (form.whiteAtl instanceof File) return true;
  if (form.dfp instanceof File) return true;
  const whiteLink = form.whiteAtlWebLink?.trim() ?? "";
  const dfpLink = form.dfpWebLink?.trim() ?? "";
  if (whiteLink !== initialLinks.whiteAtlWebLink) return true;
  if (dfpLink !== initialLinks.dfpWebLink) return true;
  return false;
}

interface AddTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editEntry?: AircraftTechnicalLog | null;
  onSuccess?: () => void | Promise<void>;
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
  /** When true, all fields are read-only and Save/Update is hidden (RBAC view-only edit modal). */
  forceReadOnly?: boolean;
  /** When creating, pre-select ATL batch (e.g. match parent "Filter by ATL batch"). Ignored when editEntry is set. */
  defaultAtlBatchFk?: number;
}

export function AddTechnicalLogbookEntryModal({
  isOpen,
  onClose,
  editEntry,
  onSuccess,
  aircraftId,
  permissionModuleCode,
  viewerRole,
  editRestrictedToWhiteAtlDfpOnly = false,
  forceReadOnly = false,
  defaultAtlBatchFk,
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
  /** Add Entry: true while Previous ATL / Aircraft Details init is in flight. */
  const [isInitializing, setIsInitializing] = useState(false);
  /** Increments on each Previous ATL init fetch so stale responses cannot unlock/overwrite. */
  const atlInitRequestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setAtlAuthRole(undefined);
      skipInitialEditBaseRefreshRef.current = true;
      atlInitRequestIdRef.current += 1;
      setIsInitializing(false);
      return;
    }
    if (!editEntry) {
      setIsInitializing(true);
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
  }, [isOpen, editEntry]);

  /** Prefer /me (login), then permissions hook, then parent prop — all should match after load. */
  const atlRoleForWorkStatus = useMemo(
    () =>
      atlAuthRole || permUser?.role?.trim() || viewerRole?.trim() || undefined,
    [atlAuthRole, permUser?.role, viewerRole]
  );

  const showAtlBatchFilter = canManageAtlBatchFilter(atlRoleForWorkStatus);

  const showAtlBatchFormField = Boolean(editEntry || showAtlBatchFilter);

  const isTechPubRole = useMemo(
    () => isTechnicalPublicationRole(atlRoleForWorkStatus),
    [atlRoleForWorkStatus]
  );

  /** Show section: privileged roles may add/edit; others see it read-only when data exists. */
  const canUseTechPubView = useMemo(
    () =>
      Boolean(editEntry) &&
      canShowAtlWhiteAtlDfpSection(
        atlRoleForWorkStatus,
        editEntry?.workStatus,
        { isEdit: true, entry: editEntry }
      ),
    [editEntry, atlRoleForWorkStatus]
  );

  /** Original `date_time_reported` from API; never overwritten once set. */
  const preservedDateReportedRef = useRef<string | null>(null);
  /** Blocks reactive calc while edit form is hydrating from GET API. */
  const editAtlInitialHydrationRef = useRef(false);
  /** Prevent first edit recompute-base refresh triggered by hydration wiring. */
  const skipInitialEditBaseRefreshRef = useRef(true);

  /** Baseline web links when edit form loads — used to detect Tech Pub updates. */
  const initialTechPubLinksRef = useRef({
    whiteAtlWebLink: "",
    dfpWebLink: "",
  });
  /** Aircraft life limits from previous ATL, or Aircraft Details when no ATL exists. */
  const atlAircraftLifeLimitsRef = useRef({
    engine: "",
    propeller: "",
  });

  const syncAtlAircraftLifeLimitsRef = (limits: {
    engine?: string;
    propeller?: string;
  }) => {
    if (limits.engine != null) {
      atlAircraftLifeLimitsRef.current.engine = limits.engine;
    }
    if (limits.propeller != null) {
      atlAircraftLifeLimitsRef.current.propeller = limits.propeller;
    }
  };

  const canEditWhiteAtlDfpSection = useMemo(
    () =>
      Boolean(
        editEntry &&
          canUpdateAtlWhiteAtlDfpFields(
            atlRoleForWorkStatus,
            editEntry.workStatus
          )
      ),
    [editEntry, atlRoleForWorkStatus]
  );

  const atlFormReadOnly = useMemo(
    () =>
      Boolean(
        forceReadOnly ||
          (editEntry &&
            !canEditAtlFields(atlRoleForWorkStatus, editEntry.workStatus) &&
            !canEditWhiteAtlDfpSection)
      ),
    [forceReadOnly, editEntry, atlRoleForWorkStatus, canEditWhiteAtlDfpSection]
  );

  const attachmentsOnlyLocked = Boolean(
    editEntry &&
      canEditWhiteAtlDfpSection &&
      (editRestrictedToWhiteAtlDfpOnly ||
        isTechnicalPublicationRestrictedEdit(
          atlRoleForWorkStatus,
          editEntry.workStatus
        ) ||
        isAtlWhiteAtlDfpOnlyEdit(atlRoleForWorkStatus, editEntry.workStatus))
  );

  const mainFormLocked =
    atlFormReadOnly || attachmentsOnlyLocked || isInitializing;
  /** View / full read-only: no uploads. Attachment-only edit may still upload when allowed. */
  const canUploadAtlInCurrentMode =
    !forceReadOnly && canEditWhiteAtlDfpSection;

  const mod = permissionModuleCode;

  const [formData, setFormData] = useState({
    seqNo: "",
    workStatus: "FOR_REVIEW",
    acReg: "",
    atlBatchFk: "",
    natureOfFlight: "TR",
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
    hobbsMeterStart: "",
    hobbsMeterEnd: "",
    hobbsMeterTotal: "",
    // Inspection & Service
    nextInspectionDue: "",
    tachTimeDue: "",
    // Remarks
    pilotReport: "",
    maintenanceEntry: "",
    remarksPerson: "",
    remarksPersonName: "",
    actionsTaken: "",
    actionsTakenPerson: "",
    actionsTakenPersonName: "",
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
    whiteAtlWebLink: "",
    dfpWebLink: "",
    dateTimeReportedDate: "",
    dateTimeReportedTime: "",
    dateTimeReleasedDate: "",
    dateTimeReleasedTime: "",
    // Airframe & Component Times

    airframePrevTime: DEFAULT_ATL_PREV_TIME,
    airframeFlightTime: "",
    airframeTotalTime: "",
    airframeRunTime: "",
    airframeAftt: "",

    enginePrevTime: DEFAULT_ATL_PREV_TIME,
    engineFlightTime: "",
    engineTotalTime: "",
    engineRunTime: "",
    engineTsn: "",
    engineTso: "",
    engineTbo: "",
    propellerPrevTime: DEFAULT_ATL_PREV_TIME,
    propellerFlightTime: "",
    propellerTotalTime: "",
    propellerRunTime: "",
    propellerTsn: "",
    propellerTso: "",
    propellerTbo: "",
    lifeTimeLimitEngine: "",
    lifeTimeLimitPropeller: "",
  });

  const [philippinesNow, setPhilippinesNow] = useState(() =>
    formatPhilippinesDateTime()
  );

  const dateReportedIsSet = useMemo(
    () =>
      hasAtlDateReportedValue(
        formData.dateTimeReportedDate,
        formData.dateTimeReportedTime,
        preservedDateReportedRef.current ?? editEntry?.dateTimeReported
      ),
    [
      formData.dateTimeReportedDate,
      formData.dateTimeReportedTime,
      editEntry?.dateTimeReported,
    ]
  );

  const techPubCanSubmitAttachmentsOnlyEdit = useMemo(() => {
    if (!attachmentsOnlyLocked || !canUploadAtlInCurrentMode) return false;
    return true;
  }, [attachmentsOnlyLocked, canUploadAtlInCurrentMode]);

  const allowSubmit = useMemo(() => {
    if (isInitializing) return false;
    if (atlFormReadOnly) return false;
    if (!editEntry && (!mod || canCreate(mod))) return true;
    if (!editEntry) return false;
    if (attachmentsOnlyLocked) {
      return (
        techPubCanSubmitAttachmentsOnlyEdit &&
        Boolean(mod) &&
        canUpdate(mod as string)
      );
    }
    if (!canEditAtlFields(atlRoleForWorkStatus, editEntry.workStatus)) {
      return false;
    }
    return Boolean(mod) && canUpdate(mod as string);
  }, [
    isInitializing,
    atlFormReadOnly,
    editEntry,
    mod,
    canCreate,
    canUpdate,
    atlRoleForWorkStatus,
    attachmentsOnlyLocked,
    techPubCanSubmitAttachmentsOnlyEdit,
  ]);

  const workStatusDropdownKeys = useMemo(
    () =>
      getAtlWorkStatusDropdownKeysForRole(atlRoleForWorkStatus, {
        pendingRole: Boolean(editEntry && permLoading && !atlRoleForWorkStatus),
        currentWorkStatus: formData.workStatus,
        isEdit: Boolean(editEntry),
      }),
    [editEntry, permLoading, atlRoleForWorkStatus, formData.workStatus]
  );

  const workStatusChangeLocked = useMemo(
    () =>
      isMaintenancePlannerAtlWorkStatusLockedOnEdit(
        atlRoleForWorkStatus,
        formData.workStatus,
        Boolean(editEntry)
      ),
    [atlRoleForWorkStatus, formData.workStatus, editEntry]
  );

  const displayWorkStatusLabel = useMemo(() => {
    const key = normalizeAtlWorkStatus(formData.workStatus);
    if (key) return formatAtlWorkStatusLabel(key);
    const raw = formData.workStatus?.trim();
    return raw || "—";
  }, [formData.workStatus]);

  /** Edit: dropdown only when role may change status; otherwise show current value as text. */
  const canChangeWorkStatusOnEdit = useMemo(
    () =>
      Boolean(
        editEntry &&
          !mainFormLocked &&
          !workStatusChangeLocked &&
          workStatusDropdownKeys.length > 0
      ),
    [
      editEntry,
      mainFormLocked,
      workStatusChangeLocked,
      workStatusDropdownKeys.length,
    ]
  );

  // Component Records state
  interface ComponentRecord {
    id: string; // temporary ID for React key
    qty: string;
    unit: string;
    nomenclature: string;
    removedPartNo: string;
    removedSerialNo: string;
    partRemovedRemainingTime: string;
    installedPartNo: string;
    installedSerialNo: string;
    partInstalledRemainingTime: string;
    ataChapter: string;
    partRemark: string;
  }

  const [componentRecords, setComponentRecords] = useState<ComponentRecord[]>(
    []
  );

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

  const [atlBatchOptions, setAtlBatchOptions] = useState<AtlBatch[]>([]);

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
  /** Create entry baseline source marker for previous values. */
  const [isFirstAtlCreate, setIsFirstAtlCreate] = useState(false);

  /** Baseline cumulative times before this leg for auto-calculations. */
  const [previousAirframeAftt, setPreviousAirframeAftt] = useState(0);
  const [previousEngineTsn, setPreviousEngineTsn] = useState<number | null>(
    null
  );
  const [previousEngineTso, setPreviousEngineTso] = useState(0);
  const [previousPropellerTsn, setPreviousPropellerTsn] = useState<
    number | null
  >(null);
  const [previousPropellerTso, setPreviousPropellerTso] = useState(0);
  /** Aircraft Profile TSN gates (GET /api/v1/aircraft/{id}). */
  const [engineTsnEnabled, setEngineTsnEnabled] = useState(false);
  const [propellerTsnEnabled, setPropellerTsnEnabled] = useState(false);

  const isEditEntry = Boolean(editEntry);
  const isFirstATL = isFirstAtlCreate;

  // Fetch aircrafts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAircrafts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canUseTechPubView || dateReportedIsSet) return;
    setPhilippinesNow(formatPhilippinesDateTime());
    const id = window.setInterval(
      () => setPhilippinesNow(formatPhilippinesDateTime()),
      1000
    );
    return () => window.clearInterval(id);
  }, [isOpen, canUseTechPubView, dateReportedIsSet]);

  useEffect(() => {
    if (!isOpen) return;
    if (!editEntry && !showAtlBatchFilter) {
      setAtlBatchOptions([]);
      return;
    }
    let cancelled = false;
    getAtlBatchesForSelect()
      .then((list) => {
        if (!cancelled) setAtlBatchOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setAtlBatchOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, editEntry, showAtlBatchFilter]);

  // Auto-select aircraft when aircraftId prop is provided (from useParams)
  useEffect(() => {
    if (aircraftId && isOpen && !editEntry && !selectedAircraftId) {
      const findAndSelectAircraft = async () => {
        try {
          const batchId =
            parseAtlBatchFkForLatest(formData.atlBatchFk) ?? defaultAtlBatchFk;
          const previousAtl = await resolvePreviousAtlForNewEntry(
            aircraftId,
            batchId
          );

          if (previousAtl != null) {
            const registration =
              previousAtl.aircraft?.registration ||
              aircrafts.find((ac) => ac.id === aircraftId)?.registration ||
              "";
            setFormData((prev) => ({
              ...prev,
              acReg: registration,
            }));
            setSelectedAircraftId(aircraftId);
            return;
          }

          // No previous ATL — validate and load registration from Aircraft Details
          try {
            const response = await getAircraftById(aircraftId);
            const aircraftData = response.data;
            const aircraftCamel = toCamel(aircraftData) as Aircraft;
            const missing = getMissingAircraftFieldsForNewAtlWhenNoPrevious(
              previousAtl,
              aircraftCamel
            );
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
          } catch (error) {
            console.error("Error fetching aircraft by ID:", error);
            const aircraft = aircrafts.find((ac) => ac.id === aircraftId);
            if (!aircraft) return;
            try {
              const fullRes = await getAircraftById(aircraftId);
              const aircraftCamel = toCamel(fullRes.data) as Aircraft;
              const missing = getMissingAircraftFieldsForNewAtlWhenNoPrevious(
                previousAtl,
                aircraftCamel
              );
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
            } catch {
              return;
            }
            setFormData((prev) => ({
              ...prev,
              acReg: aircraft.registration,
            }));
            setSelectedAircraftId(aircraftId);
          }
        } catch (error) {
          console.error("Error in auto-select aircraft:", error);
        }
      };

      findAndSelectAircraft();
    }
  }, [aircraftId, isOpen, editEntry]);

  // Populate form when editEntry is provided (after READ API returns in EditTechnicalLogbookEntryModal)
  useEffect(() => {
    if (editEntry && isOpen) {
      setLatestSequenceNo(null); // No format validation when editing
      setIsFirstAtlCreate(false);
      const comp = resolveAtlEditComponentSources(editEntry);
      editAtlInitialHydrationRef.current = true;
      const tachStart = Number(editEntry.tachometerStart) || 0;
      const tachEnd = Number(editEntry.tachometerEnd) || 0;
      const run = tachEnd - tachStart;
      const engineTsnNum = parseFiniteFloatField(comp.engineTsn);
      const propellerTsnNum = parseFiniteFloatField(comp.propellerTsn);
      setPreviousEngineTsn(
        engineTsnNum != null ? Math.max(0, engineTsnNum - run) : null
      );
      setPreviousEngineTso(Math.max(0, (Number(comp.engineTso) || 0) - run));
      setPreviousPropellerTsn(
        propellerTsnNum != null ? Math.max(0, propellerTsnNum - run) : null
      );
      setPreviousPropellerTso(
        Math.max(0, (Number(comp.propellerTso) || 0) - run)
      );
      setPreviousAirframeAftt(
        Math.max(0, (parseFloat(comp.airframeAftt) || 0) - run)
      );
      const reported = splitAtlDateTimeReportedFromApi(
        editEntry.dateTimeReported
      );
      const released = splitAtlDateTimeReportedFromApi(
        editEntry.dateTimeReleased
      );
      preservedDateReportedRef.current =
        editEntry.dateTimeReported?.trim() || null;
      initialTechPubLinksRef.current = {
        whiteAtlWebLink: editEntry.whiteAtlWebLink?.toString().trim() || "",
        dfpWebLink: editEntry.dfpWebLink?.toString().trim() || "",
      };
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
        atlBatchFk: (() => {
          const fk = editEntry.atlBatchFk ?? editEntry.atlBatch?.id ?? null;
          if (fk != null && Number(fk) > 0) return String(fk);
          return "";
        })(),
        // null/empty from API -> "" (-); VOID from API -> "VOID"; normalize TR W/ PIREM -> TR_WITH_PIREM
        natureOfFlight: (() => {
          const nof = String(editEntry.natureOfFlight ?? "").trim();
          if (nof === "VOID") return "VOID";
          if (nof === "TR W/ PIREM" || nof === "TR_WITH_PIREM")
            return "TR_WITH_PIREM";
          return nof;
        })(),
        offBlocksDate: editEntry.originDate || "",
        offBlocksTime: zuluTimeToTimeInputValue(editEntry.originTime),
        offBlocksStation: editEntry.originStation || "",
        onBlocksDate: editEntry.destinationDate || "",
        onBlocksTime: zuluTimeToTimeInputValue(editEntry.destinationTime),
        onBlocksStation: editEntry.destinationStation || "",
        // Prefer API value (H:MM). Fall back to computed block time when missing.
        // Form state keeps ":" — display converts to "+" via formatTotalFlightTimeForDisplay.
        totalFlightTime: (() => {
          if (
            editEntry.totalFlightHours != null &&
            String(editEntry.totalFlightHours).trim() !== ""
          ) {
            return String(editEntry.totalFlightHours).trim();
          }
          const computed = computeTotalBlockTimeFromUtc(
            editEntry.originDate || "",
            editEntry.originTime || "",
            editEntry.destinationDate || "",
            editEntry.destinationTime || ""
          );
          return computed === "0" ? "" : computed;
        })(),
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
        tachometerTotal: formatOptionalNumber2dp(
          editEntry.tachometerTotal,
          "0.00"
        ),
        hobbsMeterStart: editEntry.hobbsMeterStart?.toString() || "",
        hobbsMeterEnd: editEntry.hobbsMeterEnd?.toString() || "",
        hobbsMeterTotal: formatOptionalNumber2dp(
          editEntry.hobbsMeterTotal,
          "0.00"
        ),
        nextInspectionDue: editEntry.nextInspectionDue || "",
        tachTimeDue: editEntry.tachTimeDue?.toString() || "",
        ...(() => {
          const split = splitAtlRemarks(editEntry.remarks);
          return {
            pilotReport: split.pilotReport,
            maintenanceEntry: split.maintenanceEntry,
          };
        })(),
        remarksPerson: editEntry.maintenanceFk?.toString() || "",
        remarksPersonName: "",
        actionsTaken: editEntry.actionsTaken || "",
        actionsTakenPerson: editEntry.maintenanceFk?.toString() || "",
        actionsTakenPersonName: "",
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
        whiteAtlWebLink: editEntry.whiteAtlWebLink?.toString() || "",
        dfpWebLink: editEntry.dfpWebLink?.toString() || "",
        dateTimeReportedDate: reported.date,
        dateTimeReportedTime: reported.time,
        dateTimeReleasedDate: released.date,
        dateTimeReleasedTime: released.time
          ? zuluTimeToTimeInputValue(released.time) || released.time.slice(0, 5)
          : "",
        airframePrevTime: (editEntry as any).airframePrevTime?.toString() || "",
        airframeFlightTime:
          (editEntry as any).airframeFlightTime?.toString() || "",
        airframeTotalTime:
          (editEntry as any).airframeTotalTime?.toString() || "",
        airframeRunTime: comp.airframeRunTime,
        airframeAftt: comp.airframeAftt,
        enginePrevTime: (editEntry as any).enginePrevTime?.toString() || "",
        engineFlightTime: (editEntry as any).engineFlightTime?.toString() || "",
        engineTotalTime: (editEntry as any).engineTotalTime?.toString() || "",
        engineRunTime: comp.engineRunTime,
        engineTsn: comp.engineTsn,
        engineTso: comp.engineTso,
        engineTbo: comp.engineTbo,
        propellerPrevTime:
          (editEntry as any).propellerPrevTime?.toString() || "",
        propellerFlightTime:
          (editEntry as any).propellerFlightTime?.toString() || "",
        propellerTotalTime:
          (editEntry as any).propellerTotalTime?.toString() || "",
        propellerRunTime: comp.propellerRunTime,
        propellerTsn: comp.propellerTsn,
        propellerTso: comp.propellerTso,
        propellerTbo: comp.propellerTbo,
        lifeTimeLimitEngine: "",
        lifeTimeLimitPropeller: "",
      });

      // Resolve saved person IDs → formatted display labels (never show raw IDs)
      void (async () => {
        const resolveLabel = async (
          accountId?: number | null,
          nested?: AircraftTechnicalLog["maintenance"]
        ): Promise<{ label: string; account: Account | null }> => {
          if (nested) {
            const fromNested = resolveAccountNameLicenseDisplay(nested, "");
            if (fromNested) {
              return {
                label: fromNested,
                account: {
                  id: nested.id ?? accountId ?? 0,
                  firstName: nested.firstName ?? "",
                  lastName: nested.lastName ?? "",
                  middleName: nested.middleName ?? "",
                  username: "",
                  fullName: nested.fullName ?? fromNested,
                  email: "",
                  licenseNo: nested.licenseNo ?? "",
                  designation: "",
                  roleId: 0,
                  status: true,
                  createdAt: "",
                  lastLogin: "",
                },
              };
            }
          }
          if (accountId == null || !Number.isFinite(Number(accountId))) {
            return { label: "", account: null };
          }
          try {
            const account = await getAccount(Number(accountId));
            return {
              label: formatAccountNameLicense(
                account.fullName,
                account.licenseNo
              ),
              account,
            };
          } catch (err) {
            console.error("Could not resolve ATL person account:", err);
            return { label: "", account: null };
          }
        };

        const maintenanceFk = editEntry.maintenanceFk ?? null;
        const maintenanceResolved = await resolveLabel(
          maintenanceFk,
          editEntry.maintenance
        );
        const pilotResolved = await resolveLabel(
          editEntry.pilotFk ?? editEntry.pilotAcceptedBy ?? null
        );
        const rtsResolved = await resolveLabel(editEntry.rtsSignedBy ?? null);

        if (maintenanceResolved.account) {
          setRemarksAccounts((prev) => {
            if (prev.some((a) => a.id === maintenanceResolved.account!.id))
              return prev;
            return [maintenanceResolved.account!, ...prev];
          });
          setActionsTakenAccounts((prev) => {
            if (prev.some((a) => a.id === maintenanceResolved.account!.id))
              return prev;
            return [maintenanceResolved.account!, ...prev];
          });
        }
        if (pilotResolved.account) {
          setPilotAccounts((prev) => {
            if (prev.some((a) => a.id === pilotResolved.account!.id))
              return prev;
            return [pilotResolved.account!, ...prev];
          });
        }
        if (rtsResolved.account) {
          setRtsAccounts((prev) => {
            if (prev.some((a) => a.id === rtsResolved.account!.id)) return prev;
            return [rtsResolved.account!, ...prev];
          });
        }

        setFormData((prev) => ({
          ...prev,
          remarksPersonName: maintenanceResolved.label,
          actionsTakenPersonName: maintenanceResolved.label,
          pilotName: pilotResolved.label,
          rtsName: rtsResolved.label,
        }));
      })();

      if (editEntry.aircraftFk) {
        setSelectedAircraftId(editEntry.aircraftFk);
        void (async () => {
          try {
            const res = await getAircraftById(editEntry.aircraftFk!);
            const aircraftCamel = toCamel(res.data) as Aircraft;
            const aircraftFallback =
              buildAtlInitialValuesFromAircraftFallback(aircraftCamel);
            const gate = resolveAircraftProfileTsnGate(aircraftCamel);
            setEngineTsnEnabled(gate.engineTsnEnabled);
            setPropellerTsnEnabled(gate.propellerTsnEnabled);

            const enginePrev = gate.engineTsnEnabled
              ? engineTsnNum != null
                ? Math.max(0, engineTsnNum - run)
                : gate.engineTsnBaseline
              : null;
            const propellerPrev = gate.propellerTsnEnabled
              ? propellerTsnNum != null
                ? Math.max(0, propellerTsnNum - run)
                : gate.propellerTsnBaseline
              : null;
            setPreviousEngineTsn(enginePrev);
            setPreviousPropellerTsn(propellerPrev);

            setFormData((prev) => ({
              ...prev,
              lifeTimeLimitEngine: aircraftFallback.lifeTimeLimitEngine,
              lifeTimeLimitPropeller: aircraftFallback.lifeTimeLimitPropeller,
              engineTsn: gate.engineTsnEnabled ? prev.engineTsn : "",
              propellerTsn: gate.propellerTsnEnabled ? prev.propellerTsn : "",
              engineTbo:
                prev.engineTbo.trim() !== ""
                  ? prev.engineTbo
                  : resolveAtlPersistedOrComputedTbo(
                      editEntry,
                      "engineTbo",
                      aircraftFallback.lifeTimeLimitEngine,
                      prev.engineTso
                    ),
              propellerTbo:
                prev.propellerTbo.trim() !== ""
                  ? prev.propellerTbo
                  : resolveAtlPersistedOrComputedTbo(
                      editEntry,
                      "propellerTbo",
                      aircraftFallback.lifeTimeLimitPropeller,
                      prev.propellerTso
                    ),
            }));
            syncAtlAircraftLifeLimitsRef({
              engine: aircraftFallback.lifeTimeLimitEngine,
              propeller: aircraftFallback.lifeTimeLimitPropeller,
            });
          } catch (err) {
            console.error(
              "Could not load aircraft life limits for ATL edit:",
              err
            );
            setEngineTsnEnabled(false);
            setPropellerTsnEnabled(false);
            setPreviousEngineTsn(null);
            setPreviousPropellerTsn(null);
            setFormData((prev) => ({
              ...prev,
              engineTsn: "",
              propellerTsn: "",
            }));
          }
        })();
      } else {
        setEngineTsnEnabled(false);
        setPropellerTsnEnabled(false);
        setPreviousEngineTsn(null);
        setPreviousPropellerTsn(null);
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
            partRemovedRemainingTime: String(
              part.partRemovedRemainingTime ??
                part.part_removed_remaining_time ??
                ""
            ),
            installedPartNo:
              part.installedPartNo || part.installed_part_no || "",
            installedSerialNo:
              part.installedSerialNo || part.installed_serial_no || "",
            partInstalledRemainingTime: String(
              part.partInstalledRemainingTime ??
                part.part_installed_remaining_time ??
                ""
            ),
            ataChapter: part.ataChapter || part.ata_chapter || "",
            partRemark: part.partRemark || part.part_remark || "",
          }));
        setComponentRecords(componentRecordsData);
      } else {
        setComponentRecords([]);
      }

      queueMicrotask(() => {
        editAtlInitialHydrationRef.current = false;
      });
    } else if (!editEntry && isOpen) {
      editAtlInitialHydrationRef.current = false;
      preservedDateReportedRef.current = null;
      setIsFirstAtlCreate(false);
      setIsInitializing(true);
      atlAircraftLifeLimitsRef.current = { engine: "", propeller: "" };
      initialTechPubLinksRef.current = {
        whiteAtlWebLink: "",
        dfpWebLink: "",
      };
      // Reset form when creating new entry
      setPreviousAirframeAftt(0);
      setPreviousEngineTsn(null);
      setPreviousEngineTso(0);
      setPreviousPropellerTsn(null);
      setPreviousPropellerTso(0);
      setEngineTsnEnabled(false);
      setPropellerTsnEnabled(false);
      setFormData({
        seqNo: "",
        workStatus: "FOR_REVIEW",
        acReg: "",
        atlBatchFk:
          defaultAtlBatchFk != null &&
          Number.isFinite(defaultAtlBatchFk) &&
          defaultAtlBatchFk > 0
            ? String(defaultAtlBatchFk)
            : "",
        natureOfFlight: "TR",
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
        hobbsMeterStart: "",
        hobbsMeterEnd: "",
        hobbsMeterTotal: "",
        nextInspectionDue: "",
        tachTimeDue: "",
        pilotReport: "",
        maintenanceEntry: "",
        remarksPerson: "",
        remarksPersonName: "",
        actionsTaken: "",
        actionsTakenPerson: "",
        actionsTakenPersonName: "",
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
        whiteAtlWebLink: "",
        dfpWebLink: "",
        dateTimeReportedDate: "",
        dateTimeReportedTime: "",
        dateTimeReleasedDate: "",
        dateTimeReleasedTime: "",
        airframePrevTime: DEFAULT_ATL_PREV_TIME,
        airframeFlightTime: "",
        airframeTotalTime: "",
        airframeRunTime: "",
        airframeAftt: "",
        enginePrevTime: DEFAULT_ATL_PREV_TIME,
        engineFlightTime: "",
        engineTotalTime: "",
        engineRunTime: "",
        engineTsn: "",
        engineTso: "",
        engineTbo: "",
        propellerPrevTime: DEFAULT_ATL_PREV_TIME,
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
  }, [editEntry, isOpen, defaultAtlBatchFk]);

  // Previous ATL first (latest API); Aircraft Details only when none exists.
  const fetchLatestTechnicalLog = async (
    aircraftFk: number,
    batchFk?: number
  ) => {
    const requestId = ++atlInitRequestIdRef.current;
    const isAddEntry = !editEntry;
    if (isAddEntry) {
      setIsInitializing(true);
    }

    const finishInit = () => {
      if (atlInitRequestIdRef.current !== requestId) return;
      if (isAddEntry) {
        // Values + computed metrics are already assigned; unlock after paint.
        queueMicrotask(() => {
          if (atlInitRequestIdRef.current !== requestId) return;
          setIsInitializing(false);
        });
      }
    };

    try {
      // Latest ATL via getLatestAircraftTechnicalLog (batch scoped, then aircraft-wide).
      let latestEntry: AircraftTechnicalLog | null = null;
      if (batchFk != null && Number.isFinite(batchFk) && batchFk > 0) {
        latestEntry = await getLatestAircraftTechnicalLog(aircraftFk, batchFk);
      }
      if (!latestEntry) {
        latestEntry = await getLatestAircraftTechnicalLog(aircraftFk);
      }
      if (atlInitRequestIdRef.current !== requestId) return;

      // Create-only: Sequence No. = latest sequence_no + 1 (preserve digit width).
      const nextSeqNo = isAddEntry
        ? computeNextAtlSequenceNo(latestEntry?.sequenceNo)
        : "";
      if (isAddEntry) {
        setLatestSequenceNo(
          latestEntry?.sequenceNo != null &&
            String(latestEntry.sequenceNo).trim() !== ""
            ? String(latestEntry.sequenceNo).trim()
            : null
        );
      }

      const prevTimes = getPrevTimesFromLatestAtl(latestEntry);

      // Aircraft Profile TSN gates (GET /api/v1/aircraft/{id}) — independent of previous ATL.
      let tsnGate = resolveAircraftProfileTsnGate(null);
      let aircraftCamelForInit: Aircraft | null = null;
      try {
        const aircraftRes = await getAircraftById(aircraftFk);
        if (atlInitRequestIdRef.current !== requestId) return;
        aircraftCamelForInit = toCamel(aircraftRes.data) as Aircraft;
        tsnGate = resolveAircraftProfileTsnGate(aircraftCamelForInit);
      } catch (aircraftGateErr) {
        console.error(
          "Could not load aircraft profile for TSN gates:",
          aircraftGateErr
        );
      }
      setEngineTsnEnabled(tsnGate.engineTsnEnabled);
      setPropellerTsnEnabled(tsnGate.propellerTsnEnabled);

      if (latestEntry) {
        const lifeTimeLimitEngine = formatAtlLifeLimitFromPrevious(
          latestEntry.lifeTimeLimitEngine
        );
        const lifeTimeLimitPropeller = formatAtlLifeLimitFromPrevious(
          latestEntry.lifeTimeLimitPropeller
        );
        syncAtlAircraftLifeLimitsRef({
          engine: lifeTimeLimitEngine,
          propeller: lifeTimeLimitPropeller,
        });

        setIsFirstAtlCreate(false);
        const comp = resolveAtlEditComponentSources(latestEntry);
        const previousEngineTsnValue = resolvePreviousTsnForAtl(
          tsnGate.engineTsnEnabled,
          latestEntry.engineTsn,
          tsnGate.engineTsnBaseline
        );
        const previousEngineTsoValue = Number(latestEntry.engineTso) || 0;
        const previousPropellerTsnValue = resolvePreviousTsnForAtl(
          tsnGate.propellerTsnEnabled,
          latestEntry.propellerTsn,
          tsnGate.propellerTsnBaseline
        );
        const previousPropellerTsoValue = Number(latestEntry.propellerTso) || 0;
        const previousAirframeAfttValue =
          parseFloat(String(comp.airframeAftt)) || 0;

        if (!isAddEntry) {
          setLatestSequenceNo(latestEntry.sequenceNo ?? null);
        }
        setPreviousEngineTsn(previousEngineTsnValue);
        setPreviousEngineTso(previousEngineTsoValue);
        setPreviousPropellerTsn(previousPropellerTsnValue);
        setPreviousPropellerTso(previousPropellerTsoValue);
        setPreviousAirframeAftt(previousAirframeAfttValue);

        const hobbsStartFromPrevious =
          resolveHobbsMeterStartFromLatest(latestEntry);
        const tachStartFromPrevious =
          latestEntry.tachometerEnd != null && latestEntry.tachometerEnd !== 0
            ? latestEntry.tachometerEnd.toString()
            : "0";

        setFormData((prev) => {
          if (editEntry) {
            return {
              ...prev,
              ...prevTimes,
              lifeTimeLimitEngine:
                lifeTimeLimitEngine || prev.lifeTimeLimitEngine,
              lifeTimeLimitPropeller:
                lifeTimeLimitPropeller || prev.lifeTimeLimitPropeller,
              engineTsn: tsnGate.engineTsnEnabled ? prev.engineTsn : "",
              propellerTsn: tsnGate.propellerTsnEnabled
                ? prev.propellerTsn
                : "",
            };
          }

          // Add Entry: assign only from latest Previous ATL response (no stale form cache).
          const baseCtx: AtlComponentMetricsContext = {
            previousAirframeAftt: previousAirframeAfttValue,
            previousEngineTsn: previousEngineTsnValue,
            previousEngineTso: previousEngineTsoValue,
            previousPropellerTsn: previousPropellerTsnValue,
            previousPropellerTso: previousPropellerTsoValue,
            engineTsnEnabled: tsnGate.engineTsnEnabled,
            propellerTsnEnabled: tsnGate.propellerTsnEnabled,
          };
          let withBase = {
            ...prev,
            seqNo: nextSeqNo,
            ...prevTimes,
            // newATL.hobbsMeterStart = latestATL.hobbsMeterEnd (empty if missing)
            hobbsMeterStart: hobbsStartFromPrevious,
            // Fresh leg: user enters End; total recomputes via handleCalculationFieldChange
            hobbsMeterEnd: "",
            hobbsMeterTotal: "",
            tachometerStart: tachStartFromPrevious,
            airframeAftt: comp.airframeAftt,
            // Do not inherit TSN from previous ATL when Aircraft Profile TSN is empty.
            engineTsn: tsnGate.engineTsnEnabled ? comp.engineTsn : "",
            engineTso: comp.engineTso,
            engineTbo: comp.engineTbo,
            propellerTsn: tsnGate.propellerTsnEnabled ? comp.propellerTsn : "",
            propellerTso: comp.propellerTso,
            propellerTbo: comp.propellerTbo,
            lifeTimeLimitEngine,
            lifeTimeLimitPropeller,
          };
          // Create + PRF/PSF/VOID: keep End in sync with Start after aircraft init
          if (isZeroFlightMeterNature(prev.natureOfFlight)) {
            withBase = applyZeroFlightMeterEndsFromStarts(withBase);
          }
          const tachStart = parseFiniteFloatField(withBase.tachometerStart);
          const tachEnd = parseFiniteFloatField(withBase.tachometerEnd);
          const tachometerTotal =
            tachStart != null &&
            tachEnd != null &&
            Number.isFinite(tachEnd - tachStart)
              ? (tachEnd - tachStart).toFixed(2)
              : "0.00";
          return {
            ...withBase,
            ...applyAtlTachometerTotalUserChange(
              withBase,
              tachometerTotal,
              baseCtx,
              atlAircraftLifeLimitsRef.current
            ),
          };
        });
        finishInit();
        return;
      }

      // No previous ATL — initial values from Aircraft Details
      const aircraftFallback = buildAtlInitialValuesFromAircraftFallback(
        aircraftCamelForInit
      );
      if (atlInitRequestIdRef.current !== requestId) return;

      syncAtlAircraftLifeLimitsRef({
        engine: aircraftFallback.lifeTimeLimitEngine,
        propeller: aircraftFallback.lifeTimeLimitPropeller,
      });

      setLatestSequenceNo(null);
      setIsFirstAtlCreate(true);
      setPreviousAirframeAftt(aircraftFallback.previousAirframeAftt);
      setPreviousEngineTsn(
        tsnGate.engineTsnEnabled ? aircraftFallback.previousEngineTsn : null
      );
      setPreviousEngineTso(aircraftFallback.previousEngineTso);
      setPreviousPropellerTsn(
        tsnGate.propellerTsnEnabled
          ? aircraftFallback.previousPropellerTsn
          : null
      );
      setPreviousPropellerTso(aircraftFallback.previousPropellerTso);

      setFormData((prev) => {
        if (editEntry) {
          // Edit base refresh: keep persisted component metrics; only refresh prev times / life limits.
          return {
            ...prev,
            ...prevTimes,
            lifeTimeLimitEngine:
              aircraftFallback.lifeTimeLimitEngine || prev.lifeTimeLimitEngine,
            lifeTimeLimitPropeller:
              aircraftFallback.lifeTimeLimitPropeller ||
              prev.lifeTimeLimitPropeller,
            engineTsn: tsnGate.engineTsnEnabled ? prev.engineTsn : "",
            propellerTsn: tsnGate.propellerTsnEnabled
              ? prev.propellerTsn
              : "",
          };
        }

        const baseCtx: AtlComponentMetricsContext = {
          previousAirframeAftt: aircraftFallback.previousAirframeAftt,
          previousEngineTsn: tsnGate.engineTsnEnabled
            ? aircraftFallback.previousEngineTsn
            : null,
          previousEngineTso: aircraftFallback.previousEngineTso,
          previousPropellerTsn: tsnGate.propellerTsnEnabled
            ? aircraftFallback.previousPropellerTsn
            : null,
          previousPropellerTso: aircraftFallback.previousPropellerTso,
          engineTsnEnabled: tsnGate.engineTsnEnabled,
          propellerTsnEnabled: tsnGate.propellerTsnEnabled,
        };
        let withBase = {
          ...prev,
          seqNo: nextSeqNo,
          ...prevTimes,
          // No previous ATL / hobbsMeterEnd — leave Start empty for manual input
          hobbsMeterStart: "",
          hobbsMeterEnd: "",
          hobbsMeterTotal: "",
          tachometerStart: "0",
          airframeAftt: aircraftFallback.airframeAftt,
          engineTsn: tsnGate.engineTsnEnabled
            ? aircraftFallback.engineTsn
            : "",
          engineTso: aircraftFallback.engineTso,
          engineTbo: aircraftFallback.engineTbo,
          propellerTsn: tsnGate.propellerTsnEnabled
            ? aircraftFallback.propellerTsn
            : "",
          propellerTso: aircraftFallback.propellerTso,
          propellerTbo: aircraftFallback.propellerTbo,
          lifeTimeLimitEngine: aircraftFallback.lifeTimeLimitEngine,
          lifeTimeLimitPropeller: aircraftFallback.lifeTimeLimitPropeller,
        };
        if (isZeroFlightMeterNature(prev.natureOfFlight)) {
          withBase = applyZeroFlightMeterEndsFromStarts(withBase);
        }
        const tachStart = parseFiniteFloatField(withBase.tachometerStart);
        const tachEnd = parseFiniteFloatField(withBase.tachometerEnd);
        const tachometerTotal =
          tachStart != null &&
          tachEnd != null &&
          Number.isFinite(tachEnd - tachStart)
            ? (tachEnd - tachStart).toFixed(2)
            : "0.00";
        return {
          ...withBase,
          ...applyAtlTachometerTotalUserChange(
            withBase,
            tachometerTotal,
            baseCtx,
            atlAircraftLifeLimitsRef.current
          ),
        };
      });
      finishInit();
    } catch (error) {
      console.error("Error fetching latest technical log:", error);
      setIsFirstAtlCreate(false);
      if (isAddEntry) {
        // Avoid NaN / stale sequence on API failure; leave empty until retry.
        setLatestSequenceNo(null);
        setFormData((prev) => ({ ...prev, seqNo: "" }));
      }
      finishInit();
    }
  };

  useEffect(() => {
    if (!isOpen || editEntry) return;
    if (!selectedAircraftId) {
      // Operation: keep locked while aircraftId auto-select is pending.
      // Technical Logbook: unlock so the user can pick A/C Registration.
      setIsInitializing(Boolean(aircraftId));
      return;
    }
    const batchId = parseAtlBatchFkForLatest(formData.atlBatchFk);
    void fetchLatestTechnicalLog(selectedAircraftId, batchId);
  }, [isOpen, editEntry, selectedAircraftId, formData.atlBatchFk, aircraftId]);

  useEffect(() => {
    if (!isOpen || !editEntry || !selectedAircraftId) return;
    if (editAtlInitialHydrationRef.current) return;
    if (skipInitialEditBaseRefreshRef.current) {
      skipInitialEditBaseRefreshRef.current = false;
      return;
    }
    const batchId = parseAtlBatchFkForLatest(formData.atlBatchFk);
    void fetchLatestTechnicalLog(selectedAircraftId, batchId);
  }, [isOpen, editEntry, selectedAircraftId, formData.atlBatchFk]);

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
        const batchId = parseAtlBatchFkForLatest(formData.atlBatchFk);
        const previousAtl = await resolvePreviousAtlForNewEntry(id, batchId);
        if (previousAtl == null) {
          const res = await getAircraftById(id);
          const aircraftCamel = toCamel(res.data) as Aircraft;
          const missing = getMissingAircraftFieldsForNewAtlWhenNoPrevious(
            previousAtl,
            aircraftCamel
          );
          if (missing.length > 0) {
            await Swal.fire({
              icon: "warning",
              title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
              html: buildAircraftDetailsRequiredForAtlHtml(aircraftCamel),
              confirmButtonColor: "#2563eb",
            });
            return;
          }
        }
      } catch (err) {
        console.error("Could not verify aircraft for ATL:", err);
        await Swal.fire({
          icon: "error",
          title: "Validation error",
          text: "Could not load previous ATL or aircraft information. Please try again.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
    }

    setFormData({ ...formData, acReg: registration });
    setSelectedAircraftId(id);
    setAircraftSearchTerm("");
    setIsAircraftDropdownOpen(false);
    const batchId = parseAtlBatchFkForLatest(formData.atlBatchFk);
    void fetchLatestTechnicalLog(id, batchId);
    // Clear validation error when aircraft is selected
    if (validationErrors.acReg) {
      setValidationErrors({ ...validationErrors, acReg: "" });
    }
  };

  const handleAtlBatchFkChange = (value: string) => {
    setFormData((prev) => ({ ...prev, atlBatchFk: value }));
    if (!selectedAircraftId || editAtlInitialHydrationRef.current) return;
    const batchId = parseAtlBatchFkForLatest(value);
    void fetchLatestTechnicalLog(selectedAircraftId, batchId);
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

  // Handle remarks person select — store ID for API; keep formatted label for display
  const handleRemarksPersonSelect = (
    accountId: string,
    displayValue: string
  ) => {
    setFormData({
      ...formData,
      remarksPerson: accountId,
      remarksPersonName: displayValue,
    });
    setRemarksSearchTerm("");
    setIsRemarksDropdownOpen(false);
  };

  // Handle actions taken person select
  const handleActionsTakenPersonSelect = (
    accountId: string,
    displayValue: string
  ) => {
    setFormData({
      ...formData,
      actionsTakenPerson: accountId,
      actionsTakenPersonName: displayValue,
    });
    setActionsTakenSearchTerm("");
    setIsActionsTakenDropdownOpen(false);
  };

  // Get selected account display value (never show raw ID / null / undefined)
  const getSelectedRemarksPerson = () => {
    if (!formData.remarksPerson) return "";
    if (formData.remarksPersonName?.trim()) {
      return formData.remarksPersonName.trim();
    }
    const account = remarksAccounts.find(
      (acc) => acc.id.toString() === formData.remarksPerson
    );
    return account
      ? formatAccountNameLicense(account.fullName, account.licenseNo)
      : "";
  };

  const getSelectedActionsTakenPerson = () => {
    if (!formData.actionsTakenPerson) return "";
    if (formData.actionsTakenPersonName?.trim()) {
      return formData.actionsTakenPersonName.trim();
    }
    const account = actionsTakenAccounts.find(
      (acc) => acc.id.toString() === formData.actionsTakenPerson
    );
    return account
      ? formatAccountNameLicense(account.fullName, account.licenseNo)
      : "";
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
    // If pilotName is set, use it (it's set when pilot is selected / resolved on edit)
    if (formData.pilotName?.trim()) return formData.pilotName.trim();
    // Otherwise try to find in accounts list
    if (formData.pilotFk && pilotAccounts.length > 0) {
      const account = pilotAccounts.find(
        (acc) => acc.id.toString() === formData.pilotFk
      );
      if (account)
        return formatAccountNameLicense(account.fullName, account.licenseNo);
    }
    return "";
  };

  // Filter pilot accounts based on search term
  const filteredPilotAccounts = pilotAccounts.filter((account) =>
    formatAccountNameLicense(account.fullName, account.licenseNo)
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
    // If rtsName is set, use it (it's set when RTS is selected / resolved on edit)
    if (formData.rtsName?.trim()) return formData.rtsName.trim();
    // Otherwise try to find in accounts list
    if (formData.rtsSignedBy && rtsAccounts.length > 0) {
      const account = rtsAccounts.find(
        (acc) => acc.id.toString() === formData.rtsSignedBy
      );
      if (account)
        return formatAccountNameLicense(account.fullName, account.licenseNo);
    }
    return "";
  };

  // Filter RTS accounts based on search term
  const filteredRtsAccounts = rtsAccounts.filter((account) =>
    formatAccountNameLicense(account.fullName, account.licenseNo)
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
  // Hobbs / tachometer / component metrics: reactive via handleCalculationFieldChange —
  // never recompute during edit API hydration (editAtlInitialHydrationRef).
  const atlComponentMetricsCtx = useMemo<AtlComponentMetricsContext>(
    () => ({
      previousAirframeAftt,
      previousEngineTsn,
      previousEngineTso,
      previousPropellerTsn,
      previousPropellerTso,
      engineTsnEnabled,
      propellerTsnEnabled,
    }),
    [
      previousAirframeAftt,
      previousEngineTsn,
      previousEngineTso,
      previousPropellerTsn,
      previousPropellerTso,
      engineTsnEnabled,
      propellerTsnEnabled,
    ]
  );

  const atlComponentMetricsCtxRef = useRef(atlComponentMetricsCtx);
  atlComponentMetricsCtxRef.current = atlComponentMetricsCtx;

  // Create: when previous-entry baselines change, refresh AFTT/TSN/TSO/TBO from current runtimes.
  // Edit: skipped — persisted values must remain until the user edits a computation field.
  useEffect(() => {
    if (!isOpen || isEditEntry || isInitializing) return;
    if (editAtlInitialHydrationRef.current) return;

    setFormData((prev) =>
      recomputeAtlComponentTableFields(
        prev,
        "tachometerRuntime",
        atlComponentMetricsCtxRef.current,
        atlAircraftLifeLimitsRef.current
      )
    );
  }, [
    isOpen,
    isEditEntry,
    isInitializing,
    previousAirframeAftt,
    previousEngineTsn,
    previousEngineTso,
    previousPropellerTsn,
    previousPropellerTso,
    engineTsnEnabled,
    propellerTsnEnabled,
  ]);

  /**
   * Central field change → recompute Airframe / Engine / Propeller table fields
   * in one functional setFormData call (avoids stale state).
   *
   * Overloads:
   * - handleCalculationFieldChange(event, tableField)
   * - handleCalculationFieldChange(meterOrBlocksField, value)
   */
  const handleCalculationFieldChange = (
    eventOrField: ChangeEvent<HTMLInputElement> | AtlCalculationField,
    fieldOrValue?: AtlTableCalculationField | string
  ) => {
    if (editAtlInitialHydrationRef.current) return;

    const field: AtlCalculationField =
      typeof eventOrField === "string"
        ? eventOrField
        : (fieldOrValue as AtlCalculationField);
    const value =
      typeof eventOrField === "string"
        ? String(fieldOrValue ?? "")
        : eventOrField.target.value;

    setFormData((prev) => {
      let next = {
        ...prev,
        [field]: value,
      };

      // Create + PRF/PSF/VOID: keep End synchronized when Start changes
      if (
        !editEntry &&
        isZeroFlightMeterNature(prev.natureOfFlight) &&
        (field === "tachometerStart" || field === "hobbsMeterStart")
      ) {
        if (field === "tachometerStart") {
          next = { ...next, tachometerEnd: value };
        } else {
          next = { ...next, hobbsMeterEnd: value };
        }
      }

      const ctx = atlComponentMetricsCtxRef.current;
      const lifeLimits = atlAircraftLifeLimitsRef.current;

      // Tachometer → Run Time → Total / AFTT / TSN / TSO → TBO
      if (field === "tachometerStart" || field === "tachometerEnd") {
        const start = parseFiniteFloatField(next.tachometerStart);
        const end = parseFiniteFloatField(next.tachometerEnd);
        const runTime =
          start != null && end != null ? Math.max(0, end - start) : 0;
        const runTime1 = formatAtlCalcTime(runTime);
        const runTime2 = formatAtlCalcTime2dp(runTime);
        next = {
          ...next,
          tachometerTotal: runTime2,
          airframeRunTime: runTime1,
          engineRunTime: runTime1,
          propellerRunTime: runTime1,
          airframeFlightTime: runTime2,
          engineFlightTime: runTime2,
          propellerFlightTime: runTime2,
        };
        return recomputeAtlComponentTableFields(
          next,
          "tachometerRuntime",
          ctx,
          lifeLimits
        );
      }

      // Prev Time / AFTT / TSN / TSO → full table recompute
      if (isAtlTableCalculationField(field)) {
        return recomputeAtlComponentTableFields(
          next,
          field,
          ctx,
          lifeLimits
        );
      }

      // Blocks / Hobbs (and other meter fields)
      const changedFields: AtlCalculationField[] = [field];
      if (
        !editEntry &&
        isZeroFlightMeterNature(prev.natureOfFlight) &&
        field === "hobbsMeterStart"
      ) {
        changedFields.push("hobbsMeterEnd");
      }

      const recalculated = recomputeAllAffectedFields(
        next,
        changedFields,
        ctx,
        lifeLimits
      );

      if (
        !editEntry &&
        isZeroFlightMeterNature(prev.natureOfFlight) &&
        field === "hobbsMeterStart"
      ) {
        const hobbsStart = parseFiniteFloatField(next.hobbsMeterStart);
        const hobbsEnd = parseFiniteFloatField(next.hobbsMeterEnd);
        return {
          ...next,
          ...recalculated,
          hobbsMeterTotal:
            hobbsStart != null && hobbsEnd != null
              ? (hobbsEnd - hobbsStart).toFixed(2)
              : "0.00",
        };
      }

      return {
        ...next,
        ...recalculated,
      };
    });
  };

  /**
   * Create-only Nature of Flight change:
   * - PRF / PSF / VOID → End = Start (totals 0)
   * - Any other value → clear End fields back to blank
   */
  const handleNatureOfFlightChange = (natureOfFlight: string) => {
    if (editEntry) {
      setFormData((prev) => ({ ...prev, natureOfFlight }));
      return;
    }
    if (editAtlInitialHydrationRef.current) {
      setFormData((prev) => ({ ...prev, natureOfFlight }));
      return;
    }

    setFormData((prev) => {
      const isZeroNature = isZeroFlightMeterNature(natureOfFlight);
      const ctx = atlComponentMetricsCtxRef.current;
      const lifeLimits = atlAircraftLifeLimitsRef.current;

      let next = isZeroNature
        ? applyZeroFlightMeterEndsFromStarts({
            ...prev,
            natureOfFlight,
          })
        : {
            ...prev,
            natureOfFlight,
            tachometerEnd: "",
            hobbsMeterEnd: "",
            hobbsMeterTotal: "",
          };

      const start = parseFiniteFloatField(next.tachometerStart);
      const end = parseFiniteFloatField(next.tachometerEnd);
      const runTime =
        start != null && end != null ? Math.max(0, end - start) : 0;
      const runTime1 = formatAtlCalcTime(runTime);
      const runTime2 = formatAtlCalcTime2dp(runTime);

      next = {
        ...next,
        tachometerTotal: runTime2,
        airframeRunTime: runTime1,
        engineRunTime: runTime1,
        propellerRunTime: runTime1,
        airframeFlightTime: runTime2,
        engineFlightTime: runTime2,
        propellerFlightTime: runTime2,
      };

      const withTable = recomputeAtlComponentTableFields(
        next,
        "tachometerRuntime",
        ctx,
        lifeLimits
      );

      if (!isZeroNature) {
        return {
          ...withTable,
          tachometerEnd: "",
          hobbsMeterEnd: "",
          hobbsMeterTotal: "",
        };
      }

      const hobbsStart = parseFiniteFloatField(next.hobbsMeterStart);
      const hobbsEnd = parseFiniteFloatField(next.hobbsMeterEnd);
      return {
        ...withTable,
        hobbsMeterTotal:
          hobbsStart != null && hobbsEnd != null
            ? (hobbsEnd - hobbsStart).toFixed(2)
            : "0.00",
      };
    });
  };

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

    // Off-Blocks / Origin and On-Blocks / Destination Zulu Time: optional; strict HH:mm UTC when set
    const offBlocksZuluErr = validateOptionalZuluTime(formData.offBlocksTime);
    if (offBlocksZuluErr) errors.offBlocksTime = offBlocksZuluErr;

    const onBlocksZuluErr = validateOptionalZuluTime(formData.onBlocksTime);
    if (onBlocksZuluErr) errors.onBlocksTime = onBlocksZuluErr;

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

    const optionalTsn = (v: string | undefined, key: string) => {
      const t = (v ?? "").trim();
      // Empty / display-only UNK — skip numeric validation
      if (t === "" || t.toUpperCase() === "UNK") return;
      const n = parseFloat(t);
      if (!Number.isFinite(n)) {
        errors[key] = "Must be a valid number";
        return;
      }
    };
    optionalTsn(formData.engineTsn, "engineTsn");
    optionalTsn(formData.propellerTsn, "propellerTsn");

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (atlFormReadOnly) {
      return;
    }

    if (
      editEntry &&
      !canEditAtlFields(atlRoleForWorkStatus, editEntry.workStatus) &&
      !attachmentsOnlyLocked
    ) {
      await Swal.fire({
        icon: "error",
        title: "Edit not allowed",
        text: getAtlEditDeniedMessage(
          atlRoleForWorkStatus,
          editEntry.workStatus
        ),
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    if (attachmentsOnlyLocked) {
      if (!techPubCanSubmitAttachmentsOnlyEdit) {
        return;
      }
      const dateReportedAlreadySet = hasAtlDateReportedValue(
        formData.dateTimeReportedDate,
        formData.dateTimeReportedTime,
        preservedDateReportedRef.current ?? editEntry?.dateTimeReported
      );
      if (
        !dateReportedAlreadySet &&
        !hasTechPubAttachmentOrLinkUpdate(
          formData,
          initialTechPubLinksRef.current
        )
      ) {
        await Swal.fire({
          title: "Update required",
          text: "Please provide at least one attachment or link before updating.",
          icon: "warning",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
      setValidationErrors({});
    } else {
      const validationResult = validateForm();
      if (!validationResult.isValid) {
        return;
      }
    }

    // Before creating ATL with no previous record: require Aircraft Details fields.
    // Edits and creates that already have a previous ATL skip this Aircraft Details gate.
    const aid = aircraftId ?? selectedAircraftId ?? null;
    if (aid != null && !attachmentsOnlyLocked && !editEntry) {
      try {
        const batchId = parseAtlBatchFkForLatest(formData.atlBatchFk);
        const previousAtl = await resolvePreviousAtlForNewEntry(aid, batchId);
        if (previousAtl == null) {
          const res = await getAircraftById(aid);
          const aircraftCamel = toCamel(res.data) as Aircraft;
          const missing = getMissingAircraftFieldsForNewAtlWhenNoPrevious(
            previousAtl,
            aircraftCamel
          );
          if (missing.length > 0) {
            await Swal.fire({
              icon: "warning",
              title: ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE,
              html: buildAircraftDetailsRequiredForAtlHtml(aircraftCamel),
              confirmButtonColor: "#2563eb",
            });
            return;
          }
        }
      } catch (err) {
        console.error("Failed to validate aircraft prerequisites:", err);
        await Swal.fire({
          icon: "error",
          title: "Validation error",
          text: "Could not load previous ATL or aircraft information. Please try again.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
    }

    const isUpdate = Boolean(editEntry);
    const aircraftFkValue = aircraftId ?? selectedAircraftId;
    if (
      !editEntry &&
      (aircraftFkValue == null || aircraftFkValue === undefined)
    ) {
      await Swal.fire({
        icon: "error",
        title: "Aircraft required",
        text: "Please select an aircraft (A/C Registration) before creating an entry.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await confirmSaveEntry(isUpdate, async () => {
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
        let reportedDate = formData.dateTimeReportedDate;
        let reportedTime = formData.dateTimeReportedTime;
        const dateReportedAlreadySet = hasAtlDateReportedValue(
          reportedDate,
          reportedTime,
          preservedDateReportedRef.current ?? editEntry?.dateTimeReported
        );
        if (
          !dateReportedAlreadySet &&
          isTechPubRole &&
          (hasTechPubAttachmentOrLinkUpdate(
            formData,
            initialTechPubLinksRef.current
          ) ||
            formData.whiteAtl instanceof File ||
            formData.dfp instanceof File)
        ) {
          const now = getManilaDateTimeParts();
          reportedDate = now.date;
          reportedTime = now.time;
          setFormData((prev) => ({
            ...prev,
            dateTimeReportedDate: now.date,
            dateTimeReportedTime: now.time,
          }));
        }

        const buildDateTimeForApi = (
          dateStr: string,
          timeStr: string
        ): string | undefined => {
          const d = (dateStr ?? "").trim();
          const t = (timeStr ?? "").trim();
          if (!d) return undefined;
          if (!t) return `${d}T00:00:00`;
          const apiT = convertTimeToAPIFormat(t);
          if (!apiT) return `${d}T00:00:00`;
          const parts = apiT.split(":");
          if (parts.length >= 3) {
            const h0 = parts[0].padStart(2, "0");
            const m0 = parts[1].padStart(2, "0");
            const s0 = (parts[2] || "00").replace(/\D/g, "").slice(0, 2);
            return `${d}T${h0}:${m0}:${s0.padStart(2, "0")}`;
          }
          return `${d}T${parts[0].padStart(2, "0")}:${parts[1].padStart(
            2,
            "0"
          )}:00`;
        };

        const apiDataCamel: any = {
          aircraftFk: aircraftFkValue!,
          sequenceNo: formData.seqNo.trim(),
          // Blank/empty -> TR on create; "VOID" stays VOID
          natureOfFlight:
            formData.natureOfFlight === "VOID"
              ? "VOID"
              : formData.natureOfFlight?.trim() || "TR",
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
            formData.hobbsMeterEnd === "" ||
            formData.hobbsMeterEnd === undefined
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
            formData.tachometerEnd === "" ||
            formData.tachometerEnd === undefined
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
          airframeRunTime: editEntry
            ? parseFiniteFloatField(formData.airframeRunTime) ?? 0
            : resolveAtlCreateRuntimeForPayload(
                formData.airframeRunTime,
                formData.tachometerTotal
              ),
          airframeAftt: editEntry
            ? parseFiniteFloatField(formData.airframeAftt) ?? 0
            : parseFiniteFloatField(formData.airframeAftt) ?? undefined,
          engineRunTime: editEntry
            ? parseFiniteFloatField(formData.engineRunTime) ?? 0
            : resolveAtlCreateRuntimeForPayload(
                formData.engineRunTime,
                formData.tachometerTotal
              ),
          engineTsn: engineTsnEnabled
            ? resolveTsnForApi(formData.engineTsn)
            : null,
          engineTso: editEntry
            ? parseFiniteFloatField(formData.engineTso) ?? 0
            : parseFiniteFloatField(formData.engineTso) ?? undefined,
          engineTbo: editEntry
            ? parseFiniteFloatField(formData.engineTbo) ?? 0
            : parseFiniteFloatField(formData.engineTbo) ?? undefined,
          propellerRunTime: editEntry
            ? parseFiniteFloatField(formData.propellerRunTime) ?? 0
            : resolveAtlCreateRuntimeForPayload(
                formData.propellerRunTime,
                formData.tachometerTotal
              ),
          propellerTsn: propellerTsnEnabled
            ? resolveTsnForApi(formData.propellerTsn)
            : null,
          propellerTso: editEntry
            ? parseFiniteFloatField(formData.propellerTso) ?? 0
            : parseFiniteFloatField(formData.propellerTso) ?? undefined,
          propellerTbo: editEntry
            ? parseFiniteFloatField(formData.propellerTbo) ?? 0
            : parseFiniteFloatField(formData.propellerTbo) ?? undefined,
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
          remarks: combineAtlRemarks(
            formData.pilotReport,
            formData.maintenanceEntry
          ),
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
          dateTimeReported: buildDateTimeForApi(reportedDate, reportedTime),
          dateTimeReleased: buildDateTimeForApi(
            formData.dateTimeReleasedDate,
            formData.dateTimeReleasedTime
          ),
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
          ...(canEditWhiteAtlDfpSection
            ? attachmentsOnlyLocked && editEntry
              ? {
                  whiteAtlWebLink: formData.whiteAtlWebLink?.trim() || null,
                  dfpWebLink: formData.dfpWebLink?.trim() || null,
                }
              : {
                  ...(formData.whiteAtlWebLink?.trim()
                    ? { whiteAtlWebLink: formData.whiteAtlWebLink.trim() }
                    : {}),
                  ...(formData.dfpWebLink?.trim()
                    ? { dfpWebLink: formData.dfpWebLink.trim() }
                    : {}),
                }
            : {}),
          componentParts: componentRecords.map((record) => ({
            qty: parseFloat(record.qty) || 0,
            unit: record.unit,
            nomenclature: record.nomenclature,
            removedPartNo: record.removedPartNo || undefined,
            removedSerialNo: record.removedSerialNo || undefined,
            partRemovedRemainingTime:
              record.partRemovedRemainingTime?.trim() || undefined,
            installedPartNo: record.installedPartNo || undefined,
            installedSerialNo: record.installedSerialNo || undefined,
            partInstalledRemainingTime:
              record.partInstalledRemainingTime?.trim() || undefined,
            ataChapter: record.ataChapter || undefined,
            partRemark: record.partRemark?.trim() || undefined,
          })),
          // Fleet Time Monitoring: on update send work_status from form (connected to update API); on create overwritten to FOR_REVIEW below
          workStatus: formData.workStatus || undefined,
          ...(() => {
            const raw = formData.atlBatchFk?.trim() ?? "";
            if (raw === "") {
              return editEntry ? { atlBatchFk: null } : {};
            }
            const n = parseInt(raw, 10);
            if (Number.isFinite(n) && n > 0) return { atlBatchFk: n };
            return editEntry ? { atlBatchFk: null } : {};
          })(),
        };

        // Fleet Time Monitoring: on create only, default work_status FOR_REVIEW (API enum name); on update workStatus is already in apiDataCamel from form
        if (!editEntry) {
          apiDataCamel.workStatus = "FOR_REVIEW";
          if (createdByAccountId != null)
            apiDataCamel.createdBy = createdByAccountId;
        }

        // Technical Publication: AWAITING_ATTACHMENT → PENDING on successful update.
        if (
          editEntry &&
          attachmentsOnlyLocked &&
          canUploadAtlInCurrentMode &&
          normalizeAtlWorkStatus(editEntry.workStatus) === "AWAITING_ATTACHMENT"
        ) {
          apiDataCamel.workStatus = "PENDING";
        }

        // Convert camelCase to snake_case before sending to API
        const apiDataSnake = snakeAllKeys(apiDataCamel);

        // Edit: always send persisted component metrics exactly as shown in formData.
        if (editEntry) {
          applyAtlEditComponentMetricsPayload(apiDataSnake, formData, {
            engineTsnEnabled,
            propellerTsnEnabled,
          });
        }

        const files =
          canUploadAtlInCurrentMode &&
          (formData.whiteAtl instanceof File || formData.dfp instanceof File)
            ? {
                whiteAtl:
                  formData.whiteAtl instanceof File ? formData.whiteAtl : null,
                dfp: formData.dfp instanceof File ? formData.dfp : null,
              }
            : undefined;

        if (editEntry) {
          // Update existing entry
          await updateAircraftTechnicalLog(
            editEntry.id,
            apiDataSnake as AircraftTechnicalLogUpdate,
            files
          );

          if (onSuccess) {
            await onSuccess();
          }

          onClose();
          return;
        }

        await createAircraftTechnicalLog(apiDataSnake, files);

        if (onSuccess) {
          await onSuccess();
        }

        // Reset form
        setFormData({
          seqNo: "",
          workStatus: "FOR_REVIEW",
          acReg: "",
          atlBatchFk: "",
          natureOfFlight: "TR",
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
          hobbsMeterStart: "",
          hobbsMeterEnd: "",
          hobbsMeterTotal: "",
          nextInspectionDue: "",
          tachTimeDue: "",
          pilotReport: "",
          maintenanceEntry: "",
          remarksPerson: "",
          remarksPersonName: "",
          actionsTaken: "",
          actionsTakenPerson: "",
          actionsTakenPersonName: "",
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
          whiteAtlWebLink: "",
          dfpWebLink: "",
          dateTimeReportedDate: "",
          dateTimeReportedTime: "",
          dateTimeReleasedDate: "",
          dateTimeReleasedTime: "",
          airframePrevTime: DEFAULT_ATL_PREV_TIME,
          airframeFlightTime: "",
          airframeTotalTime: "",
          airframeRunTime: "",
          airframeAftt: "",
          enginePrevTime: DEFAULT_ATL_PREV_TIME,
          engineFlightTime: "",
          engineTotalTime: "",
          engineRunTime: "",
          engineTsn: "",
          engineTso: "",
          engineTbo: "",
          propellerPrevTime: DEFAULT_ATL_PREV_TIME,
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

        onClose();
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (
    field: "pilotSignature" | "mechanicSignature" | "whiteAtl" | "dfp",
    file: File | null
  ) => {
    if (forceReadOnly) return;
    if (
      (field === "whiteAtl" || field === "dfp") &&
      !canUploadAtlInCurrentMode
    ) {
      return;
    }
    setFormData((prev) => {
      let next: typeof prev = { ...prev, [field]: file };
      if (
        (field === "whiteAtl" || field === "dfp") &&
        file instanceof File &&
        isTechPubRole &&
        !hasAtlDateReportedValue(
          next.dateTimeReportedDate,
          next.dateTimeReportedTime,
          preservedDateReportedRef.current ?? editEntry?.dateTimeReported
        )
      ) {
        const now = getManilaDateTimeParts();
        next = {
          ...next,
          dateTimeReportedDate: now.date,
          dateTimeReportedTime: now.time,
        };
      }
      if (
        attachmentsOnlyLocked &&
        editEntry &&
        normalizeAtlWorkStatus(editEntry.workStatus) ===
          "AWAITING_ATTACHMENT" &&
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
    if (forceReadOnly || !canUploadAtlInCurrentMode) return;
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
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, filePath);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        displayName || filePath.trim().split("/").pop() || "download";
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
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, filePath);
      const url = window.URL.createObjectURL(blob);
      const serverType =
        blob.type || (blob as Blob & { type?: string }).type || null;
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

  const existingWhiteAtlFilePath = getAtlStoredUploadFilePath(
    editEntry?.whiteAtl
  );
  const existingDfpFilePath = getAtlStoredUploadFilePath(editEntry?.dfp);

  const whiteAtlUploadLabel = (() => {
    if (whiteAtlFileName) return formatShortDisplayFileName(whiteAtlFileName);
    if (existingWhiteAtlFilePath) {
      return formatShortDisplayFileName(existingWhiteAtlFilePath);
    }
    return canUploadAtlInCurrentMode ? "Choose file or N/A" : "N/A";
  })();

  const dfpUploadLabel = (() => {
    if (dfpFileName) return formatShortDisplayFileName(dfpFileName);
    if (existingDfpFilePath) {
      return formatShortDisplayFileName(existingDfpFilePath);
    }
    return canUploadAtlInCurrentMode ? "Choose file or N/A" : "N/A";
  })();

  const closeFileViewModal = () => {
    if (fileViewBlobUrl) window.URL.revokeObjectURL(fileViewBlobUrl);
    setShowFileViewModal(false);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setFileViewError(null);
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
      partRemovedRemainingTime: "",
      installedPartNo: "",
      installedSerialNo: "",
      partInstalledRemainingTime: "",
      ataChapter: "",
      partRemark: "",
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
        {/* Add Entry: Previous ATL / Aircraft Details initialization */}
        {!editEntry && isInitializing && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-gray-700">
                Loading previous ATL…
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="relative z-[60] flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            {editEntry
              ? atlFormReadOnly
                ? "View Entry"
                : "Edit Entry"
              : "Add New Entry"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {atlFormReadOnly && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {forceReadOnly
                  ? "View only — fields cannot be edited."
                  : editEntry &&
                      isAtlCompletedWorkStatus(editEntry.workStatus) &&
                      !isAdminRole(atlRoleForWorkStatus)
                    ? "This entry is completed. Only Admin may update fields."
                    : "This entry is read-only for your role at the current work status."}
              </p>
            )}
            <div
              className={`space-y-6 ${
                mainFormLocked
                  ? "pointer-events-none select-none opacity-[0.92]"
                  : ""
              }`}
              {...(mainFormLocked ? ({ inert: true } as object) : {})}
            >
              {/* Sequence No. | Work Status | ATL batch (one row); A/C Registration below when picking aircraft */}
              <div className="space-y-4">
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    showAtlBatchFormField ? "md:grid-cols-3" : "md:grid-cols-2"
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
                          setValidationErrors({
                            ...validationErrors,
                            seqNo: "",
                          });
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
                  <div className="pointer-events-auto opacity-100">
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Work Status
                    </label>
                    {editEntry ? (
                      canChangeWorkStatusOnEdit ? (
                        <select
                          value={formData.workStatus}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              workStatus: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                          aria-label="Work status"
                        >
                          {workStatusDropdownKeys.map((key) => (
                            <option key={key} value={key}>
                              {formatAtlWorkStatusLabel(key)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-900"
                          title={
                            workStatusChangeLocked
                              ? "Work status cannot be changed for your role at this status"
                              : mainFormLocked
                              ? "Work status is read-only for your role at this status"
                              : undefined
                          }
                          aria-label={`Work status: ${displayWorkStatusLabel}`}
                        >
                          {displayWorkStatusLabel}
                        </div>
                      )
                    ) : (
                      <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                        FOR REVIEW
                      </div>
                    )}
                  </div>
                  {showAtlBatchFormField && (
                    <div>
                      <label className="block text-gray-700 text-sm mb-1.5">
                        ATL batch
                      </label>
                      <select
                        value={formData.atlBatchFk}
                        onChange={(e) => handleAtlBatchFkChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                        aria-label="ATL batch"
                      >
                        {atlBatchOptions.map((b) => (
                          <option key={b.id} value={String(b.id)}>
                            {b.name}
                          </option>
                        ))}
                      </select>
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
                                    {formData.acReg ===
                                      aircraft.registration && (
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
                      handleNatureOfFlightChange(e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                  >
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
                        <DateInput
                          value={formData.offBlocksDate}
                          onChange={(offBlocksDate) => {
                            handleCalculationFieldChange(
                              "offBlocksDate",
                              offBlocksDate
                            );
                            if (validationErrors.offBlocksDate) {
                              setValidationErrors({
                                ...validationErrors,
                                offBlocksDate: "",
                              });
                            }
                          }}
                          aria-invalid={!!validationErrors.offBlocksDate}
                          inputClassName={`rounded-lg text-sm bg-white text-gray-900 ${
                            validationErrors.offBlocksDate
                              ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                              : "border-gray-300"
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
                            inputMode="numeric"
                            autoComplete="off"
                            value={formData.offBlocksTime}
                            onChange={(e) => {
                              handleCalculationFieldChange(
                                "offBlocksTime",
                                formatZuluTimeKeyboardInput(e.target.value)
                              );
                              if (validationErrors.offBlocksTime) {
                                setValidationErrors({
                                  ...validationErrors,
                                  offBlocksTime: "",
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const normalized = normalizeOptionalZuluTimeInput(
                                e.target.value
                              );
                              handleCalculationFieldChange(
                                "offBlocksTime",
                                normalized
                              );
                              const err = validateOptionalZuluTime(normalized);
                              setValidationErrors((prev) => ({
                                ...prev,
                                offBlocksTime: err ?? "",
                              }));
                            }}
                            maxLength={5}
                            title="HH:mm (UTC)"
                            placeholder="HH:mm"
                            pattern="[0-9]{2}:[0-9]{2}"
                            aria-invalid={!!validationErrors.offBlocksTime}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 bg-white text-gray-900 font-mono ${
                              validationErrors.offBlocksTime
                                ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                                : "border-gray-300 focus:ring-gray-400 focus:border-gray-400"
                            }`}
                          />
                          {!validationErrors.offBlocksTime ? (
                            <p className="text-xs text-gray-500 mt-1">
                              24-hour HH:mm (UTC), 00:00–23:59
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-red-600">
                              {validationErrors.offBlocksTime}
                            </p>
                          )}
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
                        <DateInput
                          value={formData.onBlocksDate}
                          onChange={(onBlocksDate) =>
                            handleCalculationFieldChange(
                              "onBlocksDate",
                              onBlocksDate
                            )
                          }
                          inputClassName="border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Zulu Time
                        </label>
                        <div>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={formData.onBlocksTime}
                            onChange={(e) => {
                              handleCalculationFieldChange(
                                "onBlocksTime",
                                formatZuluTimeKeyboardInput(e.target.value)
                              );
                              if (validationErrors.onBlocksTime) {
                                setValidationErrors({
                                  ...validationErrors,
                                  onBlocksTime: "",
                                });
                              }
                            }}
                            onBlur={(e) => {
                              const normalized = normalizeOptionalZuluTimeInput(
                                e.target.value
                              );
                              handleCalculationFieldChange(
                                "onBlocksTime",
                                normalized
                              );
                              const err = validateOptionalZuluTime(normalized);
                              setValidationErrors((prev) => ({
                                ...prev,
                                onBlocksTime: err ?? "",
                              }));
                            }}
                            maxLength={5}
                            title="HH:mm (UTC)"
                            placeholder="HH:mm"
                            pattern="[0-9]{2}:[0-9]{2}"
                            aria-invalid={!!validationErrors.onBlocksTime}
                            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 bg-white text-gray-900 font-mono ${
                              validationErrors.onBlocksTime
                                ? "border-red-500 focus:ring-red-400 focus:border-red-400"
                                : "border-gray-300 focus:ring-gray-400 focus:border-gray-400"
                            }`}
                          />
                          {!validationErrors.onBlocksTime ? (
                            <p className="text-xs text-gray-500 mt-1">
                              24-hour HH:mm (UTC), 00:00–23:59
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-red-600">
                              {validationErrors.onBlocksTime}
                            </p>
                          )}
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
                    value={formatTotalFlightTimeForDisplay(
                      formData.totalFlightTime
                    )}
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
                          onChange={(event) => {
                            handleCalculationFieldChange(
                              "tachometerStart",
                              event.target.value
                            );
                          }}
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
                          onChange={(event) => {
                            handleCalculationFieldChange(
                              "tachometerEnd",
                              event.target.value
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">
                        Tachometer Total
                      </label>
                      <input
                        type="text"
                        value={formatOptionalNumber2dp(
                          formData.tachometerTotal,
                          "0.00"
                        )}
                        readOnly
                        disabled
                        aria-label="Tachometer Total"
                        title="Auto: Tach End − Tach Start"
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
                            handleCalculationFieldChange(
                              "hobbsMeterStart",
                              e.target.value
                            )
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
                            handleCalculationFieldChange(
                              "hobbsMeterEnd",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">
                        Hobbs Meter Total
                      </label>
                      <input
                        type="text"
                        value={formatOptionalNumber2dp(
                          formData.hobbsMeterTotal,
                          "0.00"
                        )}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-900 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fuel & Oil Section — FUEL matches paper ATL (LEFT | RIGHT columns) */}
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300"></th>
                      <th
                        colSpan={2}
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
                        LEFT
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        RIGHT
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
                      <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-white">
                        UPLIFT QTY.
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={1}
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
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={4}
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
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={7}
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
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={8}
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
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          tabIndex={9}
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
                      <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-white">
                        PRIOR DEPARTURE
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={2}
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
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={5}
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
                      <td className="px-3 py-2 border-r border-gray-300 bg-gray-50"></td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-gray-50"></td>
                      <td className="px-3 py-2 bg-gray-50"></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-white">
                        AFTER ON-BLKS
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={3}
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
                      <td className="px-3 py-2 border-r border-gray-300">
                        <input
                          type="text"
                          tabIndex={6}
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
                      <td className="px-3 py-2 border-r border-gray-300 bg-gray-50"></td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-gray-50"></td>
                      <td className="px-3 py-2 bg-gray-50"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remarks Section — visibility by Nature of Flight (UI only) */}
              <div className="space-y-4">
                {resolveAtlRemarksSectionVisibility(
                  formData.natureOfFlight
                ) === "pilotReport" && (
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Pilot Report
                    </label>
                    <textarea
                      value={formData.pilotReport}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pilotReport: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                    />
                  </div>
                )}
                {resolveAtlRemarksSectionVisibility(
                  formData.natureOfFlight
                ) === "maintenanceEntry" && (
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Maintenance Entry
                    </label>
                    <textarea
                      value={formData.maintenanceEntry}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maintenanceEntry: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                    />
                  </div>
                )}
                {resolveAtlRemarksSectionVisibility(
                  formData.natureOfFlight
                ) === "remarks" && (
                  <div>
                    <label className="block text-gray-700 mb-2">Remarks</label>
                    <textarea
                      value={
                        combineAtlRemarks(
                          formData.pilotReport,
                          formData.maintenanceEntry
                        ) ?? ""
                      }
                      onChange={(e) => {
                        const split = splitAtlRemarks(e.target.value);
                        setFormData({
                          ...formData,
                          pilotReport: split.pilotReport,
                          maintenanceEntry: split.maintenanceEntry,
                        });
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                    />
                  </div>
                )}
                <div>
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
                                    formatAccountNameLicense(account.fullName, account.licenseNo)
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
                                  {formatAccountNameLicense(account.fullName, account.licenseNo)}
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
                                      formatAccountNameLicense(account.fullName, account.licenseNo)
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
                                    {formatAccountNameLicense(account.fullName, account.licenseNo)}
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
                            onChange={(event) =>
                              handleCalculationFieldChange(
                                event,
                                "airframePrevTime"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.enginePrevTime}
                            onChange={(event) =>
                              handleCalculationFieldChange(
                                event,
                                "enginePrevTime"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.propellerPrevTime}
                            onChange={(event) =>
                              handleCalculationFieldChange(
                                event,
                                "propellerPrevTime"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                            disabled
                            readOnly
                            title="Synced from tachometer total"
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.engineFlightTime}
                            disabled
                            readOnly
                            title="Synced from tachometer total"
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.propellerFlightTime}
                            disabled
                            readOnly
                            title="Synced from tachometer total"
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
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
                            aria-label="Airframe Total Time"
                            title="Auto: Prev Time + Run Time"
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.engineTotalTime}
                            disabled
                            readOnly
                            aria-label="Engine Total Time"
                            title="Auto: Prev Time + Run Time"
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <input
                            type="text"
                            value={formData.propellerTotalTime}
                            disabled
                            readOnly
                            aria-label="Propeller Total Time"
                            title="Auto: Prev Time + Run Time"
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
                            disabled
                            readOnly
                            aria-label="Airframe Run Time"
                            title="Auto: Tach End − Tach Start"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-gray-100 text-gray-600 cursor-not-allowed"
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.airframeAftt}
                            onChange={(event) =>
                              handleCalculationFieldChange(
                                event,
                                "airframeAftt"
                              )
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
                            disabled
                            readOnly
                            aria-label="Engine Run Time"
                            title="Auto: Tach End − Tach Start"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-gray-100 text-gray-600 cursor-not-allowed"
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formData.engineTsn}
                            onChange={(event) => {
                              if (!engineTsnEnabled) return;
                              handleCalculationFieldChange(event, "engineTsn");
                            }}
                            disabled={!engineTsnEnabled || mainFormLocked}
                            className={`w-full px-2 py-1 border border-gray-300 rounded text-sm text-center ${
                              !engineTsnEnabled || mainFormLocked
                                ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                : "bg-white"
                            }`}
                            placeholder={!engineTsnEnabled ? "UNK" : ""}
                            title={
                              !engineTsnEnabled
                                ? "Aircraft Profile Engine TSN is empty (UNK)"
                                : "Auto: Prev Engine TSN + Engine Run"
                            }
                          />
                          {validationErrors.engineTsn && (
                            <p className="text-red-500 text-xs mt-0.5 text-center">
                              {validationErrors.engineTsn}
                            </p>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.engineTso}
                            onChange={(event) =>
                              handleCalculationFieldChange(event, "engineTso")
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="TSO"
                            title="TBO auto-updates: life limit − TSO"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.engineTbo}
                            onChange={(e) =>
                              setFormData((previous) => ({
                                ...previous,
                                engineTbo: e.target.value,
                              }))
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
                            disabled
                            readOnly
                            aria-label="Propeller Run Time"
                            title="Auto: Tach End − Tach Start"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-gray-100 text-gray-600 cursor-not-allowed"
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formData.propellerTsn}
                            onChange={(event) => {
                              if (!propellerTsnEnabled) return;
                              handleCalculationFieldChange(
                                event,
                                "propellerTsn"
                              );
                            }}
                            disabled={!propellerTsnEnabled || mainFormLocked}
                            className={`w-full px-2 py-1 border border-gray-300 rounded text-sm text-center ${
                              !propellerTsnEnabled || mainFormLocked
                                ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                : "bg-white"
                            }`}
                            placeholder={!propellerTsnEnabled ? "UNK" : ""}
                            title={
                              !propellerTsnEnabled
                                ? "Aircraft Profile Propeller TSN is empty (UNK)"
                                : "Auto: Prev Propeller TSN + Prop Run"
                            }
                          />
                          {validationErrors.propellerTsn && (
                            <p className="text-red-500 text-xs mt-0.5 text-center">
                              {validationErrors.propellerTsn}
                            </p>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.propellerTso}
                            onChange={(event) =>
                              handleCalculationFieldChange(
                                event,
                                "propellerTso"
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="TSO"
                            title="TBO auto-updates: life limit − TSO"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white">
                          <input
                            type="text"
                            value={formData.propellerTbo}
                            onChange={(e) =>
                              setFormData((previous) => ({
                                ...previous,
                                propellerTbo: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white"
                            placeholder="TBO"
                            title=""
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
                          REMOVED REMAINING TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          INSTALLED P/N
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          INSTALLED S/N
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          INSTALLED REMAINING TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          ATA CHAPTER
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                          PART REMARKS
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
                            colSpan={12}
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
                                value={record.partRemovedRemainingTime}
                                onChange={(e) =>
                                  updateComponentRecord(
                                    record.id,
                                    "partRemovedRemainingTime",
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
                                value={record.partInstalledRemainingTime}
                                onChange={(e) =>
                                  updateComponentRecord(
                                    record.id,
                                    "partInstalledRemainingTime",
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
                            <td className="border border-gray-300 px-2 py-2">
                              <input
                                type="text"
                                value={record.partRemark}
                                onChange={(e) =>
                                  updateComponentRecord(
                                    record.id,
                                    "partRemark",
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

              {/* Date Time Reported / Released — below COMPONENT RECORD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1">
                    Date Time Reported
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={
                      [formData.offBlocksDate, formData.offBlocksTime]
                        .map((v) => (v ?? "").trim())
                        .filter(Boolean)
                        .join(" | ") || ""
                    }
                    placeholder="From Off Blocks date | time"
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1">
                    Date Time Released
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <DateInput
                      value={formData.dateTimeReleasedDate}
                      onChange={(dateTimeReleasedDate) =>
                        setFormData({
                          ...formData,
                          dateTimeReleasedDate,
                        })
                      }
                      inputClassName="border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={formData.dateTimeReleasedTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateTimeReleasedTime: formatZuluTimeKeyboardInput(
                            e.target.value
                          ),
                        })
                      }
                      onBlur={(e) => {
                        const normalized = normalizeOptionalZuluTimeInput(
                          e.target.value
                        );
                        setFormData((prev) => ({
                          ...prev,
                          dateTimeReleasedTime: normalized,
                        }));
                      }}
                      maxLength={5}
                      title="HH:mm (UTC)"
                      placeholder="HH:mm"
                      pattern="[0-9]{2}:[0-9]{2}"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 font-mono text-sm"
                    />
                  </div>
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
                                        formatAccountNameLicense(account.fullName, account.licenseNo)
                                      )
                                    }
                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                      formData.pilotFk === account.id.toString()
                                        ? "bg-blue-50"
                                        : ""
                                    }`}
                                  >
                                    <span className="text-gray-900 text-sm">
                                      {formatAccountNameLicense(account.fullName, account.licenseNo)}
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
                      <DateInput
                        value={formData.pilotAcceptDate}
                        onChange={(pilotAcceptDate) =>
                          setFormData({
                            ...formData,
                            pilotAcceptDate,
                          })
                        }
                        inputClassName="border-gray-300 rounded-lg text-sm bg-white text-gray-900"
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
                                        formatAccountNameLicense(account.fullName, account.licenseNo)
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
                                      {formatAccountNameLicense(account.fullName, account.licenseNo)}
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
                      <DateInput
                        value={formData.rtsDate}
                        onChange={(rtsDate) =>
                          setFormData({
                            ...formData,
                            rtsDate,
                          })
                        }
                        inputClassName="border-gray-300 rounded-lg text-sm bg-white text-gray-900"
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

            {/* White ATL, DFP, Date Reported — view when data exists; update: Admin / Tech Pub / Maint Manager */}
            {canUseTechPubView && (
              <div id="TechPubView">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  {/* {!canUploadAtlInCurrentMode && (
                    <p className="mb-4 text-sm text-gray-600">
                      White ATL and DFP are view-only for your role. Only Admin,
                      Technical Publication, and Maintenance Manager may update
                      these fields.
                    </p>
                  )} */}
                  <div className="mb-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 mb-2">
                          White ATL
                        </label>
                        <div>
                          <input
                            type="file"
                            id="white-atl-file"
                            onChange={(e) =>
                              handleFileChange(
                                "whiteAtl",
                                e.target.files?.[0] || null
                              )
                            }
                            className="hidden"
                            disabled={!canUploadAtlInCurrentMode}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
                          />
                          <label
                            htmlFor={
                              canUploadAtlInCurrentMode
                                ? "white-atl-file"
                                : undefined
                            }
                            className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm flex items-center justify-between ${
                              canUploadAtlInCurrentMode
                                ? "cursor-pointer hover:bg-gray-50 transition-colors"
                                : "cursor-not-allowed opacity-60 pointer-events-none"
                            }`}
                          >
                            <span
                              className={
                                whiteAtlFileName || existingWhiteAtlFilePath
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }
                            >
                              {whiteAtlUploadLabel}
                            </span>
                            <Upload className="w-4 h-4 text-gray-400" />
                          </label>
                          {canUploadAtlInCurrentMode && whiteAtlFileName && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFile("whiteAtl")}
                              className="text-xs text-red-600 hover:text-red-700 mt-1"
                            >
                              Remove file
                            </button>
                          )}
                          {existingWhiteAtlFilePath !== "" && (
                            <div className="flex flex-col gap-1 mt-2">
                              {isImageFilePath(existingWhiteAtlFilePath) && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                                  onClick={() =>
                                    handleViewAtlFile(
                                      "white_atl",
                                      existingWhiteAtlFilePath
                                    )
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
                                    existingWhiteAtlFilePath,
                                    existingWhiteAtlFilePath.split("/").pop() ||
                                      "white_atl"
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
                              handleFileChange(
                                "dfp",
                                e.target.files?.[0] || null
                              )
                            }
                            className="hidden"
                            disabled={!canUploadAtlInCurrentMode}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
                          />
                          <label
                            htmlFor={
                              canUploadAtlInCurrentMode ? "dfp-file" : undefined
                            }
                            className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm flex items-center justify-between ${
                              canUploadAtlInCurrentMode
                                ? "cursor-pointer hover:bg-gray-50 transition-colors"
                                : "cursor-not-allowed opacity-60 pointer-events-none"
                            }`}
                          >
                            <span
                              className={
                                dfpFileName || existingDfpFilePath
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }
                            >
                              {dfpUploadLabel}
                            </span>
                            <Upload className="w-4 h-4 text-gray-400" />
                          </label>
                          {canUploadAtlInCurrentMode && dfpFileName && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFile("dfp")}
                              className="text-xs text-red-600 hover:text-red-700 mt-1"
                            >
                              Remove file
                            </button>
                          )}
                          {existingDfpFilePath !== "" && (
                            <div className="flex flex-col gap-1 mt-2">
                              {isImageFilePath(existingDfpFilePath) && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                                  onClick={() =>
                                    handleViewAtlFile(
                                      "dfp",
                                      existingDfpFilePath
                                    )
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
                                    existingDfpFilePath,
                                    existingDfpFilePath.split("/").pop() ||
                                      "dfp"
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-gray-700 mb-2">
                        White ATL Link
                      </label>
                      <input
                        type="url"
                        value={formData.whiteAtlWebLink}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            whiteAtlWebLink: e.target.value,
                          })
                        }
                        disabled={!canUploadAtlInCurrentMode}
                        placeholder={
                          canUploadAtlInCurrentMode
                            ? "https://..."
                            : "Edit not permitted for your role"
                        }
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${
                          canUploadAtlInCurrentMode
                            ? "bg-white text-gray-900"
                            : "bg-gray-100 text-gray-500 cursor-not-allowed"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">
                        DFP Link
                      </label>
                      <input
                        type="url"
                        value={formData.dfpWebLink}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dfpWebLink: e.target.value,
                          })
                        }
                        disabled={!canUploadAtlInCurrentMode}
                        placeholder={
                          canUploadAtlInCurrentMode
                            ? "https://..."
                            : "Edit not permitted for your role"
                        }
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${
                          canUploadAtlInCurrentMode
                            ? "bg-white text-gray-900"
                            : "bg-gray-100 text-gray-500 cursor-not-allowed"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <span className="block text-sm font-medium text-gray-800">
                        Date Reported
                      </span>

                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                        {!hasAtlDateReportedValue(
                          formData.dateTimeReportedDate,
                          formData.dateTimeReportedTime,
                          preservedDateReportedRef.current ??
                            editEntry?.dateTimeReported
                        ) ? (
                          isTechPubRole ? (
                            <div>
                              <p className="text-gray-700 tabular-nums">
                                {/* {philippinesNow} */}
                              </p>
                              <p className="mt-1 text-gray-500 text-xs">
                                Philippines (Asia/Manila) — set automatically on
                                first attachment upload
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-500">Not set yet.</p>
                          )
                        ) : (
                          <p className="text-gray-700 tabular-nums">
                            {formatAtlDateReportedManilaFromParts(
                              formData.dateTimeReportedDate,
                              formData.dateTimeReportedTime,
                              preservedDateReportedRef.current ??
                                editEntry?.dateTimeReported
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* <div className="space-y-2">
                      <span className="block text-sm font-medium text-gray-800">
                        Date Reported
                      </span>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                        {hasAtlDateReportedValue(
                          formData.dateTimeReportedDate,
                          formData.dateTimeReportedTime,
                          preservedDateReportedRef.current ??
                            editEntry?.dateTimeReported
                        ) ? (
                          <p className="text-gray-500">
                            {isTechPubRole ? (
                              <>
                                <span className="mt-1 block text-gray-700 tabular-nums">
                                  Set automatically on first attachment upload
                                </span>
                              </>
                            ) : (
                              "Not set yet."
                            )}
                          </p>
                        )}
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="relative z-[60] px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {atlFormReadOnly ? "Close" : "Cancel"}
              </button>
              {!atlFormReadOnly && (
                <button
                  type="submit"
                  disabled={!allowSubmit || isInitializing || isSubmitting}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    allowSubmit && !isInitializing
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {editEntry ? "Update Entry" : "Save Entry"}
                </button>
              )}
            </div>
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
        >
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
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
