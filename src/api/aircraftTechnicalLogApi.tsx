import apiClient from "./index";
import { DEFAULT_API_PAGE_SIZE } from "../constants/pagination";
import {
  formatAtlListDate,
  formatTimeZulu,
  toCamelDeep,
} from "../utility/utils";
import { appendPagedQueryParams } from "../utils/pagedQuery";
import { FILE_UPLOAD_MODULES, resolveUploadedFilePath } from "./fileUploadApi";
import { assertAtlNatureRequiredFields } from "../utility/atlNatureRequiredFields";

// Component Parts Record Interfaces
export interface ComponentPartsRecord {
  id?: number;
  qty: number;
  unit: string;
  nomenclature: string;
  removedPartNo?: string;
  removedSerialNo?: string;
  installedPartNo?: string;
  installedSerialNo?: string;
  ataChapter?: string;
  /** Backend column retained; no longer shown or edited in the UI. */
  partRemovedRemainingTime?: string | number;
  /** Backend column retained; no longer shown or edited in the UI. */
  partInstalledRemainingTime?: string | number;
  partRemark?: string;
}

export interface ComponentPartsRecordCreate {
  qty: number;
  unit: string;
  nomenclature: string;
  removedPartNo?: string;
  removedSerialNo?: string;
  installedPartNo?: string;
  installedSerialNo?: string;
  ataChapter?: string;
  /** Pass-through on update only so existing DB values are not cleared. */
  partRemovedRemainingTime?: string | number;
  /** Pass-through on update only so existing DB values are not cleared. */
  partInstalledRemainingTime?: string | number;
  partRemark?: string;
}

export interface ComponentPartsRecordUpdate {
  qty?: number;
  unit?: string;
  nomenclature?: string;
  removedPartNo?: string;
  removedSerialNo?: string;
  installedPartNo?: string;
  installedSerialNo?: string;
  ataChapter?: string;
  partRemovedRemainingTime?: string | number;
  partInstalledRemainingTime?: string | number;
  partRemark?: string;
}

// Aircraft Technical Log Interfaces
export type NatureOfFlightType =
  | ""
  | "TR"
  | "PSF"
  | "PRF"
  | "EGR"
  | "ME"
  | "TR_WITH_PIREM"
  | "VOID"
  | "ATL_REPL";

export interface AircraftTechnicalLog {
  id: number;
  aircraftFk: number;
  sequenceNo: string;
  natureOfFlight: NatureOfFlightType;
  nextInspectionDue?: string;
  tachTimeDue?: number;
  originStation: string;
  originDate: string;
  originTime: string;
  destinationStation: string;
  destinationDate: string;
  destinationTime: string;
  numberOfLandings: number;
  hobbsMeterStart: number;
  hobbsMeterEnd: number;
  hobbsMeterTotal: number;
  tachometerStart: number;
  tachometerEnd: number;
  tachometerTotal: number;
  fuelQtyLeftUpliftQty?: number;
  fuelQtyRightUpliftQty?: number;
  fuelQtyLeftPriorDeparture?: number;
  fuelQtyRightPriorDeparture?: number;
  fuelQtyLeftAfterOnBlks?: number;
  fuelQtyRightAfterOnBlks?: number;
  oilQtyUpliftQty?: number;
  oilQtyPriorDeparture?: number;
  oilQtyAfterOnBlks?: number;
  remarks?: string;
  actionsTaken?: string;
  pilotFk?: number;
  maintenanceFk?: number | null;
  /** Remarks Name (remark_person); null when unassigned. */
  remarkPerson?: number | string | null;
  /**
   * Actions Taken Name (actiontaken_person).
   * Camel form of DB column actiontaken_person (not action_taken_person).
   */
  actiontakenPerson?: number | string | null;
  /** @deprecated Prefer actiontakenPerson; kept for older payloads/UI keys. */
  actionTakenPerson?: number | string | null;
  /** Nested maintenance person when API includes account join (display only). */
  maintenance?: {
    id?: number;
    fullName?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    licenseNo?: string;
  };
  /** Account id or list display name; null/empty when unassigned. */
  pilotAcceptedBy?: number | string | null;
  pilotAcceptDate?: string;
  pilotAcceptTime?: string;
  airframeTotalTime?: number;
  airframeRunTime?: number;
  airframeAftt?: number;
  engineTotalTime?: number;
  engineRunTime?: number;
  engineTsn?: string;
  engineTso?: number;
  engineTbo?: number;
  propellerTotalTime?: number;
  propellerRunTime?: number;
  propellerTsn?: string;
  propellerTso?: number;
  propellerTbo?: number;
  lifeTimeLimitEngine?: number;
  lifeTimeLimitPropeller?: number;
  /** Account id or list display name; null/empty when unassigned. */
  rtsSignedBy?: number | string | null;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
  whiteAtlWebLink?: string;
  dfpWebLink?: string;
  dateTimeReported?: string | null;
  dateTimeReleased?: string | null;
  componentParts?: ComponentPartsRecord[];
  aircraft?: {
    id: number;
    registration: string;
    model: string;
    type: string;
  };
  workStatus?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  autoAirframeRunTime?: number;
  autoAirframeAftt?: number;
  autoEngineRunTime?: number;
  autoEngineTsn?: number | string;
  autoEngineTso?: number;
  autoEngineTbo?: number;
  autoPropellerRunTime?: number;
  autoPropellerTsn?: number | string;
  autoPropellerTso?: number;
  autoPropellerTbo?: number;
  /** Backend-computed total flight hours for list display (from block times). */
  totalFlightHours?: string | number | null;
  atlBatchFk?: number | null;
  atlBatch?: { id: number; name?: string };
}

