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

/** Normalize a document item from API (supports snake_case or camelCase) */
function normalizeDocumentItem(item: any): DocumentOnBoard {
  if (item == null) {
    throw new Error("Document data is missing");
  }
  const c = deepToCamel(item) ?? {};
  const filePath = c.filePath ?? c.uploadFile ?? item.file_path ?? item.upload_file ?? null;
  // Support both 'id' and 'document_id' from API
  const documentId = c.id ?? c.documentId ?? item.document_id ?? item.id ?? null;
  return {
    id: documentId,
    aircraftId: c.aircraftId ?? c.aircraftFk ?? item.aircraft_id ?? item.aircraft_fk,
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
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
  };
}

// Status enum type
export type DocumentStatus = "Active" | "Expired" | "Expiring Soon" | "Inactive";

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
  uploadFile?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentOnBoardCreate {
  aircraftId: number;
  documentName: string;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
  status: DocumentStatus;
  uploadFile?: File | null;
}

export interface DocumentOnBoardUpdate {
  aircraftId?: number;
  documentName?: string;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
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

/**
 * Get paginated list of Documents On Board
 */
export const getDocumentsOnBoard = async (
  page = 1,
  limit = 10,
  search = "",
  statusFilter = "All Status",
  aircraftFk?: number
): Promise<PaginatedResponse<DocumentOnBoard>> => {
  // Build params outside try block so it's accessible in catch block
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (search.trim() !== "") {
    params.append("search", search);
  }

  if (statusFilter && statusFilter !== "All Status") {
    params.append("status", statusFilter);
  }

  if (aircraftFk != null && !isNaN(Number(aircraftFk))) {
    params.append("aircraft_fk", String(aircraftFk));
  }

  const endpoint = `documents-on-board/paged?${params.toString()}`;
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1/";
  const fullURL = `${baseURL}${endpoint}`;

  try {
    console.log("Fetching documents from:", fullURL);
    
    const response = await apiClient.get(endpoint);

    // Handle different response structures
    let responseData = response.data;
    
    // Support multiple pagination shapes: items, results, data
    const rawItems =
      responseData.items ?? responseData.results ?? responseData.data ?? [];
    const total = responseData.total ?? responseData.count ?? rawItems.length;
    const pageNum = responseData.page ?? page;
    const pages = responseData.pages ?? Math.max(1, Math.ceil(total / (responseData.limit ?? limit)));

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
      const errorMsg = `Network error: Unable to connect to ${baseURL}\n\n` +
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
    const errorDetail = error.response?.data?.detail || error.message || "Unknown error";
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
    return normalizeDocumentItem(response.data);
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
    return normalizeDocumentItem(response.data);
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
    const response = await apiClient.put(`documents-on-board/${id}`, data, config);
    return normalizeDocumentItem(response.data);
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
// GET    /api/v1/aircraft/{aircraft_id}/documents-on-board?limit=10&page=1
// GET    /api/v1/aircraft/{aircraft_id}/documents-on-board/{document_id}
// POST   /api/v1/aircraft/{aircraft_id}/documents-on-board
// PUT    /api/v1/aircraft/{aircraft_id}/documents-on-board/{document_id}
// DELETE /api/v1/aircraft/{aircraft_id}/documents-on-board/{document_id}

/**
 * Get paginated list of Documents On Board for a specific aircraft
 */
export const getAircraftDocumentsOnBoard = async (
  aircraftId: number,
  page = 1,
  limit = 10,
  search = "",
  statusFilter = "All Status"
): Promise<PaginatedResponse<DocumentOnBoard>> => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  if (search.trim() !== "") {
    params.append("search", search);
  }
  if (statusFilter && statusFilter !== "All Status") {
    params.append("status", statusFilter);
  }
  const endpoint = `aircraft/${aircraftId}/documents-on-board?${params.toString()}`;
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1/";
  try {
    const response = await apiClient.get(endpoint);
    const responseData = response.data?.data ?? response.data;
    const rawItems = Array.isArray(responseData)
      ? responseData
      : (responseData?.items ?? responseData?.results ?? responseData?.data ?? []);
    const total = Array.isArray(responseData)
      ? responseData.length
      : (responseData?.total ?? responseData?.count ?? (Array.isArray(rawItems) ? rawItems.length : 0));
    const pageNum = (typeof responseData === "object" && responseData !== null && !Array.isArray(responseData))
      ? (responseData.page ?? page)
      : page;
    const pages = (typeof responseData === "object" && responseData !== null && !Array.isArray(responseData))
      ? (responseData.pages ?? Math.max(1, Math.ceil(total / (responseData.limit ?? limit))))
      : Math.max(1, Math.ceil(total / limit));
    const items = Array.isArray(rawItems)
      ? rawItems.filter((item: any) => item != null).map((item: any) => normalizeDocumentItem(item))
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
        `Aircraft or documents endpoint not found. Verify /api/v1/aircraft/${aircraftId}/documents-on-board exists.`
      );
    }
    const detail = error.response?.data?.detail ?? error.message ?? "Failed to load documents.";
    throw new Error(typeof detail === "string" ? detail : "Failed to load documents.");
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
    `aircraft/${aircraftId}/documents-on-board/${documentId}`
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
  data: Omit<DocumentOnBoardCreate, "aircraftId"> | FormData | Record<string, unknown>
): Promise<DocumentOnBoard> => {
  const config = data instanceof FormData ? {} : undefined;
  const response = await apiClient.post(
    `aircraft/${aircraftId}/documents-on-board`,
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
    `aircraft/${aircraftId}/documents-on-board/${documentId}`,
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
    `aircraft/${aircraftId}/documents-on-board/${documentId}`
  );
};

/**
 * Download document file - GET api/v1/document_on_board/download/{filePath}
 * Same pattern as logbook: path in URL, blob response, Accept: application/octet-stream
 */
export const downloadDocumentOnBoardFile = async (filePath: string): Promise<Blob> => {
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
