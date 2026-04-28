import apiClient from "./index";
import { toCamelDeep } from "../utility/utils";

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
  maintenanceFk?: number;
  pilotAcceptedBy?: number;
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
  rtsSignedBy?: number;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
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
}

/** Per-row component times as shown on Operation ATL list (client-computed when API omits cumulative fields). */
export interface AtlListViewComputedComponentTimes {
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
  pilotFk?: number;
  maintenanceFk?: number;
  pilotAcceptedBy?: number;
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
  rtsSignedBy?: number;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
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
  pilotFk?: number;
  maintenanceFk?: number;
  pilotAcceptedBy?: number;
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
  rtsSignedBy?: number;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
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

const ATL_COMPONENT_METRIC_CANDIDATES: Record<AtlComponentMetric, string[]> = {
  airframeRunTime: [
    "autoAirframeRunTime",
    "auto_airframe_run_time",
    "airframeRunTime",
    "airframeTotalTime",
    "airframeRun",
  ],
  airframeAftt: [
    "autoAirframeAftt",
    "auto_airframe_aftt",
    "airframeAftt",
    "airframeTotalTime",
  ],
  engineRunTime: [
    "autoEngineRunTime",
    "auto_engine_run_time",
    "engineRunTime",
    "engineTotalTime",
    "engineRun",
  ],
  engineTsn: ["autoEngineTsn", "auto_engine_tsn", "engineTsn", "engine_tsn"],
  engineTso: ["autoEngineTso", "auto_engine_tso", "engineTso", "engine_tso"],
  engineTbo: ["autoEngineTbo", "auto_engine_tbo", "engineTbo", "engine_tbo"],
  propellerRunTime: [
    "autoPropellerRunTime",
    "auto_propeller_run_time",
    "propellerRunTime",
    "propellerTotalTime",
    "propellerRun",
  ],
  propellerTsn: [
    "autoPropellerTsn",
    "auto_propeller_tsn",
    "propellerTsn",
    "propeller_tsn",
  ],
  propellerTso: [
    "autoPropellerTso",
    "auto_propeller_tso",
    "propellerTso",
    "propeller_tso",
  ],
  propellerTbo: [
    "autoPropellerTbo",
    "auto_propeller_tbo",
    "propellerTbo",
    "propeller_tbo",
  ],
};

export function resolveAtlComponentMetric(
  entry: AircraftTechnicalLog | Record<string, unknown> | null | undefined,
  metric: AtlComponentMetric
): unknown {
  if (!entry || typeof entry !== "object") return undefined;

  const record = entry as Record<string, unknown>;
  const auto =
    record.auto && typeof record.auto === "object"
      ? (record.auto as Record<string, unknown>)
      : null;
  const airframe =
    record.airframe && typeof record.airframe === "object"
      ? (record.airframe as Record<string, unknown>)
      : null;
  const engine =
    record.engine && typeof record.engine === "object"
      ? (record.engine as Record<string, unknown>)
      : null;
  const propeller =
    record.propeller && typeof record.propeller === "object"
      ? (record.propeller as Record<string, unknown>)
      : null;

  for (const key of ATL_COMPONENT_METRIC_CANDIDATES[metric]) {
    const value = record[key];
    if (value != null && value !== "") return value;
  }

  const nestedCandidates: Record<AtlComponentMetric, unknown[]> = {
    airframeRunTime: [
      auto?.airframeRunTime,
      auto?.airframe_run_time,
      airframe?.hrsTime,
      airframe?.run,
    ],
    airframeAftt: [
      auto?.airframeAftt,
      auto?.airframe_aftt,
      airframe?.aftt,
    ],
    engineRunTime: [
      auto?.engineRunTime,
      auto?.engine_run_time,
      engine?.hrsTime,
      engine?.run,
    ],
    engineTsn: [
      auto?.engineTsn,
      auto?.engine_tsn,
      engine?.tsn,
      engine?.engineTsn,
      engine?.engine_tsn,
    ],
    engineTso: [
      auto?.engineTso,
      auto?.engine_tso,
      engine?.tso,
      engine?.engineTso,
      engine?.engine_tso,
    ],
    engineTbo: [
      auto?.engineTbo,
      auto?.engine_tbo,
      engine?.tbo,
      engine?.engineTbo,
      engine?.engine_tbo,
    ],
    propellerRunTime: [
      auto?.propellerRunTime,
      auto?.propeller_run_time,
      propeller?.hrsTime,
      propeller?.run,
    ],
    propellerTsn: [
      auto?.propellerTsn,
      auto?.propeller_tsn,
      propeller?.tsn,
      propeller?.propellerTsn,
      propeller?.propeller_tsn,
    ],
    propellerTso: [
      auto?.propellerTso,
      auto?.propeller_tso,
      propeller?.tso,
      propeller?.propellerTso,
      propeller?.propeller_tso,
    ],
    propellerTbo: [
      auto?.propellerTbo,
      auto?.propeller_tbo,
      propeller?.tbo,
      propeller?.propellerTbo,
      propeller?.propeller_tbo,
    ],
  };

  return nestedCandidates[metric].find((value) => value != null && value !== "");
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

const fetchAircraftTechnicalLogs = async (
  endpoint: string,
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number,
  sort = "",
  workStatus?: string
): Promise<PaginatedResponse<AircraftTechnicalLog>> => {
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    if (search.trim() !== "") {
      params.append("search", search);
    }

    if (aircraftFk) {
      params.append("aircraft_fk", aircraftFk.toString());
    }

    if (sort) {
      params.append("sort", sort);
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
 * Get paginated list of Aircraft Technical Log entries for operation views
 */
export const getAircraftTechnicalLogs = async (
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number,
  sort = "",
  workStatus?: string
): Promise<PaginatedResponse<AircraftTechnicalLog>> =>
  fetchAircraftTechnicalLogs(
    "aircraft-technical-log/paged",
    page,
    limit,
    search,
    aircraftFk,
    sort,
    workStatus
  );

/**
 * Get paginated list of Aircraft Technical Log entries for manage/list views
 */
export const getManagedAircraftTechnicalLogs = async (
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number,
  sort = "",
  workStatus?: string
): Promise<PaginatedResponse<AircraftTechnicalLog>> =>
  fetchAircraftTechnicalLogs(
    "aircraft-technical-log/manage/paged",
    page,
    limit,
    search,
    aircraftFk,
    sort,
    workStatus
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

/**
 * Search Aircraft Technical Log by ATL Sequence Number.
 * GET /api/v1/aircraft-technical-log/?search=<query>
 * Returns items with sequence_no and aircraft { id, registration, model, type }.
 */
export const searchAircraftTechnicalLogBySequence = async (
  search: string
): Promise<AircraftTechnicalLogSearchResult[]> => {
  try {
    const params = new URLSearchParams();
    if (search.trim() !== "") {
      params.append("search", search.trim());
    }
    const response = await apiClient.get(
      `aircraft-technical-log/?${params.toString()}`,
      { headers: { Accept: "application/json" } }
    );
    const data = response.data?.data ?? response.data;
    let raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
    if (!Array.isArray(raw) || raw.length === 0) {
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        data.sequence_no != null
      ) {
        raw = [data];
      }
    }
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item: any) => {
      const aircraft = item.aircraft ?? item.aircraft_fk;
      const aircraftObj =
        aircraft && typeof aircraft === "object"
          ? {
              id: aircraft.id ?? aircraft.pk ?? 0,
              registration: aircraft.registration ?? "",
              model: aircraft.model ?? "",
              type: aircraft.type ?? "",
            }
          : { id: 0, registration: "", model: "", type: "" };
      const logId = Number(item.id ?? item.pk ?? 0);
      const tachRaw =
        item.tachometer_end ??
        item.tachometerEnd ??
        item.tach_end ??
        item.tachEnd;
      const tachNum =
        tachRaw != null && tachRaw !== ""
          ? Number(typeof tachRaw === "string" ? tachRaw.replace(/,/g, "") : tachRaw)
          : NaN;
      const afttRaw =
        item.auto_airframe_aftt ??
        item.autoAirframeAftt ??
        item.airframe_aftt ??
        item.airframeAftt;
      const afttNum =
        afttRaw != null && afttRaw !== ""
          ? Number(typeof afttRaw === "string" ? afttRaw.replace(/,/g, "") : afttRaw)
          : NaN;
      const originDateRaw =
        item.origin_date ?? item.originDate ?? item.date_of_origin ?? item.dateOfOrigin;
      return {
        id: Number.isFinite(logId) ? logId : 0,
        sequenceNo:
          item.sequence_no ?? item.sequenceNo ?? item.sequence_number ?? "",
        aircraft: aircraftObj,
        natureOfFlight:
          item.nature_of_flight ?? item.natureOfFlight ?? undefined,
        tachometerEnd: Number.isFinite(tachNum) ? tachNum : undefined,
        autoAirframeAftt: Number.isFinite(afttNum) ? afttNum : undefined,
        originDate:
          originDateRaw != null && String(originDateRaw).trim() !== ""
            ? String(originDateRaw).trim()
            : undefined,
      };
    });
  } catch (error) {
    throw error;
  }
};

/** Optional file uploads for WHITE ATL and DFP (multipart) */
export interface AircraftTechnicalLogFiles {
  whiteAtl?: File | null;
  dfp?: File | null;
}

/**
 * Create a new Aircraft Technical Log entry.
 * Persists to database via POST /api/v1/aircraft-technical-log/
 * When files are provided, sends multipart/form-data with json_data + white_atl and dfp file fields.
 * ATL table fields (airframe_run_time, airframe_aftt, engine_*, propeller_*, life_time_limit_engine, life_time_limit_propeller) are stored when sent in the payload.
 */
export const createAircraftTechnicalLog = async (
  data: AircraftTechnicalLogCreate | Record<string, unknown>,
  files?: AircraftTechnicalLogFiles
): Promise<AircraftTechnicalLog> => {
  try {
    const hasFiles =
      files && (files.whiteAtl instanceof File || files.dfp instanceof File);
    if (hasFiles) {
      const formData = new FormData();
      formData.append("json_data", JSON.stringify(data));
      if (files.whiteAtl instanceof File) {
        formData.append("white_atl", files.whiteAtl);
      }
      if (files.dfp instanceof File) {
        formData.append("dfp", files.dfp);
      }
      const response = await apiClient.post(
        "aircraft-technical-log/",
        formData,
        {
          headers: { Accept: "application/json" },
          // Do not set Content-Type — browser sets multipart/form-data with boundary
        }
      );
      const raw = response.data?.data ?? response.data;
      return toCamelDeep(raw) as AircraftTechnicalLog;
    }
    const response = await apiClient.post("aircraft-technical-log/", data);
    const raw = response.data?.data ?? response.data;
    return toCamelDeep(raw) as AircraftTechnicalLog;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an Aircraft Technical Log entry.
 * Persists to database via PUT /api/v1/aircraft-technical-log/{id}
 * When files are provided, sends multipart/form-data with json_data + white_atl and dfp file fields.
 * ATL table fields are updated when sent in the payload.
 */
export const updateAircraftTechnicalLog = async (
  logId: number,
  data: AircraftTechnicalLogUpdate | Record<string, unknown>,
  files?: AircraftTechnicalLogFiles
): Promise<AircraftTechnicalLog> => {
  try {
    const hasFiles =
      files && (files.whiteAtl instanceof File || files.dfp instanceof File);
    if (hasFiles) {
      const formData = new FormData();
      formData.append("json_data", JSON.stringify(data));
      if (files.whiteAtl instanceof File) {
        formData.append("white_atl", files.whiteAtl);
      }
      if (files.dfp instanceof File) {
        formData.append("dfp", files.dfp);
      }
      const response = await apiClient.put(
        `aircraft-technical-log/${logId}`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );
      const raw = response.data?.data ?? response.data;
      return toCamelDeep(raw) as AircraftTechnicalLog;
    }

    const response = await apiClient.put(
      `aircraft-technical-log/${logId}`,
      data
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
 * Get the latest Aircraft Technical Log entry for a specific aircraft
 */
export const getLatestAircraftTechnicalLog = async (
  aircraftFk: number
): Promise<AircraftTechnicalLog | null> => {
  try {
    const response = await apiClient.get(
      `aircraft-technical-log/latest?aircraft_fk=${aircraftFk}`
    );
    const raw = response.data?.data ?? response.data;
    if (raw == null || typeof raw !== "object") return null;
    return toCamelDeep(raw) as AircraftTechnicalLog;
  } catch (error) {
    // If no latest entry exists, return null
    if ((error as any)?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Import Aircraft Technical Log entries from Excel file.
 * POST /api/v1/excel-data/aircraft-technical-log/import
 * Sends aircraft_id in query and in form body for compatibility.
 */
export const importAircraftTechnicalLogExcel = async (
  file: File,
  aircraftId: number
): Promise<{ data?: unknown }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("aircraft_id", String(aircraftId));
  formData.append("aircraft_fk", String(aircraftId));
  const response = await apiClient.post(
    `excel-data/aircraft-technical-log/import?aircraft_id=${aircraftId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data ?? response;
};
