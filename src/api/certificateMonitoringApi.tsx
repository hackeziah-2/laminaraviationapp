import apiClient from "./index";
import {
  downloadModuleFile,
  FILE_UPLOAD_MODULES,
  resolveUploadedFilePath,
} from "./fileUploadApi";

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

function toBoolean(val: unknown): boolean {
  if (val === true || val === 1 || val === "1" || val === "true") return true;
  if (val === false || val === 0 || val === "0" || val === "false") return false;
  return false;
}

function normalizeCertificateItem(item: any): CertificateMonitoring {
  if (item == null) throw new Error("Certificate data is missing");
  const c = deepToCamel(item) ?? {};
  const filePath =
    c.filePath ?? c.uploadFile ?? item.file_path ?? item.upload_file ?? null;
  const documentId =
    c.id ?? c.documentId ?? item.document_id ?? item.id ?? null;
  const rawIsCert =
    c.isAircraftCertificate ?? item.is_aircraft_certificate ?? false;
  const aircraft = c.aircraft ?? item.aircraft;
  const aircraftObj = aircraft && typeof aircraft === "object" ? aircraft : undefined;
  return {
    id: documentId,
    aircraftId:
      c.aircraftId ?? c.aircraftFk ?? item.aircraft_id ?? item.aircraft_fk,
    aircraft: aircraftObj,
    certificateName: c.certificateName ?? c.documentName ?? item.certificate_name ?? item.document_name ?? "",
    certificateType: c.certificateType ?? item.certificate_type ?? null,
    makeModel: c.makeModel ?? item.make_model ?? (aircraftObj && (aircraftObj as any).aircraftType) ?? null,
    msn: c.msn ?? item.msn ?? (aircraftObj && (aircraftObj as any).msn) ?? null,
    description: c.description ?? null,
    issueDate: c.issueDate ?? item.issue_date ?? null,
    expiryDate: c.expiryDate ?? item.expiry_date ?? null,
    warningDays: c.warningDays ?? item.warning_days ?? null,
    daysLeft: c.daysLeft ?? null,
    status: c.status ?? "Active",
    filePath: filePath ?? null,
    uploadFile: filePath ?? null,
    webLink: c.webLink ?? item.web_link ?? null,
    isAircraftCertificate: toBoolean(rawIsCert),
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
  };
}

export type CertificateStatus =
  | "Active"
  | "Expired"
  | "Expiring Soon"
  | "Inactive";

