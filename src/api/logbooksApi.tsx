import apiClient from "./index";
import { toCamel } from "../utility/utils";

// Common interfaces
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// Mechanic nested object (returned by API with logbook entries)
export interface Mechanic {
  id?: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  licenseNo?: string;
}

// Component part record (Avionics, Airframe, Engine logbooks) – matches backend schema
export interface ComponentPart {
  id?: number;
  qty?: number;
  unit?: string;
  nomenclature?: string;
  removedPartNo?: string;
  removedSerialNo?: string;
  installedPartNo?: string;
  installedSerialNo?: string;
  ataChapter?: string;
  engineLogFk?: number;
  airframeLogFk?: number;
  avionicsLogFk?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Engine Logbook Interfaces (backend field: aircraft_fk)
export interface EngineLogbook {
  id: number;
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  engineTsn?: number;
  sequenceNo?: string;
  /** Backend: logbook_seq_no (String(50)) */
  logbookSeqNo?: string;
  tachTime?: number;
  engineTso?: number;
  engineTbo?: number;
  description?: string;
  mechanicFk?: number;
  mechanic?: Mechanic;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  uploadFile?: string;
  webLink?: string;
  componentParts?: ComponentPart[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EngineLogbookCreate {
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  engineTsn?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  tachTime?: number;
  engineTso?: number;
  engineTbo?: number;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

export interface EngineLogbookUpdate {
  aircraftFk?: number;
  aircraft_fk?: number;
  date?: string;
  engineTsn?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  tachTime?: number;
  engineTso?: number;
  engineTbo?: number;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

// Airframe Logbook Interfaces (backend field: aircraft_fk)
export interface AirframeLogbook {
  id: number;
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  tachTime?: number;
  sequenceNo?: string;
  /** Backend: logbook_seq_no (String(50)) */
  logbookSeqNo?: string;
  airframeTime?: number;
  description?: string;
  mechanicFk?: number;
  mechanic?: Mechanic;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  uploadFile?: string;
  webLink?: string;
  componentParts?: ComponentPart[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AirframeLogbookCreate {
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  tachTime?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  airframeTime?: number;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

export interface AirframeLogbookUpdate {
  aircraftFk?: number;
  aircraft_fk?: number;
  date?: string;
  tachTime?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  airframeTime?: number;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

// Avionics Logbook Interfaces (backend field: aircraft_fk)
export interface AvionicsLogbook {
  id: number;
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  airframeTsn?: number;
  sequenceNo?: string;
  /** Backend: logbook_seq_no (String(50)) */
  logbookSeqNo?: string;
  component?: string;
  partNo?: string;
  serialNo?: string;
  description?: string;
  mechanicFk?: number;
  mechanic?: Mechanic;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  uploadFile?: string;
  webLink?: string;
  componentParts?: ComponentPart[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AvionicsLogbookCreate {
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  airframeTsn?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  component?: string;
  partNo?: string;
  serialNo?: string;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

export interface AvionicsLogbookUpdate {
  aircraftFk?: number;
  aircraft_fk?: number;
  date?: string;
  airframeTsn?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  component?: string;
  partNo?: string;
  serialNo?: string;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

// Propeller Logbook Interfaces (backend field: aircraft_fk)
export interface PropellerLogbook {
  id: number;
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  propellerTsn?: number;
  sequenceNo?: string;
  /** Backend: logbook_seq_no (String(50)) */
  logbookSeqNo?: string;
  tachTime?: number;
  propellerTso?: number;
  propellerTbo?: number;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  uploadFile?: string;
  webLink?: string;
  componentParts?: ComponentPart[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PropellerLogbookCreate {
  aircraftFk: number;
  aircraft_fk?: number;
  date?: string;
  propellerTsn?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  tachTime?: number;
  propellerTso?: number;
  propellerTbo?: number;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

export interface PropellerLogbookUpdate {
  aircraftFk?: number;
  aircraft_fk?: number;
  date?: string;
  propellerTsn?: number;
  sequenceNo?: string;
  logbookSeqNo?: string;
  tachTime?: number;
  propellerTso?: number;
  propellerTbo?: number;
  description?: string;
  mechanicFk?: number;
  mechanicName?: string;
  licenseNumber?: string;
  signature?: string;
  webLink?: string | null;
  componentParts?: ComponentPart[];
}

// Transform response to camelCase (recursively handle nested objects and arrays)
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

// Ensure aircraft_fk from API is exposed as aircraftFk on logbook items (transformToCamel already converts component_parts -> componentParts)
const normalizeLogbookItem = (item: any): any => {
  const c = transformToCamel(item);
  if (c != null && typeof c === "object") {
    const aircraftFk = c.aircraftFk ?? item?.aircraft_fk ?? item?.aircraftFk;
    if (aircraftFk != null) {
      return { ...c, aircraftFk };
    }
  }
  return c;
};

// ==================== ENGINE LOGBOOK ====================

/**
 * Get paginated list of Engine Logbook entries
 */
export const getEngineLogbooks = async (
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number
): Promise<PaginatedResponse<EngineLogbook>> => {
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

    const response = await apiClient.get(
      `logbooks/engine/paged?${params.toString()}`
    );

    const transformedItems = response.data.items.map((item: any) =>
      normalizeLogbookItem(item)
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
 * Get Engine Logbook entry by ID
 */
export const getEngineLogbookById = async (
  logbookId: number
): Promise<EngineLogbook> => {
  try {
    const response = await apiClient.get(`logbooks/engine/${logbookId}`);
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Create Engine Logbook entry
 */
export const createEngineLogbook = async (
  data: EngineLogbookCreate | FormData
): Promise<EngineLogbook> => {
  try {
    const response = await apiClient.post("logbooks/engine", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Update Engine Logbook entry
 */
export const updateEngineLogbook = async (
  logbookId: number,
  data: EngineLogbookUpdate | FormData
): Promise<EngineLogbook> => {
  try {
    const response = await apiClient.put(`logbooks/engine/${logbookId}`, data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete Engine Logbook entry
 */
export const deleteEngineLogbook = async (
  logbookId: number
): Promise<void> => {
  try {
    await apiClient.delete(`logbooks/engine/${logbookId}`);
  } catch (error) {
    throw error;
  }
};

// ==================== AIRFRAME LOGBOOK ====================

/**
 * Get paginated list of Airframe Logbook entries
 */
export const getAirframeLogbooks = async (
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number
): Promise<PaginatedResponse<AirframeLogbook>> => {
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

    const response = await apiClient.get(
      `logbooks/airframe/paged?${params.toString()}`
    );

    const transformedItems = response.data.items.map((item: any) =>
      normalizeLogbookItem(item)
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
 * Get Airframe Logbook entry by ID
 */
export const getAirframeLogbookById = async (
  logbookId: number
): Promise<AirframeLogbook> => {
  try {
    const response = await apiClient.get(`logbooks/airframe/${logbookId}`);
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Create Airframe Logbook entry
 */
export const createAirframeLogbook = async (
  data: AirframeLogbookCreate | FormData
): Promise<AirframeLogbook> => {
  try {
    const response = await apiClient.post("logbooks/airframe", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Update Airframe Logbook entry
 */
export const updateAirframeLogbook = async (
  logbookId: number,
  data: AirframeLogbookUpdate | FormData
): Promise<AirframeLogbook> => {
  try {
    const response = await apiClient.put(`logbooks/airframe/${logbookId}`, data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete Airframe Logbook entry
 */
export const deleteAirframeLogbook = async (
  logbookId: number
): Promise<void> => {
  try {
    await apiClient.delete(`logbooks/airframe/${logbookId}`);
  } catch (error) {
    throw error;
  }
};

// ==================== AVIONICS LOGBOOK ====================

/**
 * Get paginated list of Avionics Logbook entries
 */
export const getAvionicsLogbooks = async (
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number
): Promise<PaginatedResponse<AvionicsLogbook>> => {
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

    const response = await apiClient.get(
      `logbooks/avionics/paged?${params.toString()}`
    );

    const transformedItems = response.data.items.map((item: any) =>
      normalizeLogbookItem(item)
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
 * Get Avionics Logbook entry by ID
 */
export const getAvionicsLogbookById = async (
  logbookId: number
): Promise<AvionicsLogbook> => {
  try {
    const response = await apiClient.get(`logbooks/avionics/${logbookId}`);
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Create Avionics Logbook entry
 */
export const createAvionicsLogbook = async (
  data: AvionicsLogbookCreate | FormData
): Promise<AvionicsLogbook> => {
  try {
    const response = await apiClient.post("logbooks/avionics", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Update Avionics Logbook entry
 */
export const updateAvionicsLogbook = async (
  logbookId: number,
  data: AvionicsLogbookUpdate | FormData
): Promise<AvionicsLogbook> => {
  try {
    const response = await apiClient.put(`logbooks/avionics/${logbookId}`, data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete Avionics Logbook entry
 */
export const deleteAvionicsLogbook = async (
  logbookId: number
): Promise<void> => {
  try {
    await apiClient.delete(`logbooks/avionics/${logbookId}`);
  } catch (error) {
    throw error;
  }
};

// ==================== PROPELLER LOGBOOK ====================

/**
 * Get paginated list of Propeller Logbook entries
 */
export const getPropellerLogbooks = async (
  page = 1,
  limit = 10,
  search = "",
  aircraftFk?: number
): Promise<PaginatedResponse<PropellerLogbook>> => {
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

    const response = await apiClient.get(
      `logbooks/propeller/paged?${params.toString()}`
    );

    const transformedItems = response.data.items.map((item: any) =>
      normalizeLogbookItem(item)
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
 * Get Propeller Logbook entry by ID
 */
export const getPropellerLogbookById = async (
  logbookId: number
): Promise<PropellerLogbook> => {
  try {
    const response = await apiClient.get(`logbooks/propeller/${logbookId}`);
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Create Propeller Logbook entry
 */
export const createPropellerLogbook = async (
  data: PropellerLogbookCreate | FormData
): Promise<PropellerLogbook> => {
  try {
    const response = await apiClient.post("logbooks/propeller", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Update Propeller Logbook entry
 */
export const updatePropellerLogbook = async (
  logbookId: number,
  data: PropellerLogbookUpdate | FormData
): Promise<PropellerLogbook> => {
  try {
    const response = await apiClient.put(`logbooks/propeller/${logbookId}`, data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return normalizeLogbookItem(response.data);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete Propeller Logbook entry
 */
export const deletePropellerLogbook = async (
  logbookId: number
): Promise<void> => {
  try {
    await apiClient.delete(`logbooks/propeller/${logbookId}`);
  } catch (error) {
    throw error;
  }
};
