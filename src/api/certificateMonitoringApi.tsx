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
  return {
    id: documentId,
    aircraftId:
      c.aircraftId ?? c.aircraftFk ?? item.aircraft_id ?? item.aircraft_fk,
    aircraft: c.aircraft,
    certificateName: c.certificateName ?? c.documentName ?? item.certificate_name ?? item.document_name ?? "",
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
  };
  certificateName: string;
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

const BASE_PATH = "certificate-monitoring";

/**
 * Get paginated list of Certificate Monitoring.
 * GET /api/v1/certificate-monitoring/paged?page=&limit=&search=&status=
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

  const endpoint = `${BASE_PATH}/paged?${params.toString()}`;
  try {
    const response = await apiClient.get(endpoint);
    const responseData = response.data ?? {};
    const rawItems =
      responseData.items ?? responseData.results ?? responseData.data ?? [];
    const total = responseData.total ?? responseData.count ?? rawItems.length;
    const pageNum = responseData.page ?? page;
    const pages =
      responseData.pages ??
      Math.max(1, Math.ceil(total / (responseData.limit ?? limit)));

    if (Array.isArray(rawItems)) {
      const items = rawItems.map((item: any) => normalizeCertificateItem(item));
      return { items, total, page: pageNum, pages };
    }
    return { items: [], total: 0, page: pageNum, pages: 0 };
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

export const createCertificateMonitoring = async (
  data: CertificateMonitoringCreate | FormData | Record<string, unknown>
): Promise<CertificateMonitoring> => {
  const config = data instanceof FormData ? {} : undefined;
  const response = await apiClient.post(`${BASE_PATH}/`, data, config);
  const raw = response.data?.data ?? response.data;
  if (raw == null) throw new Error("Certificate data is missing");
  return normalizeCertificateItem(raw);
};

export const updateCertificateMonitoring = async (
  id: number,
  data: CertificateMonitoringUpdate | FormData | Record<string, unknown>
): Promise<CertificateMonitoring> => {
  const config = data instanceof FormData ? {} : undefined;
  const response = await apiClient.put(`${BASE_PATH}/${id}`, data, config);
  const raw = response.data?.data ?? response.data;
  if (raw == null) throw new Error("Certificate data is missing");
  return normalizeCertificateItem(raw);
};

export const deleteCertificateMonitoring = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/${id}`);
};

/**
 * Download certificate file - GET api/v1/certificate_monitoring/download/{filePath}
 * Same pattern as document_on_board: path in URL, blob response.
 */
export const downloadCertificateFile = async (filePath: string): Promise<Blob> => {
  let pathForEndpoint = filePath;
  if (filePath.startsWith("http")) {
    try {
      const url = new URL(filePath);
      pathForEndpoint = url.pathname;
    } catch {
      pathForEndpoint = filePath;
    }
  }
  pathForEndpoint = pathForEndpoint.replace(/^\/+/, "").replace(/^api\/v1\//, "").replace(/^uploads\//, "");
  const endpoint = `certificate_monitoring/download/${pathForEndpoint}`;
  const response = await apiClient.get(endpoint, {
    responseType: "blob",
    headers: { Accept: "application/octet-stream" },
  });
  return response.data;
};

export const CERTIFICATE_STATUS_ENUM: CertificateStatus[] = [
  "Active",
  "Expired",
  "Expiring Soon",
  "Inactive",
];