export interface AircraftTechnicalLogCreate {
  aircraftFk: number;
  sequenceNo: string;
  natureOfFlight: NatureOfFlightType;
  nextInspectionDue?: string;
  tachTimeDue?: number;
  originStation: string;
  originDate: string;
  originTime: string;
  destinationStation: string;
  destinationDate: string;
  destinationTime: string;
  numberOfLandings: number;
  hobbsMeterStart: number;
  hobbsMeterEnd: number;
  hobbsMeterTotal: number;
  tachometerStart: number;
  tachometerEnd: number;
  tachometerTotal: number;
  fuelQtyLeftUpliftQty?: number;
  fuelQtyRightUpliftQty?: number;
  fuelQtyLeftPriorDeparture?: number;
  fuelQtyRightPriorDeparture?: number;
  fuelQtyLeftAfterOnBlks?: number;
  fuelQtyRightAfterOnBlks?: number;
  oilQtyUpliftQty?: number;
  oilQtyPriorDeparture?: number;
  oilQtyAfterOnBlks?: number;
  remarks?: string;
  actionsTaken?: string;
  pilotFk?: number | null;
  maintenanceFk?: number | null;
  remarkPerson?: number | null;
  actiontakenPerson?: number | null;
  pilotAcceptedBy?: number | null;
  pilotAcceptDate?: string;
  pilotAcceptTime?: string;
  airframeRunTime?: number;
  airframeAftt?: number;
  engineRunTime?: number;
  engineTsn?: string;
  engineTso?: number;
  engineTbo?: number;
  propellerRunTime?: number;
  propellerTsn?: string;
  propellerTso?: number;
  propellerTbo?: number;
  lifeTimeLimitEngine?: number;
  lifeTimeLimitPropeller?: number;
  rtsSignedBy?: number | null;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
  whiteAtlWebLink?: string;
  dfpWebLink?: string;
  dateTimeReported?: string | null;
  dateTimeReleased?: string | null;
  componentParts?: ComponentPartsRecordCreate[];
  /** Default FOR_REVIEW on create (Fleet Time Monitoring); API enum names: FOR_REVIEW, REJECTED_MAINTENANCE, APPROVED, etc. */
  workStatus?: string;
  /** account_information_id of the currently logged-in user */
  createdBy?: number;
}

export interface AircraftTechnicalLogUpdate {
  aircraftFk?: number;
  sequenceNo?: string;
  natureOfFlight?: NatureOfFlightType;
  nextInspectionDue?: string;
  tachTimeDue?: number;
  originStation?: string;
  originDate?: string;
  originTime?: string;
  destinationStation?: string;
  destinationDate?: string;
  destinationTime?: string;
  numberOfLandings?: number;
  hobbsMeterStart?: number;
  hobbsMeterEnd?: number;
  hobbsMeterTotal?: number;
  tachometerStart?: number;
  tachometerEnd?: number;
  tachometerTotal?: number;
  fuelQtyLeftUpliftQty?: number;
  fuelQtyRightUpliftQty?: number;
  fuelQtyLeftPriorDeparture?: number;
  fuelQtyRightPriorDeparture?: number;
  fuelQtyLeftAfterOnBlks?: number;
  fuelQtyRightAfterOnBlks?: number;
  oilQtyUpliftQty?: number;
  oilQtyPriorDeparture?: number;
  oilQtyAfterOnBlks?: number;
  remarks?: string;
  actionsTaken?: string;
  pilotFk?: number | null;
  maintenanceFk?: number | null;
  remarkPerson?: number | null;
  actiontakenPerson?: number | null;
  pilotAcceptedBy?: number | null;
  pilotAcceptDate?: string;
  pilotAcceptTime?: string;
  airframeRunTime?: number;
  airframeAftt?: number;
  engineRunTime?: number;
  engineTsn?: string;
  engineTso?: number;
  engineTbo?: number;
  propellerRunTime?: number;
  propellerTsn?: string;
  propellerTso?: number;
  propellerTbo?: number;
  lifeTimeLimitEngine?: number;
  lifeTimeLimitPropeller?: number;
  rtsSignedBy?: number | null;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
  whiteAtlWebLink?: string;
  dfpWebLink?: string;
  dateTimeReported?: string | null;
  dateTimeReleased?: string | null;
  componentParts?: ComponentPartsRecordCreate[];
  /** Fleet Time Monitoring: work status (e.g. FOR REVIEW, APPROVED) */
  workStatus?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

/** Aircraft summary returned by ATL sequence number search */
export interface AircraftTechnicalLogSearchAircraft {
  id: number;
  registration: string;
  model: string;
  type: string;
}

/** Single result from search by ATL Sequence Number */
export interface AircraftTechnicalLogSearchResult {
  /** Technical log row id — use as atl_ref when linking TCC/CPCP to ATL */
  id: number;
  sequenceNo: string;
  aircraft: AircraftTechnicalLogSearchAircraft;
  natureOfFlight?: string;
  /** Present when API returns full row — used for CPCP ATL picker line format */
  tachometerEnd?: number;
  autoAirframeAftt?: number;
  originDate?: string;
}

export type AtlComponentMetric =
  | "airframeRunTime"
  | "airframeAftt"
  | "engineRunTime"
  | "engineTsn"
  | "engineTso"
  | "engineTbo"
  | "propellerRunTime"
  | "propellerTsn"
  | "propellerTso"
  | "propellerTbo";

const ATL_PERSISTED_COMPONENT_METRIC_KEYS: Record<
  AtlComponentMetric,
  { snake: string; camel: string }
> = {
  airframeRunTime: { snake: "airframe_run_time", camel: "airframeRunTime" },
  airframeAftt: { snake: "airframe_aftt", camel: "airframeAftt" },
  engineRunTime: { snake: "engine_run_time", camel: "engineRunTime" },
  engineTsn: { snake: "engine_tsn", camel: "engineTsn" },
  engineTso: { snake: "engine_tso", camel: "engineTso" },
  engineTbo: { snake: "engine_tbo", camel: "engineTbo" },
  propellerRunTime: { snake: "propeller_run_time", camel: "propellerRunTime" },
  propellerTsn: { snake: "propeller_tsn", camel: "propellerTsn" },
  propellerTso: { snake: "propeller_tso", camel: "propellerTso" },
  propellerTbo: { snake: "propeller_tbo", camel: "propellerTbo" },
};

/**
 * Persisted DB field only — never auto_* or derived fallbacks.
 * Used by Operation list view and Edit Entry form for consistent display.
 */
export function resolveAtlPersistedComponentMetric(
  entry: AircraftTechnicalLog | Record<string, unknown> | null | undefined,
  metric: AtlComponentMetric
): unknown {
  if (!entry || typeof entry !== "object") return undefined;
  const record = entry as Record<string, unknown>;
  const { snake, camel } = ATL_PERSISTED_COMPONENT_METRIC_KEYS[metric];
  if (snake in record) return record[snake];
  if (camel in record) return record[camel];
  return record[snake] ?? record[camel];
}

/** Format persisted component metric (2dp; 0 → "0.00"; null/empty → emptyLabel). */
export function formatAtlPersistedComponentMetric2dp(
  entry: AircraftTechnicalLog | Record<string, unknown> | null | undefined,
  metric: AtlComponentMetric,
  emptyLabel = "-"
): string {
  const value = resolveAtlPersistedComponentMetric(entry, metric);
  if (value == null || value === "") return emptyLabel;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : emptyLabel;
}

export function resolveAtlComponentMetric(
  entry: AircraftTechnicalLog | Record<string, unknown> | null | undefined,
  metric: AtlComponentMetric
): unknown {
  return resolveAtlPersistedComponentMetric(entry, metric);
}

/** Closed-select / empty-record display when no mechanic or pilot is assigned. */
export const UNASSIGNED_PERSON_NAME_LABEL = "No Selected Name";

/** True when a value is missing or a sentinel empty token (not a real person name). */
export function isAtlEmptyAssigneeValue(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  if (s === "") return true;
  return /^(none|null|undefined|no selected name)$/i.test(s);
}

/**
 * Operation ATL list view: numeric 0 (including "0", "0.0", "0.00") is unassigned.
 * Does not treat empty/null as zero — callers combine with isAtlEmptyAssigneeValue.
 */
export function isAtlListNumericZero(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && value === 0;
  }
  const s = String(value ?? "").trim();
  if (s === "") return false;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)) return false;
  return Number(s) === 0;
}

