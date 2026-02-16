import apiClient from "./index";

/** Deep transform snake_case keys to camelCase */
function deepToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepToCamel);
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = deepToCamel(obj[key]);
    }
    return result;
  }
  return obj;
}

/** Coerce API value to boolean for is_aircraft_certificate (handles 1, 0, "true", "false" from backend) */
function toBoolean(val: unknown): boolean {
  if (val === true || val === 1 || val === "1" || val === "true") return true;
  if (val === false || val === 0 || val === "0" || val === "false") return false;
  return false;
}

/** Normalize a document item from API (supports snake_case or camelCase) */
function normalizeDocumentItem(item: any): DocumentOnBoard {
  if (item == null) {
    throw new Error("Document data is missing");
  }
  const c = deepToCamel(item) ?? {};
  const filePath =
    c.filePath ?? c.uploadFile ?? item.file_path ?? item.upload_file ?? null;
  // Support both 'id' and 'document_id' from API
  const documentId =
    c.id ?? c.documentId ?? item.document_id ?? item.id ?? null;
  const rawIsCert =
    c.isAircraftCertificate ?? item.is_aircraft_certificate ?? false;
  return {
    id: documentId,
    aircraftId:
      c.aircraftId ?? c.aircraftFk ?? item.aircraft_id ?? item.aircraft_fk,
    aircraft: c.aircraft,
    documentName: c.documentName ?? item.document_name ?? c.document ?? "",
    description: c.description ?? null,
    issueDate: c.issueDate ?? item.issue_date ?? null,
    expiryDate: c.expiryDate ?? item.expiry_date ?? null,
    warningDays: c.warningDays ?? item.warning_days ?? null,
    daysLeft: c.daysLeft ?? null,
    status: c.status ?? "Active",
    filePath: filePath,
    uploadFile: filePath,
    webLink: c.webLink ?? item.web_link ?? null,
    isAircraftCertificate: toBoolean(rawIsCert),
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
  };
}

// Status enum type
export type DocumentStatus =
  | "Active"
  | "Expired"
  | "Expiring Soon"
  | "Inactive";