export interface CertificateMonitoring {
  id: number | null;
  aircraftId?: number;
  aircraft?: {
    id: number;
    registration: string;
    aircraftType?: string;
    manufacturer?: string;
    model?: string;
    msn?: string;
  };
  certificateName: string;
  certificateType?: string | null;
  makeModel?: string | null;
  msn?: string | null;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
  daysLeft?: number | null;
  status: CertificateStatus;
  filePath?: string | null;
  webLink?: string | null;
  uploadFile?: string | null;
  isAircraftCertificate?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CertificateMonitoringCreate {
  aircraftId?: number;
  certificateName: string;
  certificateType?: string | null;
  makeModel?: string | null;
  msn?: string | null;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
  webLink?: string | null;
  isAircraftCertificate?: boolean | null;
  status: CertificateStatus;
  uploadFile?: File | null;
}

export interface CertificateMonitoringUpdate {
  aircraftId?: number;
  certificateName?: string;
  certificateType?: string | null;
  makeModel?: string | null;
  msn?: string | null;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  warningDays?: number | null;
  webLink?: string | null;
  isAircraftCertificate?: boolean | null;
  status?: CertificateStatus;
  uploadFile?: File | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

const BASE_PATH = "documents-on-board";
const LIST_PATH = "documents-on-board/certificates";

/**
 * Get paginated list of certificates.
 * GET /api/v1/documents-on-board/certificates/paged?page=&limit=&search=&status=
 */
export const getCertificatesMonitoring = async (
  page = 1,
  limit = 10,
  search = "",
  statusFilter = "All Status"
): Promise<PaginatedResponse<CertificateMonitoring>> => {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("page", page.toString());
  if (search.trim() !== "") params.append("search", search);
  if (statusFilter && statusFilter !== "All Status")
    params.append("status", statusFilter);

  const endpoint = `${LIST_PATH}/paged?${params.toString()}`;
  try {
    const response = await apiClient.get(endpoint);
    const res = response.data;
    if (res == null) return { items: [], total: 0, page: 1, pages: 0 };
    const responseData = typeof res === "object" && !Array.isArray(res) ? res : {};
    const directArray = Array.isArray(res) ? res : null;
    let rawItems = directArray ?? responseData.items ?? responseData.results ?? responseData.data;
    if (!Array.isArray(rawItems)) rawItems = [];
    const total = responseData.total ?? responseData.count ?? rawItems.length;
    const pageNum = responseData.page ?? page;
    const limitNum = responseData.limit ?? limit;
    const pages =
      responseData.pages ??
      Math.max(1, Math.ceil(Number(total) / (limitNum || 1)));

    const items = rawItems.map((item: any) => normalizeCertificateItem(item));
    return { items, total: Number(total), page: pageNum, pages };
  } catch (error: any) {
    console.error("Certificate Monitoring API Error:", error?.message, error?.response?.data);
    const detail =
      error.response?.data?.detail ?? error.message ?? "Unknown error";
    throw new Error(
      typeof detail === "string" ? detail : "Failed to load certificates."
    );
  }
};

export const getCertificateMonitoringById = async (
  id: number
): Promise<CertificateMonitoring> => {
  const response = await apiClient.get(`${BASE_PATH}/${id}`);
  const raw = response.data?.data ?? response.data;
  if (raw == null) throw new Error("Certificate data is missing");
  return normalizeCertificateItem(raw);
};

function getRawFromResponse(response: { data?: any }): any {
  const d = response.data;
  if (d == null) return null;
  if (typeof d === "object" && !Array.isArray(d)) return d.data ?? d;
  return d;
}

async function buildCertificateJsonBody(
  data:
    | CertificateMonitoringCreate
    | CertificateMonitoringUpdate
    | FormData
    | Record<string, unknown>,
  existingFilePath?: string | null
): Promise<Record<string, unknown>> {
  if (data instanceof FormData) {
    const jsonRaw = data.get("json_data");
    const parsed =
      typeof jsonRaw === "string"
        ? (JSON.parse(jsonRaw) as Record<string, unknown>)
        : {};
    const fileField = data.get("upload_file");
    const uploadFile = fileField instanceof File ? fileField : null;
    const filePath = await resolveUploadedFilePath(
      FILE_UPLOAD_MODULES.documentOnBoard,
      uploadFile,
      (parsed.file_path as string) ?? existingFilePath
    );
    if (filePath) parsed.file_path = filePath;
    return parsed;
  }

  const record = data as CertificateMonitoringCreate & {
    uploadFile?: File | null;
    filePath?: string | null;
  };
  const body: Record<string, unknown> = { ...(record as Record<string, unknown>) };
  delete body.uploadFile;
  const filePath = await resolveUploadedFilePath(
    FILE_UPLOAD_MODULES.documentOnBoard,
    record.uploadFile,
    record.filePath ?? existingFilePath
  );
  if (filePath) body.file_path = filePath;
  return body;
}

export const createCertificateMonitoring = async (
  data: CertificateMonitoringCreate | FormData | Record<string, unknown>
): Promise<CertificateMonitoring> => {
  const body = await buildCertificateJsonBody(data);
  const response = await apiClient.post(`${BASE_PATH}/`, body, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = getRawFromResponse(response);
  if (raw == null) throw new Error("Certificate data is missing");
  return normalizeCertificateItem(raw);
};

export const updateCertificateMonitoring = async (
  id: number,
  data: CertificateMonitoringUpdate | FormData | Record<string, unknown>
): Promise<CertificateMonitoring> => {
  const body = await buildCertificateJsonBody(data);
  const response = await apiClient.put(`${BASE_PATH}/${id}`, body, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = getRawFromResponse(response);
  if (raw == null) throw new Error("Certificate data is missing");
  return normalizeCertificateItem(raw);
};

export const deleteCertificateMonitoring = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/${id}`);
};

/** Download certificate file — GET api/v1/document_on_board/download/{filename} */
export const downloadCertificateFile = async (filePath: string): Promise<Blob> => {
  return downloadModuleFile(FILE_UPLOAD_MODULES.documentOnBoard, filePath);
};

export const CERTIFICATE_STATUS_ENUM: CertificateStatus[] = [
  "Active",
  "Expired",
  "Expiring Soon",
  "Inactive",
];