/**
 * Operation ATL list view: render API scalar as-is.
 * null / undefined / empty / 0 → emptyLabel. Non-zero values unchanged.
 * Engine/propeller TSN uses displayTSN (UNK), not this helper.
 */
export function formatAtlListCell(
  value: unknown,
  emptyLabel = "-"
): string {
  if (isAtlEmptyAssigneeValue(value) || isAtlListNumericZero(value)) {
    return emptyLabel;
  }
  return String(value);
}

/**
 * RTS / Pilot Acceptance assignee cells: unassigned → blank.
 * Never shows "-", "None", "null", "undefined", or "No Selected Name".
 */
export function formatAtlAssigneeListCell(value: unknown): string {
  return formatAtlListCell(value, "");
}

/** Parse form account id for create/update; empty / invalid → null (persist NULL). */
export function parseAtlAssigneeIdForApi(
  value: string | number | null | undefined
): number | null {
  if (isAtlEmptyAssigneeValue(value)) return null;
  const n = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Pilot Acceptance Name for create/update: the form value only.
 * Empty / None / No Selected Name → null. Does not copy from a previous ATL,
 * logged-in user, or any other record.
 */
export function pilotAcceptanceNameFieldsForApi(
  formValue: string | number | null | undefined
): { pilotFk: number | null; pilotAcceptedBy: number | null } {
  const id = parseAtlAssigneeIdForApi(formValue);
  return { pilotFk: id, pilotAcceptedBy: id };
}

/**
 * Rewrite Pilot Acceptance Name keys already present on create/update.
 * Empty sentinels become null. Partial updates without those keys are unchanged.
 * Leaves Pilot Acceptance date/time untouched.
 */
export function normalizeAtlPilotAcceptanceNameForApi(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const hasDedicated =
    "pilot_accepted_by" in payload || "pilotAcceptedBy" in payload;
  const hasPilotFk = "pilot_fk" in payload || "pilotFk" in payload;
  if (!hasDedicated && !hasPilotFk) return payload;

  const sourceKey = [
    "pilot_accepted_by",
    "pilotAcceptedBy",
    "pilot_fk",
    "pilotFk",
  ].find((key) => key in payload);
  const id = parseAtlAssigneeIdForApi(
    (sourceKey != null ? payload[sourceKey] : undefined) as
      | string
      | number
      | null
      | undefined
  );
  if (hasDedicated) {
    payload.pilot_accepted_by = id;
    if ("pilotAcceptedBy" in payload) payload.pilotAcceptedBy = id;
  }
  if (hasPilotFk) {
    payload.pilot_fk = id;
    if ("pilotFk" in payload) payload.pilotFk = id;
  }
  return payload;
}

/**
 * True when engine_tsn / propeller_tsn is present (including 0).
 * Null, undefined, or blank → false (UNK / no auto-computation).
 */
export function hasTsnValue(value: unknown): boolean {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );
}

/** Display-only: empty engine/propeller TSN → "UNK". Never send "UNK" to the API. */
export function displayTSN(
  value: number | string | null | undefined
): string {
  return hasTsnValue(value) ? String(value) : "UNK";
}

/** Join off-blocks date and Zulu time (HH:mm) for list view: `DD-MM-YYYY | time`. */
export function formatAtlListOffBlocks(
  record: AircraftTechnicalLog
): string {
  const date = formatAtlListDate(record.originDate, "");
  const time =
    record.originTime != null && record.originTime !== ""
      ? formatTimeZulu(record.originTime)
      : "";
  const parts = [
    date,
    time && time !== "-" ? time : "",
  ].filter((v) => v != null && v !== "");
  return parts.length === 0 ? "-" : parts.map(String).join(" | ");
}

/** Join on-blocks date and Zulu time (HH:mm) for list view: `DD-MM-YYYY | time`. */
export function formatAtlListOnBlocks(
  record: AircraftTechnicalLog
): string {
  const date = formatAtlListDate(record.destinationDate, "");
  const time =
    record.destinationTime != null && record.destinationTime !== ""
      ? formatTimeZulu(record.destinationTime)
      : "";
  const parts = [
    date,
    time && time !== "-" ? time : "",
  ].filter((v) => v != null && v !== "");
  return parts.length === 0 ? "-" : parts.map(String).join(" | ");
}

/** Normalize rows from GET /aircraft-technical-log/paged (and manage/paged) across common response shapes. */
function extractPagedLogRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const tryObject = (p: Record<string, unknown>): unknown[] => {
    if (Array.isArray(p.items)) return p.items;
    if (Array.isArray(p.results)) return p.results;
    if (Array.isArray(p.records)) return p.records;
    if (Array.isArray(p.logs)) return p.logs;
    if (Array.isArray(p.entries)) return p.entries;
    if (Array.isArray(p.list)) return p.list;
    if (Array.isArray(p.data)) return p.data;
    return [];
  };

  const p = payload as Record<string, unknown>;
  let rows = tryObject(p);
  const inner = p.data;
  if (
    rows.length === 0 &&
    inner != null &&
    typeof inner === "object" &&
    !Array.isArray(inner)
  ) {
    rows = tryObject(inner as Record<string, unknown>);
  }
  return rows;
}

