import apiClient from "./index";
import {
  downloadModuleFile,
  FILE_UPLOAD_MODULES,
  normalizeStoredFilePath,
} from "./fileUploadApi";

const BASE = "aircraft-statutory-certificates";

function deepToCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepToCamel);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = deepToCamel((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  return obj;
}

function normalizeItem(raw: Record<string, unknown> | null | undefined): AircraftStatutoryCertificate {
  if (raw == null || typeof raw !== "object") {
    return {
    id: 0,
      registration: "",
      makeModel: "",
      msn: "",
      certificateType: "",
      webLink: null,
      filePath: null,
      expiryDate: null,
      createdAt: null,
      updatedAt: null,
      isWithhold: false,
      ascHistory: undefined,
    };
  }
  const c = (deepToCamel(raw) as Record<string, unknown>) ?? {};
  const item = raw;
  const aircraft = c.aircraft ?? item.aircraft;
  const aircraftObj = aircraft && typeof aircraft === "object" ? aircraft : undefined;
  return {
    id: Number(c.id ?? item.id ?? 0),
    aircraftId: c.aircraftId ?? item.aircraft_id ?? item.aircraft_fk ?? undefined,
    aircraft: aircraftObj as AircraftStatutoryCertificate["aircraft"],
    registration: String(c.registration ?? item.registration ?? (aircraftObj && (aircraftObj as any).registration) ?? ""),
    makeModel: String(c.makeModel ?? item.make_model ?? (aircraftObj && ((aircraftObj as any).aircraftType ?? (aircraftObj as any).manufacturer)) ?? ""),
    msn: String(c.msn ?? item.msn ?? (aircraftObj && (aircraftObj as any).msn) ?? ""),
    certificateType: String(c.certificateType ?? item.certificate_type ?? item.category_type ?? item.document_name ?? (c as any).certificateName ?? ""),
    webLink: (c.webLink ?? item.web_link ?? "") ? String(c.webLink ?? item.web_link) : null,
    filePath: (() => {
      const raw = c.filePath ?? item.file_path ?? item.upload_file ?? (c as any).uploadFile;
      if (raw == null || raw === "") return null;
      const s = String(raw).trim();
      return s && s !== "null" ? s : null;
    })(),
    expiryDate: (c.expiryDate ?? (c as any).dateOfExpiration ?? item.expiry_date ?? item.date_of_expiration) ? String(c.expiryDate ?? (c as any).dateOfExpiration ?? item.expiry_date ?? item.date_of_expiration) : null,
    createdAt: (c.createdAt ?? item.created_at) ? String(c.createdAt ?? item.created_at) : null,
    updatedAt: (c.updatedAt ?? item.updated_at) ? String(c.updatedAt ?? item.updated_at) : null,
    isWithhold: Boolean(c.isWithhold ?? item.is_withhold ?? false),
    ascHistory: (() => {
      const v = c.ascHistory ?? item.asc_history;
      if (v == null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
  };
}

export interface AircraftStatutoryCertificate {
  id: number;
  aircraftId?: number;
  aircraft?: {
    id: number;
    registration?: string;
    aircraftType?: string;
    manufacturer?: string;
    model?: string;
    msn?: string;
  };
  registration?: string;
  makeModel?: string;
  msn?: string;
  certificateType?: string;
  webLink?: string | null;
  filePath?: string | null;
  expiryDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isWithhold?: boolean;
  /** Parent id for history paged API when backend sends asc_history distinct from id */
  ascHistory?: number;
}

const HISTORY_BASE = "aircraft-statutory-certificates-history";

export interface AircraftStatutoryCertificateHistoryRow {
  dateOfExpiration: string | null;
  webLink: string | null;
  createdAt: string | null;
}

export interface PaginatedStatutoryHistoryResponse {
  items: AircraftStatutoryCertificateHistoryRow[];
  total: number;
  page: number;
  pages: number;
}

function normalizeHistoryItem(raw: Record<string, unknown>): AircraftStatutoryCertificateHistoryRow {
  const c = (deepToCamel(raw) as Record<string, unknown>) ?? {};
  const dateRaw =
    c.dateOfExpiration ?? raw.date_of_expiration ?? raw.expiry_date ?? c.expiryDate;
  const linkRaw = c.webLink ?? raw.web_link;
  const createdRaw = c.createdAt ?? raw.created_at;
  return {
    dateOfExpiration: dateRaw != null && String(dateRaw).trim() ? String(dateRaw) : null,
    webLink: linkRaw != null && String(linkRaw).trim() ? String(linkRaw) : null,
    createdAt: createdRaw != null && String(createdRaw).trim() ? String(createdRaw) : null,
  };
}

export interface AircraftStatutoryCertificateCreate {
  aircraft_fk?: number | null;
  make_model?: string | null;
  msn?: string | null;
  certificate_type?: string;
  category_type: string;
  web_link?: string | null;
  expiry_date?: string | null;
  upload_file?: File | null;
}

export interface AircraftStatutoryCertificateUpdate {
  aircraft_fk?: number | null;
  make_model?: string | null;
  msn?: string | null;
  certificate_type?: string | null;
  category_type?: string | null;
  web_link?: string | null;
  expiry_date?: string | null;
  upload_file?: File | null;
}

export interface PaginatedStatutoryResponse {
  items: AircraftStatutoryCertificate[];
  total: number;
  page: number;
  pages: number;
}

/** GET aircraft-statutory-certificates/ (paged with search & filters) */
export const getAircraftStatutoryCertificates = async (
  page = 1,
  limit = 10,
  search = "",
  filters?: { aircraft_id?: number; certificate_type?: string; category_type?: string }
): Promise<PaginatedStatutoryResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search.trim()) params.set("search", search.trim());
  if (filters?.aircraft_id != null) params.set("aircraft_id", String(filters.aircraft_id));
  // Backend paged endpoint expects category_type for certificate type filter
  const categoryType = filters?.category_type?.trim() ?? filters?.certificate_type?.trim();
  if (categoryType) params.set("category_type", categoryType);

  try {
    const response = await apiClient.get(`${BASE}/paged?${params.toString()}`);
    const data = response.data ?? {};
    const rawList = data.results ?? data.items ?? data.data ?? (Array.isArray(data) ? data : []);
    const list = Array.isArray(rawList) ? rawList.filter(Boolean) : [];
    const items = list.map((item: unknown) => normalizeItem(item as Record<string, unknown>));
    const total = Number(data.count ?? data.total ?? items.length);
    const pages = Number(data.pages ?? Math.max(1, Math.ceil(total / (limit || 1))));
    return { items, total, page: Number(data.page ?? page), pages };
  } catch (err: unknown) {
    const message = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "Failed to load certificates.";
    throw new Error(message);
  }
};

/** GET aircraft-statutory-certificates/{id}/ */
export const getAircraftStatutoryCertificateById = async (id: number): Promise<AircraftStatutoryCertificate> => {
  try {
    const response = await apiClient.get(`${BASE}/${id}/`);
    const raw = response.data?.data ?? response.data;
    if (!raw || typeof raw !== "object") throw new Error("Certificate not found");
    return normalizeItem(raw as Record<string, unknown>);
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? (err as Error).message : "Certificate not found.";
    throw new Error(msg);
  }
};

/** POST aircraft-statutory-certificates/ (accepts FormData with json_data + upload_file or JSON body) */
export const createAircraftStatutoryCertificate = async (
  payload: AircraftStatutoryCertificateCreate | FormData
): Promise<AircraftStatutoryCertificate> => {
  const isForm = payload instanceof FormData;
  // Do not set Content-Type for FormData — browser sets multipart/form-data with boundary
  const config = isForm ? { headers: { Accept: "application/json" } } : { headers: { "Content-Type": "application/json" } };
  const createPayload = payload as AircraftStatutoryCertificateCreate;
  const categoryType = createPayload.category_type ?? createPayload.certificate_type;
  const body = isForm
    ? payload
    : {
        aircraft_fk: createPayload.aircraft_fk ?? null,
        make_model: createPayload.make_model ?? null,
        msn: createPayload.msn ?? null,
        certificate_type: categoryType,
        category_type: categoryType,
        web_link: createPayload.web_link ?? null,
        expiry_date: createPayload.expiry_date ?? null,
        date_of_expiration: (createPayload as Record<string, unknown>).date_of_expiration ?? createPayload.expiry_date ?? null,
      };

  const response = await apiClient.post(`${BASE}/`, body, config);
  const raw = response.data?.data ?? response.data;
  if (!raw) throw new Error("Failed to create certificate");
  return normalizeItem(raw as Record<string, unknown>);
};

/** PUT aircraft-statutory-certificates/{id}/ (accepts FormData with json_data + upload_file or JSON body) */
export const updateAircraftStatutoryCertificate = async (
  id: number,
  payload: AircraftStatutoryCertificateUpdate | FormData
): Promise<AircraftStatutoryCertificate> => {
  const isForm = payload instanceof FormData;
  const config = isForm ? { headers: { Accept: "application/json" } } : { headers: { "Content-Type": "application/json" } };
  const updatePayload = payload as AircraftStatutoryCertificateUpdate & Record<string, unknown>;
  const categoryType = updatePayload.category_type ?? updatePayload.certificate_type;
  const body = isForm
    ? payload
    : {
        aircraft_fk: updatePayload.aircraft_fk ?? null,
        make_model: updatePayload.make_model ?? null,
        msn: updatePayload.msn ?? null,
        certificate_type: categoryType ?? null,
        category_type: categoryType ?? null,
        web_link: updatePayload.web_link ?? null,
        expiry_date: updatePayload.expiry_date ?? null,
        date_of_expiration: updatePayload.date_of_expiration ?? updatePayload.expiry_date ?? null,
        file_path: updatePayload.file_path ?? null,
      };

  const response = await apiClient.put(`${BASE}/${id}/`, body, config);
  const raw = response.data?.data ?? response.data;
  if (!raw) throw new Error("Failed to update certificate");
  return normalizeItem(raw as Record<string, unknown>);
};

/** DELETE aircraft-statutory-certificates/{id}/ */
export const deleteAircraftStatutoryCertificate = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${id}/`);
};

/** GET aircraft-statutory-certificates-history/{asc_history}/paged */
export const getAircraftStatutoryCertificateHistoryPaged = async (
  ascHistory: number,
  page = 1,
  limit = 10
): Promise<PaginatedStatutoryHistoryResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  try {
    const response = await apiClient.get(
      `${HISTORY_BASE}/${ascHistory}/paged?${params.toString()}`
    );
    const data = response.data?.data ?? response.data ?? {};
    const rawList = data.results ?? data.items ?? data.data ?? (Array.isArray(data) ? data : []);
    const list = Array.isArray(rawList) ? rawList.filter(Boolean) : [];
    const items = list.map((item: unknown) =>
      normalizeHistoryItem(item as Record<string, unknown>)
    );
    const total = Number(data.count ?? data.total ?? items.length);
    const pages = Number(data.pages ?? Math.max(1, Math.ceil(total / (limit || 1))));
    return { items, total, page: Number(data.page ?? page), pages };
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as Error).message)
        : "Failed to load certificate history.";
    throw new Error(message);
  }
};

function normalizeDownloadPath(filePath: string): string {
  return normalizeStoredFilePath(filePath);
}

async function getBlobFromResponse(response: { status: number; data: Blob }): Promise<Blob> {
  if (response.status >= 400) {
    let message = `Download failed (${response.status})`;
    try {
      const text = await (response.data as Blob).text();
      const json = JSON.parse(text) as { message?: string; detail?: string };
      message = json.message ?? json.detail ?? message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return response.data as Blob;
}

/**
 * Download file for a certificate.
 * Tries, in order: (1) id-based .../{id}/download/ (2) document_on_board/download/{path} (3) .../download/{path}.
 */
export const downloadStatutoryCertificateFile = async (
  filePath: string,
  certificateId?: number | null
): Promise<Blob> => {
  const pathForEndpoint = filePath ? normalizeDownloadPath(filePath) : "";

  const tryGet = async (endpoint: string): Promise<Blob> => {
    const response = await apiClient.get(endpoint, {
      responseType: "blob",
      headers: { Accept: "application/octet-stream" },
    });
    return getBlobFromResponse(response);
  };

  if (certificateId != null && certificateId > 0) {
    try {
      return await tryGet(`${BASE}/${certificateId}/download/`);
    } catch {
      // fall through to path-based
    }
  }

  if (pathForEndpoint) {
    try {
      return await downloadModuleFile(
        FILE_UPLOAD_MODULES.aircraftStatutoryCertificates,
        pathForEndpoint
      );
    } catch (moduleErr) {
      const encodedPath = pathForEndpoint
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      try {
        return await tryGet(`document_on_board/download/${encodedPath}`);
      } catch (firstErr) {
        try {
          return await tryGet(`${BASE}/download/${encodedPath}`);
        } catch {
          throw moduleErr;
        }
      }
    }
  }

  throw new Error("File path is not available.");
};
