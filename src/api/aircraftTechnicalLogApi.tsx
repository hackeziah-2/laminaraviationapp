import apiClient from "./index";
import { toCamel } from "../utility/utils";

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
  | "None"
  | "TR"
  | "PSF"
  | "PRF"
  | "EGR"
  | "ME"
  | "TR W/ PIREM"
  | "VOID"
  | "VE"
  | "EOR"
  | "ATL_REPL"
  | "OTHER";

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
  sequenceNo: string;
  aircraft: AircraftTechnicalLogSearchAircraft;
}

// CRUD Operations

/**
 * Get paginated list of Aircraft Technical Log entries
 */
export const getAircraftTechnicalLogs = async (
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number,
  sort = ""
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

    const response = await apiClient.get(
      `aircraft-technical-log/paged?${params.toString()}`
    );

    // Transform the response to camelCase (recursively handle nested objects and arrays)
    const transformToCamel = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(transformToCamel);
      }
      if (obj !== null && typeof obj === "object") {
        const result: any = {};
        for (const key in obj) {
          const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          console.log(camel, "camelcamelcamelcamel");
          result[camel] = transformToCamel(obj[key]);
        }
        return result;
      }
      return obj;
    };

    const transformedItems = response.data.items.map((item: any) =>
      transformToCamel(item)
    );

    return {
      items: transformedItems,
      total: response.data.total,
      page: response.data.page,
      pages: response.data.pages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single Aircraft Technical Log entry by ID
 */
export const getAircraftTechnicalLogById = async (
  logId: number
): Promise<AircraftTechnicalLog> => {
  try {
    const response = await apiClient.get(`aircraft-technical-log/${logId}`);

    // Transform the response to camelCase (recursively handle nested objects and arrays)
    const transformToCamel = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(transformToCamel);
      }
      if (obj !== null && typeof obj === "object") {
        const result: any = {};
        for (const key in obj) {
          const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          result[camel] = transformToCamel(obj[key]);
        }
        console.log(result);
        return result;
      }
      return obj;
    };

    return transformToCamel(response.data);
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
      return {
        sequenceNo:
          item.sequence_no ?? item.sequenceNo ?? item.sequence_number ?? "",
        aircraft: aircraftObj,
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
      files &&
      (files.whiteAtl instanceof File || files.dfp instanceof File);
    if (hasFiles) {
      const formData = new FormData();
      formData.append("json_data", JSON.stringify(data));
      if (files.whiteAtl instanceof File) {
        formData.append("white_atl", files.whiteAtl);
      }
      if (files.dfp instanceof File) {
        formData.append("dfp", files.dfp);
      }
      const response = await apiClient.post("aircraft-technical-log/", formData, {
        headers: { Accept: "application/json" },
        // Do not set Content-Type — browser sets multipart/form-data with boundary
      });
      return toCamel(response.data);
    }
    const response = await apiClient.post("aircraft-technical-log/", data);
    return toCamel(response.data);
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
    const transformToCamel = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(transformToCamel);
      }
      if (obj !== null && typeof obj === "object") {
        const result: any = {};
        for (const key in obj) {
          const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          result[camel] = transformToCamel(obj[key]);
        }
        return result;
      }
      return obj;
    };

    const hasFiles =
      files &&
      (files.whiteAtl instanceof File || files.dfp instanceof File);
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
      return transformToCamel(response.data);
    }

    const response = await apiClient.put(
      `aircraft-technical-log/${logId}`,
      data
    );
    return transformToCamel(response.data);
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
    return toCamel(response.data);
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