function readPagedNumeric(
  payload: unknown,
  keys: string[],
  fallback: number
): number {
  if (!payload || typeof payload !== "object") return fallback;
  const p = payload as Record<string, unknown>;
  const inner =
    p.data != null && typeof p.data === "object" && !Array.isArray(p.data)
      ? (p.data as Record<string, unknown>)
      : null;
  const meta =
    p.meta != null && typeof p.meta === "object" && !Array.isArray(p.meta)
      ? (p.meta as Record<string, unknown>)
      : null;
  for (const key of keys) {
    for (const src of [p, inner, meta]) {
      if (!src) continue;
      const v = src[key];
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

// CRUD Operations

/**
 * Normalize sort for paged ATL endpoints: `field` (asc) or `-field` (desc).
 * Passes through values that already include a direction prefix.
 */
export function normalizeAtlPagedSortParam(sort: string): string {
  const trimmed = sort.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("-") || trimmed.startsWith("+")) {
    return trimmed.replace(/^--+/, "-");
  }
  return trimmed;
}

const fetchAircraftTechnicalLogs = async (
  endpoint: string,
  page = 1,
  limit = DEFAULT_API_PAGE_SIZE,
  search = "",
  aircraftFk?: number,
  sort = "",
  workStatus?: string,
  atlBatchFk?: number
): Promise<PaginatedResponse<AircraftTechnicalLog>> => {
  try {
    const params = new URLSearchParams();

    // Query order: atl_batch* first, then page, page_size, aircraft_id/aircraft_fk, sort, search, work_status
    // e.g. .../paged?...&sort=sequence_no (asc) or sort=-created_at (desc)
    if (atlBatchFk != null && Number.isFinite(atlBatchFk) && atlBatchFk > 0) {
      const idStr = String(atlBatchFk);
      params.append("atl_batch", idStr);
      params.append("atl_batch_fk", idStr);
    }

    appendPagedQueryParams(params, page, limit);

    const aircraftIdNum = aircraftFk != null ? Number(aircraftFk) : NaN;
    if (Number.isFinite(aircraftIdNum) && aircraftIdNum > 0) {
      params.append("aircraft_id", String(aircraftIdNum));
      params.append("aircraft_fk", String(aircraftIdNum));
    }

    const sortParam = normalizeAtlPagedSortParam(sort);
    if (sortParam) {
      params.append("sort", sortParam);
    }

    if (search.trim() !== "") {
      params.append("search", search.trim());
    }

    if (workStatus != null && workStatus.trim() !== "") {
      params.append("work_status", workStatus.trim());
    }

    const response = await apiClient.get(`${endpoint}?${params.toString()}`);

    const payload = response.data?.data ?? response.data;
    const rawItems = extractPagedLogRows(payload);

    const transformedItems = rawItems.map(
      (item) => toCamelDeep(item) as AircraftTechnicalLog
    );

    const totalRaw = readPagedNumeric(
      payload,
      ["total", "count", "totalCount", "total_count"],
      transformedItems.length
    );
    const currentPageRaw = readPagedNumeric(
      payload,
      ["page", "currentPage", "current_page"],
      page
    );
    const pagesRaw = readPagedNumeric(
      payload,
      ["pages", "totalPages", "total_pages"],
      NaN
    );

    const normalizedTotal = Number.isFinite(totalRaw)
      ? Math.max(0, totalRaw)
      : transformedItems.length;
    const normalizedPage = Number.isFinite(currentPageRaw)
      ? Math.max(1, currentPageRaw)
      : Math.max(1, page);
    const normalizedPages = Number.isFinite(pagesRaw)
      ? Math.max(1, pagesRaw)
      : limit > 0
      ? Math.max(1, Math.ceil(normalizedTotal / limit))
      : 1;

    return {
      items: transformedItems,
      total: normalizedTotal,
      page: normalizedPage,
      pages: normalizedPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get paginated list of Aircraft Technical Log entries for operation views.
 * `GET /api/v1/aircraft-technical-log/manage/paged` — e.g.
 * `?atl_batch={id}&atl_batch_fk={id}&page=1&limit={n}&aircraft_id={id}&sort=-created_at&search={sequence_no}`
 */
export const getAircraftTechnicalLogs = async (
  page = 1,
  limit = DEFAULT_API_PAGE_SIZE,
  search = "",
  aircraftFk?: number,
  sort = "",
  workStatus?: string,
  atlBatchFk?: number
): Promise<PaginatedResponse<AircraftTechnicalLog>> =>
  fetchAircraftTechnicalLogs(
    "aircraft-technical-log/paged",
    page,
    limit,
    search,
    aircraftFk,
    sort,
    workStatus,
    atlBatchFk
  );

/**
 * Get paginated list of Aircraft Technical Log entries for manage/list views
 */
export const getManagedAircraftTechnicalLogs = async (
  page = 1,
  limit = DEFAULT_API_PAGE_SIZE,
  search = "",
  aircraftFk?: number,
  sort = "",
  workStatus?: string,
  atlBatchFk?: number
): Promise<PaginatedResponse<AircraftTechnicalLog>> =>
  fetchAircraftTechnicalLogs(
    "aircraft-technical-log/manage/paged",
    page,
    limit,
    search,
    aircraftFk,
    sort,
    workStatus,
    atlBatchFk
  );

/**
 * Get a single Aircraft Technical Log entry by ID
 */
export const getAircraftTechnicalLogById = async (
  logId: number
): Promise<AircraftTechnicalLog> => {
  try {
    const response = await apiClient.get(`aircraft-technical-log/${logId}`);
    const raw = response.data?.data ?? response.data;

    return toCamelDeep(raw) as AircraftTechnicalLog;
  } catch (error) {
    throw error;
  }
};

function parsePositiveId(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(n) ? n : undefined;
}

/** Rows from GET /aircraft-technical-log/?search= across array, paged, and single-object envelopes. */
export function extractAircraftTechnicalLogSearchRows(
  responseData: unknown
): unknown[] {
  const payload =
    responseData &&
    typeof responseData === "object" &&
    (responseData as { data?: unknown }).data !== undefined
      ? (responseData as { data: unknown }).data
      : responseData;

  const rows = extractPagedLogRows(payload);
  if (rows.length > 0) return rows;

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    ((payload as { sequence_no?: unknown }).sequence_no != null ||
      (payload as { sequenceNo?: unknown }).sequenceNo != null ||
      (payload as { sequence_number?: unknown }).sequence_number != null)
  ) {
    return [payload];
  }

  return [];
}

export function mapAircraftTechnicalLogSearchItem(
  item: unknown
): AircraftTechnicalLogSearchResult {
  const row =
    item && typeof item === "object"
      ? (item as Record<string, unknown>)
      : {};

  const nested = row.aircraft;
  const fkRaw =
    row.aircraft_fk ??
    row.aircraftFk ??
    row.aircraft_id ??
    row.aircraftId ??
    (nested != null && typeof nested !== "object" ? nested : undefined);

  let aircraft: AircraftTechnicalLogSearchAircraft;
  if (nested && typeof nested === "object") {
    const a = nested as Record<string, unknown>;
    aircraft = {
      id: parsePositiveId(a.id ?? a.pk ?? fkRaw),
      registration: String(
        a.registration ?? a.registration_mark ?? a.ident ?? ""
      ),
      model: String(a.model ?? ""),
      type: String(a.type ?? ""),
    };
  } else {
    aircraft = {
      id: parsePositiveId(fkRaw),
      registration: String(
        row.aircraft_registration ?? row.ac_reg ?? row.registration ?? ""
      ),
      model: "",
      type: "",
    };
  }

  const originDateRaw =
    row.origin_date ??
    row.originDate ??
    row.date_of_origin ??
    row.dateOfOrigin;
  const originDate =
    originDateRaw != null && String(originDateRaw).trim() !== ""
      ? String(originDateRaw).trim()
      : undefined;

  const natureRaw = row.nature_of_flight ?? row.natureOfFlight;
  const sequenceNo = String(
    row.sequence_no ?? row.sequenceNo ?? row.sequence_number ?? ""
  );

  return {
    id: parsePositiveId(row.id ?? row.pk),
    sequenceNo,
    aircraft,
    natureOfFlight:
      natureRaw != null && String(natureRaw).trim() !== ""
        ? String(natureRaw)
        : undefined,
    tachometerEnd: parseOptionalNumber(
      row.tachometer_end ??
        row.tachometerEnd ??
        row.tach_end ??
        row.tachEnd
    ),
    autoAirframeAftt: parseOptionalNumber(
      row.auto_airframe_aftt ??
        row.autoAirframeAftt ??
        row.airframe_aftt ??
        row.airframeAftt
    ),
    originDate,
  };
}

/**
 * Search Aircraft Technical Log by ATL Sequence Number.
 * GET /api/v1/aircraft-technical-log/?search=<query>
 * Blank search is not sent (avoids `?search=` listing the full table).
 * Returns items with sequence_no and aircraft { id, registration, model, type }.
 */
export const searchAircraftTechnicalLogBySequence = async (
  search: string,
  aircraftId?: number
): Promise<AircraftTechnicalLogSearchResult[]> => {
  const q = search.trim();
  if (!q) return [];

  const params = new URLSearchParams();
  params.append("search", q);

  const aid = parsePositiveId(aircraftId);
  if (aid > 0) {
    params.append("aircraft_id", String(aid));
    params.append("aircraft_fk", String(aid));
  }

  const response = await apiClient.get(
    `aircraft-technical-log/?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );
  return extractAircraftTechnicalLogSearchRows(response.data).map(
    mapAircraftTechnicalLogSearchItem
  );
};

/** Optional file uploads for WHITE ATL and DFP — uploaded via module upload API first */
export interface AircraftTechnicalLogFiles {
  whiteAtl?: File | null;
  dfp?: File | null;
}

async function mergeAtlFilePathsIntoPayload(
  data: Record<string, unknown>,
  files?: AircraftTechnicalLogFiles
): Promise<Record<string, unknown>> {
  const payload = { ...data };
  if (files?.whiteAtl instanceof File) {
    payload.white_atl = await resolveUploadedFilePath(
      FILE_UPLOAD_MODULES.whiteAtl,
      files.whiteAtl
    );
  }
  if (files?.dfp instanceof File) {
    payload.dfp = await resolveUploadedFilePath(
      FILE_UPLOAD_MODULES.dfp,
      files.dfp
    );
  }
  return payload;
}

/**
 * Create a new Aircraft Technical Log entry.
 * File attachments are uploaded to white_atl/dfp module folders; paths are sent in JSON body.
 */
export type AircraftTechnicalLogWriteOptions = {
  /** Attachments-only edits skip nature-of-flight required-field rules. */
  skipNatureRequiredValidation?: boolean;
};

export const createAircraftTechnicalLog = async (
  data: AircraftTechnicalLogCreate | Record<string, unknown>,
  files?: AircraftTechnicalLogFiles
): Promise<AircraftTechnicalLog> => {
  try {
    const payload = normalizeAtlPilotAcceptanceNameForApi(
      await mergeAtlFilePathsIntoPayload(
        data as Record<string, unknown>,
        files
      )
    );
    assertAtlNatureRequiredFields(payload, "create");
    const response = await apiClient.post("aircraft-technical-log/", payload);
    const raw = response.data?.data ?? response.data;
    return toCamelDeep(raw) as AircraftTechnicalLog;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an Aircraft Technical Log entry.
 * File attachments are uploaded to white_atl/dfp module folders; paths are sent in JSON body.
 */
export const updateAircraftTechnicalLog = async (
  logId: number,
  data: AircraftTechnicalLogUpdate | Record<string, unknown>,
  files?: AircraftTechnicalLogFiles,
  options?: AircraftTechnicalLogWriteOptions
): Promise<AircraftTechnicalLog> => {
  try {
    const payload = normalizeAtlPilotAcceptanceNameForApi(
      await mergeAtlFilePathsIntoPayload(
        data as Record<string, unknown>,
        files
      )
    );
    if (!options?.skipNatureRequiredValidation) {
      assertAtlNatureRequiredFields(payload, "update");
    }
    const response = await apiClient.put(
      `aircraft-technical-log/${logId}`,
      payload
    );
    const raw = response.data?.data ?? response.data;
    return toCamelDeep(raw) as AircraftTechnicalLog;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete (soft delete) an Aircraft Technical Log entry
 */
export const deleteAircraftTechnicalLog = async (
  logId: number
): Promise<void> => {
  try {
    await apiClient.delete(`aircraft-technical-log/${logId}`);
  } catch (error) {
    throw error;
  }
};

/**
 * Get the latest Aircraft Technical Log entry for a specific aircraft.
 * With `batchId`: GET /aircraft-technical-log/latest/batch/{batch_id}?aircraft_id=
 * Without batch: GET /aircraft-technical-log/latest?aircraft_id=
 * Prefer `resolvePreviousAtlForNewEntry` for Add Record (batch → latest → Aircraft Details).
 * Backend compares sequence_no numerically and ignores soft-deleted rows.
 */
export const getLatestAircraftTechnicalLog = async (
  aircraftFk: number,
  batchId?: number | null
): Promise<AircraftTechnicalLog | null> => {
  try {
    const params = new URLSearchParams({
      aircraft_id: String(aircraftFk),
    });
    const endpoint =
      batchId != null && Number.isFinite(batchId) && batchId > 0
        ? `aircraft-technical-log/latest/batch/${batchId}?${params.toString()}`
        : `aircraft-technical-log/latest?${params.toString()}`;
    const response = await apiClient.get(endpoint);
    const raw = response.data?.data ?? response.data;
    if (raw == null || typeof raw !== "object") return null;
    return toCamelDeep(raw) as AircraftTechnicalLog;
  } catch (error) {
    if ((error as any)?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Previous ATL by immediate sequence for Add Entry auto-fill.
 * GET /api/v1/aircraft-technical-log/previous
 *   ?aircraft_id={aircraftId}&batch_id={batchId}&sequence_no={currentSequenceNo}
 *
 * Backend resolves previous_sequence_no = sequence_no - 1 for the same aircraft + batch
 * (non-deleted). Returns null when that row does not exist (404 / empty body).
 */
export const getPreviousATL = async (args: {
  aircraftId: number;
  batchId: number;
  sequenceNo: string | number;
}): Promise<AircraftTechnicalLog | null> => {
  const aircraftId = Number(args.aircraftId);
  const batchId = Number(args.batchId);
  const sequenceNo = String(args.sequenceNo ?? "").trim();
  if (
    !Number.isFinite(aircraftId) ||
    aircraftId <= 0 ||
    !Number.isFinite(batchId) ||
    batchId <= 0 ||
    sequenceNo === ""
  ) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      aircraft_id: String(aircraftId),
      batch_id: String(batchId),
      sequence_no: sequenceNo,
    });
    const response = await apiClient.get(
      `aircraft-technical-log/previous?${params.toString()}`
    );
    const payload = response.data;
    const raw =
      payload?.data ??
      payload?.result ??
      payload?.previous ??
      payload?.previous_atl ??
      payload;
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    // Empty object / no identity fields → treat as not found
    const camel = toCamelDeep(raw) as AircraftTechnicalLog;
    if (
      camel.id == null &&
      camel.sequenceNo == null &&
      camel.nextInspectionDue == null &&
      camel.tachTimeDue == null
    ) {
      const keys = Object.keys(raw as object);
      if (keys.length === 0) return null;
    }
    return camel;
  } catch (error) {
    if (
      (error as { response?: { status?: number } })?.response?.status === 404
    ) {
      return null;
    }
    console.error("getPreviousATL failed:", error);
    return null;
  }
};

/**
 * Resolve previous ATL data for a new entry (shared by Operation ATL & Technical Logbook):
 * 1. When batch_id is assigned: GET .../latest/batch/{batch_id}?aircraft_id=
 * 2. If batch returns nothing (or no batch): GET .../latest?aircraft_id=
 *    — always the last ATL fallback before Aircraft Details
 * 3. Caller falls back to Aircraft Details (GET /aircraft/{id}) only when this returns null
 */
export const resolvePreviousAtlForNewEntry = async (
  aircraftFk: number,
  batchId?: number | null
): Promise<AircraftTechnicalLog | null> => {
  if (batchId != null && Number.isFinite(batchId) && batchId > 0) {
    const fromBatch = await getLatestAircraftTechnicalLog(aircraftFk, batchId);
    if (fromBatch != null) return fromBatch;
  }
  return getLatestAircraftTechnicalLog(aircraftFk);
};

/** POST /api/v1/import-excel — async job accepted (e.g. 202). */
export interface AtlExcelImportStartResponse {
  jobId: string;
  status: string;
  message?: string;
}

/** GET /api/v1/import-progress/{job_id} */
export interface AtlExcelImportProgress {
  jobId: string;
  progress?: number;
  status: string;
  message?: string;
  totalRows?: number;
  processedRows?: number;
  failedRows?: number;
  errors?: unknown;
  errorReport?: string;
}

function parseAtlExcelImportStart(raw: unknown): AtlExcelImportStartResponse {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const jobId = String(o.job_id ?? o.jobId ?? "").trim();
  if (!jobId) {
    throw new Error("Import did not return a job id.");
  }
  return {
    jobId,
    status: String(o.status ?? ""),
    message:
      o.message != null && String(o.message).trim() !== ""
        ? String(o.message)
        : undefined,
  };
}

function firstFiniteNumber(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseAtlExcelImportProgress(raw: unknown): AtlExcelImportProgress {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const jobId = String(o.job_id ?? o.jobId ?? "").trim();
  return {
    jobId,
    progress: firstFiniteNumber(
      o.progress,
      o.progress_percent,
      o.progressPercent,
      o.percent,
      o.percent_complete,
      o.percentComplete
    ),
    status: String(o.status ?? "").trim(),
    message:
      o.message != null && String(o.message).trim() !== ""
        ? String(o.message)
        : undefined,
    totalRows: firstFiniteNumber(
      o.total_rows,
      o.totalRows,
      o.total,
      o.row_count,
      o.rowCount
    ),
    processedRows: firstFiniteNumber(
      o.processed_rows,
      o.processedRows,
      o.processed,
      o.success_rows,
      o.successRows
    ),
    failedRows: firstFiniteNumber(
      o.failed_rows,
      o.failedRows,
      o.failed,
      o.error_rows,
      o.errorRows
    ),
    errors: o.errors,
    errorReport:
      o.error_report != null && String(o.error_report).trim() !== ""
        ? String(o.error_report)
        : o.errorReport != null && String(o.errorReport).trim() !== ""
          ? String(o.errorReport)
          : undefined,
  };
}

function importRowsDoneCount(data: AtlExcelImportProgress): number | undefined {
  const total = data.totalRows ?? 0;
  if (total <= 0) return undefined;
  const processed = Math.max(0, data.processedRows ?? 0);
  const failed = Math.max(0, data.failedRows ?? 0);
  let sum = processed + failed;
  if (sum > total && processed <= total) {
    sum = processed;
  }
  return Math.min(total, sum);
}

function statusPhaseHint(status: string): string {
  const s = status.toUpperCase().replace(/\s+/g, "_");
  if (
    s.includes("PEND") ||
    s === "QUEUED" ||
    s === "WAITING" ||
    s.includes("ACCEPTED")
  ) {
    return "Waiting to start…";
  }
  if (
    s.includes("RUN") ||
    s.includes("PROCESS") ||
    s.includes("IMPORT") ||
    s === "ACTIVE" ||
    s === "WORKING"
  ) {
    return "Processing rows…";
  }
  return "Working…";
}

/**
 * Human-readable line for import UI: API message plus row counts when present.
 */
export function formatAtlExcelImportProgressLabel(
  data: AtlExcelImportProgress
): string {
  const msg = data.message?.trim();
  const total = data.totalRows ?? 0;
  const processed = Math.max(0, data.processedRows ?? 0);
  const failed = Math.max(0, data.failedRows ?? 0);
  const bits: string[] = [];
  if (msg) bits.push(msg);
  const done = importRowsDoneCount(data);
  if (done != null && total > 0) {
    bits.push(`${done} of ${total} rows`);
  } else if (total > 0) {
    bits.push(
      `${processed} processed${
        failed ? `, ${failed} failed` : ""
      } · ${total} total`
    );
  }
  if (bits.length > 0) return bits.join(" · ");
  return statusPhaseHint(data.status);
}

/**
 * 0–100 for UI: honors API `progress` (0–100 or 0–1), row counts, and terminal status.
 */
export function getAtlExcelImportProcessPercent(
  data: AtlExcelImportProgress
): number {
  const st = data.status.toUpperCase().replace(/\s+/g, "_");
  if (st === "COMPLETED" || st === "COMPLETE" || st === "SUCCESS") {
    return 100;
  }
  if (st === "FAILED" || st === "ERROR" || st === "CANCELLED" || st === "VALIDATION_FAILED") {
    const fromRows = percentFromRowCounts(data, true);
    if (fromRows != null) return fromRows;
    const fromProg = normalizeProgressField(data.progress);
    return fromProg ?? 0;
  }

  const fromProg = normalizeProgressField(data.progress);
  if (fromProg != null) {
    if (fromProg >= 100 && !isTerminalImportStatus(data.status)) return 99;
    return fromProg;
  }

  const fromRows = percentFromRowCounts(data, false);
  if (fromRows != null) return fromRows;

  if (st.includes("PEND") || st === "QUEUED" || st === "WAITING") return 2;
  if (
    st.includes("RUN") ||
    st.includes("PROCESS") ||
    st.includes("IMPORT") ||
    st === "ACTIVE"
  ) {
    return 8;
  }
  return 0;
}

function isTerminalImportStatus(st: string): boolean {
  const u = st.toUpperCase().replace(/\s+/g, "_");
  return (
    u === "COMPLETED" ||
    u === "COMPLETE" ||
    u === "SUCCESS" ||
    u === "FAILED" ||
    u === "VALIDATION_FAILED" ||
    u === "ERROR" ||
    u === "CANCELLED"
  );
}

/** `progress` as 0–100, or 0–1 ratio from API. */
function normalizeProgressField(p: number | undefined): number | undefined {
  if (p == null || !Number.isFinite(p)) return undefined;
  if (p > 0 && p <= 1) return Math.min(100, Math.round(p * 100));
  return Math.min(100, Math.max(0, Math.round(p)));
}

function percentFromRowCounts(
  data: AtlExcelImportProgress,
  forFailed: boolean
): number | undefined {
  const total = data.totalRows ?? 0;
  if (total <= 0) return undefined;
  const done = importRowsDoneCount(data);
  if (done == null) return undefined;
  const pct = Math.round((done / total) * 100);
  if (!forFailed && pct >= 100 && !isTerminalImportStatus(data.status)) {
    return 99;
  }
  return Math.min(100, Math.max(0, pct));
}

/** Default delay between GET import-progress polls (ms). Lower = snappier UI; avoid flooding the server. */
const ATL_EXCEL_IMPORT_POLL_INTERVAL_MS = 500;

/**
 * POST /api/v1/import-excel — multipart: file, batch_id (required), aircraft_id and/or registration.
 * Returns 202 Accepted; long timeout for large workbooks on slow links.
 */
export async function startAtlExcelImport(args: {
  file: File;
  batchId: number;
  aircraftId?: number;
  registration?: string;
}): Promise<AtlExcelImportStartResponse> {
  if (!Number.isFinite(args.batchId) || args.batchId <= 0) {
    throw new Error("batch_id is required for ATL Excel import.");
  }
  const form = new FormData();
  form.append("file", args.file);
  form.append("batch_id", String(args.batchId));
  if (args.aircraftId != null && args.aircraftId > 0) {
    form.append("aircraft_id", String(args.aircraftId));
  }
  const reg = args.registration?.trim();
  if (reg) form.append("registration", reg);
  const res = await apiClient.post("import-excel", form, {
    headers: { Accept: "application/json" },
    timeout: 900_000,
  });
  const raw = res.data?.data ?? res.data;
  return parseAtlExcelImportStart(raw);
}

export async function getAtlExcelImportProgress(
  jobId: string
): Promise<AtlExcelImportProgress> {
  const res = await apiClient.get(
    `import-progress/${encodeURIComponent(jobId)}`,
    {
      headers: { Accept: "application/json" },
      timeout: 25_000,
    }
  );
  const raw = res.data?.data ?? res.data;
  return parseAtlExcelImportProgress(raw);
}

export async function pollAtlExcelImportUntilDone(
  jobId: string,
  options?: {
    intervalMs?: number;
    onUpdate?: (data: AtlExcelImportProgress) => void;
  }
): Promise<AtlExcelImportProgress> {
  const intervalMs = options?.intervalMs ?? ATL_EXCEL_IMPORT_POLL_INTERVAL_MS;
  let last: AtlExcelImportProgress;
  for (;;) {
    last = await getAtlExcelImportProgress(jobId);
    options?.onUpdate?.(last);
    const s = last.status.toUpperCase().replace(/\s+/g, "_");
    if (
      s === "COMPLETED" ||
      s === "COMPLETE" ||
      s === "SUCCESS" ||
      s === "FAILED" ||
      s === "VALIDATION_FAILED" ||
      s === "ERROR" ||
      s === "CANCELLED"
    ) {
      return last;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** ATL batch row for dropdowns (GET list endpoint). */
export interface AtlBatch {
  id: number;
  name: string;
  description?: string;
  aircraftId?: number | null;
  /** ISO or parseable date when API sends created_at / createdAt */
  createdAt?: string;
}

function unwrapAtlBatchRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const nested = r.data ?? r.atl_batch ?? r.atlBatch ?? r.result ?? r.item;
  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    (nested as Record<string, unknown>).id != null
  ) {
    return nested as Record<string, unknown>;
  }
  return r;
}

function parseAtlBatchPayload(raw: unknown): AtlBatch {
  const r = unwrapAtlBatchRecord(raw);
  const id = Number(r.id ?? r.pk ?? 0);
  const name = String(r.name ?? r.batch_name ?? r.batchName ?? "").trim();
  const description =
    r.description != null ? String(r.description).trim() : undefined;
  const createdRaw = r.created_at ?? r.createdAt;
  const createdAt =
    createdRaw != null && String(createdRaw).trim() !== ""
      ? String(createdRaw).trim()
      : undefined;
  const aircraftRaw = r.aircraft_id ?? r.aircraftId;
  const aircraftId =
    aircraftRaw == null || aircraftRaw === ""
      ? null
      : Number(aircraftRaw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid ATL batch response from server.");
  }
  return {
    id,
    name: name || `Batch ${id}`,
    aircraftId:
      aircraftId != null && Number.isFinite(aircraftId) ? aircraftId : null,
    ...(description !== undefined && description !== "" ? { description } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
  };
}

/** Default filter selection: most recently created batch (by createdAt when present, else highest id). */
export function pickLatestAtlBatchId(batches: AtlBatch[]): number | null {
  if (!batches.length) return null;
  const dated = batches.filter(
    (b) => b.createdAt != null && String(b.createdAt).trim() !== ""
  );
  if (dated.length > 0) {
    const sorted = [...dated].sort(
      (a, b) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
    return sorted[0].id;
  }
  return Math.max(...batches.map((b) => b.id));
}

export interface PaginatedAtlBatchesResponse {
  items: AtlBatch[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Paged list for ATL Batch Settings.
 * GET /api/v1/atl-batch/paged?page=&page_size=
 */
export async function getAtlBatchesPaged(
  page = 1,
  limit = DEFAULT_API_PAGE_SIZE
): Promise<PaginatedAtlBatchesResponse> {
  const params = new URLSearchParams();
  appendPagedQueryParams(params, page, limit);
  const res = await apiClient.get(`atl-batch/paged?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list
    .map((row: Record<string, unknown>) => {
      try {
        return parseAtlBatchPayload(row);
      } catch {
        return null;
      }
    })
    .filter((b): b is AtlBatch => b != null);
  const total = raw.total ?? raw.count ?? items.length;
  const pages = raw.pages ?? Math.max(1, Math.ceil(Number(total) / limit));
  return {
    items,
    total: Number(total),
    page: Number(raw.page ?? page),
    pages: Number(pages),
  };
}

/**
 * Options for ATL batch `<select>` (filter form, entry modal).
 * GET /api/v1/atl-batch/list
 */
export async function getAtlBatchesForSelect(
  aircraftId?: number | null
): Promise<AtlBatch[]> {
  try {
    const params = new URLSearchParams();
    if (aircraftId != null && Number.isFinite(aircraftId) && aircraftId > 0) {
      params.set("aircraft_id", String(aircraftId));
    }
    const qs = params.toString();
    const res = await apiClient.get(
      qs ? `atl-batch/list?${qs}` : "atl-batch/list",
      {
        headers: { Accept: "application/json" },
      }
    );
    const data = res.data?.data ?? res.data;
    const raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((row: Record<string, unknown>) => {
        try {
          return parseAtlBatchPayload(row);
        } catch {
          return null;
        }
      })
      .filter((b): b is AtlBatch => b != null);
  } catch {
    return [];
  }
}

/**
 * GET /api/v1/atl-batch/{id}/
 */
export async function getAtlBatchById(id: number): Promise<AtlBatch> {
  const res = await apiClient.get(`atl-batch/${id}/`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  return parseAtlBatchPayload(raw);
}

/**
 * Create an ATL batch — POST /api/v1/atl-batch/
 */
export async function createAtlBatch(payload: {
  name: string;
  description?: string;
  aircraftId?: number | null;
}): Promise<AtlBatch> {
  const body = {
    name: payload.name.trim(),
    ...(payload.description != null && payload.description.trim() !== ""
      ? { description: payload.description.trim() }
      : {}),
    ...(payload.aircraftId != null && Number.isFinite(payload.aircraftId)
      ? { aircraft_id: payload.aircraftId }
      : {}),
  };
  const res = await apiClient.post("atl-batch/", body, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  return parseAtlBatchPayload(raw);
}

/**
 * Update an ATL batch — PATCH /api/v1/atl-batch/{id}/
 */
export async function updateAtlBatch(
  id: number,
  payload: { name: string; description?: string }
): Promise<AtlBatch> {
  const body = {
    name: payload.name.trim(),
    description: (payload.description ?? "").trim(),
  };
  const res = await apiClient.patch(`atl-batch/${id}/`, body, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  return parseAtlBatchPayload(raw);
}

/**
 * Delete an ATL batch — DELETE /api/v1/atl-batch/{id}/
 */
export async function deleteAtlBatch(id: number): Promise<void> {
  await apiClient.delete(`atl-batch/${id}/`, {
    headers: { Accept: "application/json" },
  });
}
