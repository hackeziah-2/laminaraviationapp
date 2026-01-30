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
  | "TR"
  | "PSF"
  | "PRF"
  | "EGR"
  | "ME"
  | "TR W/ PIREM"
  | "VOID"
  | "VE"
  | "EOR"
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
  engineTotalTime?: number;
  propellerTotalTime?: number;
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
  rtsSignedBy?: number;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
  componentParts?: ComponentPartsRecordCreate[];
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
  rtsSignedBy?: number;
  rtsDate?: string;
  rtsTime?: string;
  whiteAtl?: string;
  dfp?: string;
  componentParts?: ComponentPartsRecordCreate[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
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
 * Create a new Aircraft Technical Log entry
 */
export const createAircraftTechnicalLog = async (
  data: AircraftTechnicalLogCreate
): Promise<AircraftTechnicalLog> => {
  try {
    const response = await apiClient.post("aircraft-technical-log/", data);
    return toCamel(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Update an Aircraft Technical Log entry
 */
export const updateAircraftTechnicalLog = async (
  logId: number,
  data: AircraftTechnicalLogUpdate
): Promise<AircraftTechnicalLog> => {
  try {
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
        return result;
      }
      return obj;
    };

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