// Interfaces
export interface DocumentOnBoard {
  id: number | null;
  aircraftId?: number;
  aircraft?: {
    id: number;
    registration: string;
    aircraftType?: string;
  };
  documentName: string;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
  daysLeft?: number | null;
  status: DocumentStatus;
  /** Stored file path from API (e.g. "uploads/ATL.jpg") */
  filePath?: string | null;
  webLink?: string | null;
  uploadFile?: string | null;
  isAircraftCertificate?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentOnBoardCreate {
  aircraftId?: number | null;
  documentName: string;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
  webLink?: string | null;
  isAircraftCertificate?: boolean | null;
  status: DocumentStatus;
  uploadFile?: File | null;
}

export interface DocumentOnBoardUpdate {
  aircraftId?: number | null;
  documentName?: string;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
  webLink?: string | null;
  isAircraftCertificate?: boolean | null;
  status?: DocumentStatus;
  uploadFile?: File | null;
}

export interface DocumentStatusEnum {
  document_status: DocumentStatus[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// ==================== ENDPOINT RULE ====================
// If has aircraft_fk (aircraft context): use /aircraft/<id>/documents-on-board/
// If not (global context): use documents-on-board/
// ========================================================

/**
 * Get paginated list of Documents On Board.
 * Endpoint: if aircraftFk → /aircraft/<id>/documents-on-board/paged ; else → documents-on-board/paged
 */
export const getDocumentsOnBoard = async (
  page = 1,
  limit = 10,
  search = "",
  statusFilter = "All Status",
  aircraftFk?: number
): Promise<PaginatedResponse<DocumentOnBoard>> => {
  const baseURL =
    import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1/";

  const useAircraftPath = aircraftFk != null && !isNaN(Number(aircraftFk));

  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("page", page.toString());

  if (search.trim() !== "") {
    params.append("search", search);
  }

  if (statusFilter && statusFilter !== "All Status") {
    params.append("status", statusFilter);
  }

  const endpoint = useAircraftPath
    ? `aircraft/${aircraftFk}/documents-on-board/paged?${params.toString()}`
    : `documents-on-board/paged?${params.toString()}`;
  const fullURL = `${baseURL}${endpoint}`;

  try {
    const response = await apiClient.get(endpoint);

    // Handle different response structures
    let responseData = response.data;

    // Support multiple pagination shapes: items, results, data
    const rawItems =
      responseData.items ?? responseData.results ?? responseData.data ?? [];
    const total = responseData.total ?? responseData.count ?? rawItems.length;
    const pageNum = responseData.page ?? page;
    const pages =
      responseData.pages ??
      Math.max(1, Math.ceil(total / (responseData.limit ?? limit)));

    if (Array.isArray(rawItems)) {
      const items = rawItems.map((item: any) => normalizeDocumentItem(item));
      return { items, total, page: pageNum, pages };
    }

    return { items: [], total: 0, page: page, pages: 0 };
  } catch (error: any) {
    // Enhanced error handling with detailed information
    console.error("Documents On Board API Error:", {
      code: error.code,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: fullURL,
      response: error.response?.data,
    });

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      const errorMsg =
        `Network error: Unable to connect to ${baseURL}\n\n` +
        `Possible causes:\n` +
        `1. Backend server is not running\n` +
        `2. CORS is not configured on the backend\n` +
        `3. The endpoint 'documents-on-board/paged' does not exist\n\n` +
        `Please verify:\n` +
        `- Backend server is running on port 8000\n` +
        `- CORS middleware is configured to allow requests from http://localhost:3000\n` +
        `- The endpoint /api/v1/documents-on-board/paged exists`;
      throw new Error(errorMsg);
    }

    if (error.response?.status === 500) {
      throw new Error(
        `Server error (500): The documents-on-board endpoint returned an internal server error.\n\n` +
          `This usually means:\n` +
          `- The endpoint exists but has a server-side error\n` +
          `- Check the backend logs for more details\n` +
          `- Verify the endpoint implementation on the backend`
      );
    }

    if (error.response?.status === 404) {
      throw new Error(
        `Endpoint not found (404): ${fullURL}\n\n` +
          `The endpoint does not exist. Please verify:\n` +
          `- The backend route is correctly defined\n` +
          `- The endpoint path matches: /api/v1/documents-on-board/paged\n` +
          `- The backend server is running the latest version`
      );
    }

    if (error.response?.status === 403 || error.response?.status === 401) {
      throw new Error(
        `Authentication error (${error.response.status}): Access denied.\n\n` +
          `Please check if authentication is required for this endpoint.`
      );
    }

    // Generic error
    const errorDetail =
      error.response?.data?.detail || error.message || "Unknown error";
    throw new Error(`Error fetching documents: ${errorDetail}`);
  }
};

/**
 * Get a single Document On Board by ID
 */
export const getDocumentOnBoardById = async (
  id: number
): Promise<DocumentOnBoard> => {
  try {
    const response = await apiClient.get(`documents-on-board/${id}`);
    const raw = response.data?.data ?? response.data;
    if (raw == null) throw new Error("Document data is missing");
    return normalizeDocumentItem(raw);
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new Document On Board
 */
export const createDocumentOnBoard = async (
  data: DocumentOnBoardCreate | FormData | Record<string, unknown>
): Promise<DocumentOnBoard> => {
  try {
    // Don't set Content-Type for FormData - browser will set it with boundary
    const config = data instanceof FormData ? {} : undefined;
    const response = await apiClient.post("documents-on-board/", data, config);
    const raw = response.data?.data ?? response.data;
    if (raw == null) throw new Error("Document data is missing");
    return normalizeDocumentItem(raw);
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing Document On Board
 */
export const updateDocumentOnBoard = async (
  id: number,
  data: DocumentOnBoardUpdate | FormData | Record<string, unknown>
): Promise<DocumentOnBoard> => {
  try {
    // Don't set Content-Type for FormData - browser will set it with boundary
    const config = data instanceof FormData ? {} : undefined;
    const response = await apiClient.put(
      `documents-on-board/${id}`,
      data,
      config
    );
    const raw = response.data?.data ?? response.data;
    if (raw == null) throw new Error("Document data is missing");
    return normalizeDocumentItem(raw);
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a Document On Board
 */
export const deleteDocumentOnBoard = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`documents-on-board/${id}`);
  } catch (error) {
    throw error;
  }
};

// ==================== AIRCRAFT-SCOPED DOCUMENTS ON BOARD ====================
// Aircraft Document On Board: use api/v1/aircraft/{aircraft_id}/documents-on-board/...
// NOT the global: api/v1/documents-on-board/paged?aircraft_fk=...
//
// List:  GET  api/v1/aircraft/{aircraft_id}/documents-on-board/paged?limit=10&page=1
// Get:   GET  .../documents-on-board/{document_id}/
// Create: POST .../documents-on-board/
// Update: PUT  .../documents-on-board/{document_id}/
// Delete: DELETE .../documents-on-board/{document_id}/

const AIRCRAFT_DOCUMENTS_PATH = (aircraftId: number) =>
  `aircraft/${aircraftId}/documents-on-board/`;

/**
 * Get paginated list of Documents On Board for a specific aircraft.
 * Matches: GET http://localhost:8000/api/v1/aircraft/{aircraft_id}/documents-on-board/paged?limit=10&page=1
 *          -H 'accept: application/json'
 */
export const getAircraftDocumentsOnBoard = async (
  aircraftId: number,
  page = 1,
  limit = 10,
  search = "",
  statusFilter = "All Status"
): Promise<PaginatedResponse<DocumentOnBoard>> => {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("page", page.toString());
  if (search.trim() !== "") params.append("search", search);
  if (statusFilter && statusFilter !== "All Status")
    params.append("status", statusFilter);

  const endpoint = `${AIRCRAFT_DOCUMENTS_PATH(
    aircraftId
  )}paged?${params.toString()}`;
  const baseURL =
    import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1/";

  try {
    const response = await apiClient.get(endpoint, {
      headers: { Accept: "application/json" },
    });
    const data = response.data?.data ?? response.data;
    const rawItems = Array.isArray(data)
      ? data
      : data?.items ?? data?.results ?? data?.data ?? [];
    const total =
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? data.total ??
          data.count ??
          (Array.isArray(rawItems) ? rawItems.length : 0)
        : Array.isArray(data)
        ? data.length
        : 0;
    const pageNum =
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? data.page ?? page
        : page;
    const limitUsed =
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? data.limit ?? limit
        : limit;
    const pages =
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? data.pages ?? Math.max(1, Math.ceil(total / limitUsed))
        : Math.max(1, Math.ceil(total / limit));

    const items = Array.isArray(rawItems)
      ? rawItems
          .filter((item: any) => item != null)
          .map((item: any) => normalizeDocumentItem(item))
      : [];

    return { items, total, page: pageNum, pages };
  } catch (error: any) {
    console.error("Aircraft documents-on-board API Error:", {
      status: error.response?.status,
      url: `${baseURL}${endpoint}`,
      response: error.response?.data,
    });
    if (error.response?.status === 404) {
      throw new Error(
        `Endpoint not found. Verify GET /api/v1/aircraft/${aircraftId}/documents-on-board/paged exists.`
      );
    }
    const detail =
      error.response?.data?.detail ??
      error.message ??
      "Failed to load documents.";
    throw new Error(
      typeof detail === "string" ? detail : "Failed to load documents."
    );
  }
};

/**
 * Get a single Document On Board by ID for a specific aircraft
 */
export const getAircraftDocumentOnBoardById = async (
  aircraftId: number,
  documentId: number
): Promise<DocumentOnBoard> => {
  const response = await apiClient.get(
    `${AIRCRAFT_DOCUMENTS_PATH(aircraftId)}${documentId}/`
  );
  const raw = response.data?.data ?? response.data;
  if (raw == null) {
    throw new Error("Document data is missing");
  }
  return normalizeDocumentItem(raw);
};

/**
 * Create a Document On Board for a specific aircraft
 */
export const createAircraftDocumentOnBoard = async (
  aircraftId: number,
  data:
    | Omit<DocumentOnBoardCreate, "aircraftId">
    | FormData
    | Record<string, unknown>
): Promise<DocumentOnBoard> => {
  const config = data instanceof FormData ? {} : undefined;
  const response = await apiClient.post(
    AIRCRAFT_DOCUMENTS_PATH(aircraftId),
    data,
    config
  );
  const raw = response.data?.data ?? response.data;
  if (raw == null) {
    throw new Error("Document data is missing");
  }
  return normalizeDocumentItem(raw);
};

/**
 * Update a Document On Board for a specific aircraft
 */
export const updateAircraftDocumentOnBoard = async (
  aircraftId: number,
  documentId: number,
  data: DocumentOnBoardUpdate | FormData | Record<string, unknown>
): Promise<DocumentOnBoard> => {
  const config = data instanceof FormData ? {} : undefined;
  const response = await apiClient.put(
    `${AIRCRAFT_DOCUMENTS_PATH(aircraftId)}${documentId}/`,
    data,
    config
  );
  const raw = response.data?.data ?? response.data;
  if (raw == null) {
    throw new Error("Document data is missing");
  }
  return normalizeDocumentItem(raw);
};

/**
 * Delete a Document On Board for a specific aircraft
 */
export const deleteAircraftDocumentOnBoard = async (
  aircraftId: number,
  documentId: number
): Promise<void> => {
  await apiClient.delete(
    `${AIRCRAFT_DOCUMENTS_PATH(aircraftId)}${documentId}/`
  );
};

/**
 * Download document file - GET api/v1/document_on_board/download/{filePath}
 * Same pattern as logbook: path in URL, blob response, Accept: application/octet-stream
 */
export const downloadDocumentOnBoardFile = async (
  filePath: string
): Promise<Blob> => {
  let filePathForEndpoint = filePath;
  if (filePath.startsWith("http")) {
    const url = new URL(filePath);
    filePathForEndpoint = url.pathname;
  }
  filePathForEndpoint = filePathForEndpoint.replace(/^\/+/, "");
  filePathForEndpoint = filePathForEndpoint.replace(/^api\/v1\//, "");
  filePathForEndpoint = filePathForEndpoint.replace(/^uploads\//, "");
  const endpoint = `document_on_board/download/${filePathForEndpoint}`;
  const response = await apiClient.get(endpoint, {
    responseType: "blob",
    headers: { Accept: "application/octet-stream" },
  });
  return response.data;
};

/** Default document status enum (API may use GET on a different enum endpoint) */
export const DOCUMENT_STATUS_ENUM: DocumentStatus[] = [
  "Active",
  "Expired",
  "Expiring Soon",
  "Inactive",
];

/**
 * Get Document Status Enum - returns static enum to avoid 405 on base URL.
 * If your API exposes an enum at e.g. GET /api/v1/documents-on-board/status-enum/, call that instead.
 */
export const getDocumentStatusEnum = async (): Promise<DocumentStatus[]> => {
  return DOCUMENT_STATUS_ENUM;
};
