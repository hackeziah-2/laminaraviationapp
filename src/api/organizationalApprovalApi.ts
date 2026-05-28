import apiClient from "./index";
import { toCamel } from "../utility/utils";

/** Path under apiClient baseURL (api/v1/). Full endpoint: /api/v1/organizational-approvals/ */
const BASE = "organizational-approvals";
const HISTORY_BASE = "organizational-approvals-history";

/** Single organizational approval. API returns certificate_fk, date_of_expiration, nested certificate { id, name }. */
export interface OrganizationalApproval {
  id: number;
  /** Certificate type FK id (from API certificate_fk or certificate.id). */
  certificateFk: number;
  /** Display name for approval type (from API certificate.name). */
  approvalTypeName?: string | null;
  /** Legacy: same as approvalTypeName for display. */
  certificate: string;
  number: string;
  /** Expiry date string (from API date_of_expiration). */
  expiry: string;
  expiryDate?: string | null;
  /** Link for display (from web_link). */
  fileLink: string;
  webLink?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isWithhold?: boolean;
  /** Parent id for GET organizational-approvals-history/{oa_history}/paged when distinct from id */
  oaHistory?: number;
}

/** Create payload: api/v1/organizational-approvals/ */
export interface OrganizationalApprovalCreate {
  certificate_fk: number;
  number?: string;
  date_of_expiration: string;
  web_link?: string | null;
}

/** Update payload: PATCH api/v1/organizational-approvals/{id}/ */
export interface OrganizationalApprovalUpdate {
  certificate_fk?: number;
  number?: string;
  date_of_expiration?: string;
  web_link?: string | null;
}

/** Body of json_data sent to API — only these four fields. */
export interface OrganizationalApprovalJsonData {
  certificate_fk: number;
  number: string;
  date_of_expiration: string;
  web_link: string | null;
}

/** Request body: API expects JSON with a json_data object (not a string). */
interface OrganizationalApprovalRequestBody {
  json_data: OrganizationalApprovalJsonData | Partial<OrganizationalApprovalJsonData>;
}

export type OrganizationalApprovalSortBy = "EXPIRY" | "CERTIFICATE";
export type SortOrder = "asc" | "desc";

/** Certificate type for dropdowns (from API or derived from list). */
export interface CertificateTypeOption {
  id: number;
  name: string;
}

export interface OrganizationalApprovalPagedResponse {
  items: OrganizationalApproval[];
  total: number;
  page: number;
  pages: number;
}

function normalizeItem(
  raw: Record<string, unknown> | null | undefined
): OrganizationalApproval {
  if (raw == null || typeof raw !== "object") {
    return {
      id: 0,
      certificateFk: 0,
      certificate: "",
      number: "",
      expiry: "",
      fileLink: "#",
      isWithhold: false,
      oaHistory: undefined,
    };
  }
  const c = toCamel(raw as Record<string, any>) as Record<string, unknown>;
  const id = Number(c.id ?? raw.id ?? 0);
  const certObj = raw.certificate ?? (c as any).certificate;
  const certId =
    typeof certObj === "object" &&
    certObj != null &&
    (certObj as any).id != null
      ? Number((certObj as any).id)
      : Number((raw as any).certificate_fk ?? c.certificateFk ?? 0);
  const approvalTypeName =
    typeof certObj === "object" &&
    certObj != null &&
    (certObj as any).name != null
      ? String((certObj as any).name)
      : (c as any).approvalTypeName ?? (raw as any).certificate_name ?? null;
  const certificate = approvalTypeName ?? String(certId || "");
  const number = String(c.number ?? raw.number ?? "");
  const dateOfExpiration =
    (raw as any).date_of_expiration ??
    c.dateOfExpiration ??
    c.expiryDate ??
    raw.expiry_date ??
    c.expiry ??
    raw.expiry;
  const expiryStr = dateOfExpiration != null ? String(dateOfExpiration) : "";
  const webLinkVal = c.webLink ?? raw.web_link;
  const webLink =
    webLinkVal != null && String(webLinkVal).trim() !== ""
      ? String(webLinkVal).trim()
      : null;
  const fileLink = webLink ?? "";
  return {
    id: isNaN(id) ? 0 : id,
    certificateFk: isNaN(certId) ? 0 : certId,
    certificate,
    approvalTypeName: approvalTypeName ?? null,
    number,
    expiry: expiryStr,
    expiryDate: expiryStr || null,
    fileLink: fileLink || "#",
    webLink,
    createdAt:
      (c.createdAt ?? raw.created_at) != null
        ? String(c.createdAt ?? raw.created_at)
        : null,
    updatedAt:
      (c.updatedAt ?? raw.updated_at) != null
        ? String(c.updatedAt ?? raw.updated_at)
        : null,
    isWithhold: Boolean((c as any).isWithhold ?? (raw as any).is_withhold ?? false),
    oaHistory: (() => {
      const v = (c as any).oaHistory ?? (raw as any).oa_history;
      if (v == null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
  };
}

export interface OrganizationalApprovalHistoryRow {
  dateOfExpiration: string | null;
  webLink: string | null;
  createdAt: string | null;
}

export interface OrganizationalApprovalHistoryPagedResponse {
  items: OrganizationalApprovalHistoryRow[];
  total: number;
  page: number;
  pages: number;
}

function normalizeHistoryRow(
  raw: Record<string, unknown>
): OrganizationalApprovalHistoryRow {
  const c = toCamel(raw as Record<string, any>) as Record<string, unknown>;
  const dateRaw =
    (raw as any).date_of_expiration ??
    c.dateOfExpiration ??
    (raw as any).expiry_date;
  const linkRaw = (raw as any).web_link ?? c.webLink;
  const createdRaw = (raw as any).created_at ?? c.createdAt;
  return {
    dateOfExpiration:
      dateRaw != null && String(dateRaw).trim()
        ? String(dateRaw)
        : null,
    webLink:
      linkRaw != null && String(linkRaw).trim()
        ? String(linkRaw)
        : null,
    createdAt:
      createdRaw != null && String(createdRaw).trim()
        ? String(createdRaw)
        : null,
  };
}

/**
 * GET api/v1/organizational-approvals-history/{oa_history}/paged
 */
export async function getOrganizationalApprovalsHistoryPaged(
  oaHistory: number,
  page = 1,
  limit = 10
): Promise<OrganizationalApprovalHistoryPagedResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  try {
    const response = await apiClient.get(
      `${HISTORY_BASE}/${oaHistory}/paged?${params.toString()}`,
      { headers: { Accept: "application/json" } }
    );
    const data = response.data?.data ?? response.data ?? {};
    const dataObj =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    const rawList =
      dataObj.results ??
      dataObj.items ??
      dataObj.data ??
      (Array.isArray(data) ? data : []);
    const list = Array.isArray(rawList) ? rawList.filter(Boolean) : [];
    const items = list.map((item: unknown) =>
      normalizeHistoryRow(item as Record<string, unknown>)
    );
    const total = Number(dataObj.count ?? dataObj.total ?? items.length);
    const pages = Number(
      dataObj.pages ?? Math.max(1, Math.ceil(total / (limit || 1)))
    );
    return {
      items,
      total,
      page: Number(dataObj.page ?? page),
      pages,
    };
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as Error).message)
        : "Failed to load approval history.";
    throw new Error(message);
  }
}

/**
 * Get paged list with search and sort.
 * GET api/v1/organizational-approvals/paged?page=&limit=&search=&sort_by=&order=&certificate_fk=
 */
/** Query params for GET organizational-approvals (page, limit, sort_by, order, etc.) */
function buildPagedParams(
  page: number,
  limit: number,
  search: string,
  sortBy: OrganizationalApprovalSortBy,
  order: SortOrder,
  certificateFilter?: string | number
): Record<string, string | number> {
  const sortByValue =
    sortBy === "CERTIFICATE"
      ? "certificate_category_types__name"
      : "date_of_expiration";
  const params: Record<string, string | number> = {
    page,
    limit,
    sort_by: sortByValue,
    order,
  };
  if (search.trim()) params.search = search.trim();
  if (
    certificateFilter != null &&
    certificateFilter !== "all" &&
    String(certificateFilter).trim() !== ""
  ) {
    params.certificate_fk = String(certificateFilter);
  }
  return params;
}

export async function getOrganizationalApprovalsPaged(
  page = 1,
  limit = 10,
  search = "",
  sortBy: OrganizationalApprovalSortBy = "EXPIRY",
  order: SortOrder = "asc",
  certificateFilter?: string | number
): Promise<OrganizationalApprovalPagedResponse> {
  const params = buildPagedParams(
    page,
    limit,
    search,
    sortBy,
    order,
    certificateFilter
  );

  const tryEndpoint = async (path: string, requestParams: Record<string, string | number>) => {
    const res = await apiClient.get(path, {
      params: requestParams,
      headers: { Accept: "application/json" },
    });
    const data = res.data ?? {};
    // Handle nested payloads: { data: { items, total } } or { results, count }
    const inner =
      data?.data && typeof data.data === "object" ? data.data : data;
    const rawItems = Array.isArray(inner)
      ? inner
      : Array.isArray(data)
      ? data
      : inner?.items ??
        inner?.results ??
        data?.items ??
        data?.results ??
        data?.data ??
        [];
    const list = Array.isArray(rawItems) ? rawItems : [];
    // Trust server sort order for paged results; do not re-sort client-side
    const items = list.map((item: unknown) =>
      normalizeItem((item as Record<string, unknown>) ?? {})
    );
    const total = Number(
      inner?.total ??
        inner?.count ??
        data?.total ??
        data?.count ??
        data?.total_count ??
        items.length
    );
    const pageNum = Number(
      inner?.page ??
        inner?.current_page ??
        data?.page ??
        data?.current_page ??
        page
    );
    const limitUsed = Number(
      inner?.limit ??
        inner?.page_size ??
        data?.limit ??
        data?.page_size ??
        limit
    );
    const pages =
      Number(
        inner?.pages ?? inner?.total_pages ?? data?.pages ?? data?.total_pages
      ) || Math.max(1, Math.ceil(total / (limitUsed || 1)));
    return { items, total, page: pageNum, pages };
  };

  try {
    return await tryEndpoint(`${BASE}/paged`, params);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "response" in err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 404 || status === 405) {
        try {
          return await tryEndpoint(`${BASE}/`, params);
        } catch (fallbackErr: unknown) {
          if (
            fallbackErr &&
            typeof fallbackErr === "object" &&
            "response" in fallbackErr &&
            ((fallbackErr as { response?: { status?: number } }).response
              ?.status === 404 ||
              (fallbackErr as { response?: { status?: number } }).response
                ?.status === 405)
          ) {
            return { items: [], total: 0, page: 1, pages: 1 };
          }
          throw fallbackErr;
        }
      }
    }
    throw new Error(
      getApiErrorMessage(err, "Failed to load organizational approvals.")
    );
  }
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: Record<string, unknown> } })
      .response;
    const d = res?.data;
    if (d && typeof d === "object") {
      const msg = d.detail ?? d.message ?? d.error;
      if (typeof msg === "string") return msg;
      if (Array.isArray(msg)) {
        return (msg as unknown[])
          .map((m) => {
            if (m != null && typeof m === "object" && "msg" in m)
              return String((m as { msg: unknown }).msg);
            if (m != null && typeof m === "object" && "message" in m)
              return String((m as { message: unknown }).message);
            return String(m);
          })
          .join(" ");
      }
    }
  }
  return err instanceof Error ? err.message : fallback;
}

const CERTIFICATE_CATEGORY_BASE = "certificate-category-types";

function parseCertificateCategoryType(raw: unknown): CertificateTypeOption {
  const r =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const id = Number(r.id ?? r.pk ?? r.certificate_fk ?? 0);
  const name = String(
    r.name ?? r.certificate_name ?? r.category_name ?? ""
  ).trim();
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid certificate category type response from server.");
  }
  return { id, name: name || `Type ${id}` };
}

export interface PaginatedCertificateCategoryTypesResponse {
  items: CertificateTypeOption[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Paged list for OA Approval Type Settings.
 * GET api/v1/certificate-category-types/paged?page=&limit=
 */
export async function getCertificateCategoryTypesPaged(
  page = 1,
  limit = 10
): Promise<PaginatedCertificateCategoryTypesResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  const res = await apiClient.get(
    `${CERTIFICATE_CATEGORY_BASE}/paged?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );
  const raw = res.data?.data ?? res.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list
    .map((row: Record<string, unknown>) => {
      try {
        return parseCertificateCategoryType(row);
      } catch {
        return null;
      }
    })
    .filter((x): x is CertificateTypeOption => x != null);
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
 * Fetch certificate category type options for Approval Type dropdown.
 * GET api/v1/certificate-category-types/list
 */
export async function getCertificateCategoryTypesList(): Promise<
  CertificateTypeOption[]
> {
  try {
    const res = await apiClient.get(`${CERTIFICATE_CATEGORY_BASE}/list`, {
      headers: { Accept: "application/json" },
    });
    const data = res.data?.results ?? res.data?.data ?? res.data;
    const list = Array.isArray(data) ? data : [];
    return list
      .map((item: Record<string, unknown>) => {
        try {
          return parseCertificateCategoryType(item);
        } catch {
          return null;
        }
      })
      .filter((x): x is CertificateTypeOption => x != null);
  } catch {
    return [];
  }
}

/**
 * GET api/v1/certificate-category-types/{id}/
 */
export async function getCertificateCategoryTypeById(
  id: number
): Promise<CertificateTypeOption> {
  const res = await apiClient.get(`${CERTIFICATE_CATEGORY_BASE}/${id}/`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  return parseCertificateCategoryType(raw);
}

/**
 * Create a new certificate category type.
 * POST api/v1/certificate-category-types/
 */
export async function createCertificateCategoryType(payload: {
  name: string;
}): Promise<CertificateTypeOption> {
  const res = await apiClient.post(
    `${CERTIFICATE_CATEGORY_BASE}/`,
    { name: payload.name.trim() },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  const raw = res.data?.data ?? res.data;
  return parseCertificateCategoryType(raw);
}

/**
 * Update a certificate category type.
 * PATCH api/v1/certificate-category-types/{id}/
 */
export async function updateCertificateCategoryType(
  id: number,
  payload: { name: string }
): Promise<CertificateTypeOption> {
  const res = await apiClient.patch(
    `${CERTIFICATE_CATEGORY_BASE}/${id}/`,
    { name: payload.name.trim() },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  const raw = res.data?.data ?? res.data;
  return parseCertificateCategoryType(raw);
}

/**
 * Delete a certificate category type.
 * DELETE api/v1/certificate-category-types/{id}/
 */
export async function deleteCertificateCategoryType(id: number): Promise<void> {
  await apiClient.delete(`${CERTIFICATE_CATEGORY_BASE}/${id}/`, {
    headers: { Accept: "application/json" },
  });
}

/**
 * Fetch certificate type options for dropdowns (if backend provides).
 * GET api/v1/organizational-approvals/certificate-types/ or similar.
 * Returns empty array if endpoint not available.
 */
export async function getCertificateTypes(): Promise<CertificateTypeOption[]> {
  try {
    const list = await getCertificateCategoryTypesList();
    if (list.length > 0) return list;
    const res = await apiClient.get(`${BASE}/certificate-types/`, {
      headers: { Accept: "application/json" },
    });
    const data = res.data?.results ?? res.data?.data ?? res.data;
    const arr = Array.isArray(data) ? data : [];
    return arr
      .map((item: Record<string, unknown>) => ({
        id: Number(item.id ?? (item as any).certificate_fk ?? 0),
        name: String(item.name ?? (item as any).certificate_name ?? ""),
      }))
      .filter((x) => x.id && x.name);
  } catch {
    return [];
  }
}

/**
 * Get one approval by id.
 * GET api/v1/organizational-approvals/{id}/
 */
export async function getOrganizationalApprovalById(
  id: number
): Promise<OrganizationalApproval> {
  try {
    const res = await apiClient.get(`${BASE}/${id}/`, {
      headers: { Accept: "application/json" },
    });
    const raw = res.data?.data ?? res.data;
    if (raw == null || typeof raw !== "object")
      throw new Error("Organizational approval not found");
    return normalizeItem(raw as Record<string, unknown>);
  } catch (err) {
    throw new Error(
      getApiErrorMessage(err, "Organizational approval not found")
    );
  }
}

/**
 * Create approval. POST api/v1/organizational-approvals/
 */
function getResponsePayload(res: {
  data?: unknown;
}): Record<string, unknown> | null {
  const data = res.data;
  if (data == null) return null;
  if (typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const inner = d.data ?? d.result ?? d.item ?? d;
    if (inner != null && typeof inner === "object" && !Array.isArray(inner))
      return inner as Record<string, unknown>;
    return d as Record<string, unknown>;
  }
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object")
    return data[0] as Record<string, unknown>;
  return null;
}

/** Normalize date to YYYY-MM-DD for API */
function toApiDateStr(value: string | null | undefined): string {
  const s = (value ?? "").toString().trim();
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

export async function createOrganizationalApproval(
  payload: OrganizationalApprovalCreate
): Promise<OrganizationalApproval> {
  const certFk = Number(payload.certificate_fk);
  const numberStr = (payload.number ?? "").toString().trim();
  const dateStr = toApiDateStr(payload.date_of_expiration);
  const webLinkStr = payload.web_link != null ? String(payload.web_link).trim() : "";
  const jsonData: OrganizationalApprovalJsonData = {
    certificate_fk: Number.isNaN(certFk) ? 0 : certFk,
    number: numberStr,
    date_of_expiration: dateStr,
    web_link: webLinkStr || null,
  };

  const body: OrganizationalApprovalRequestBody = { json_data: jsonData };
  try {
    const res = await apiClient.post(
      `${BASE}/`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    const raw = getResponsePayload(res);
    if (raw != null) return normalizeItem(raw);
    return normalizeItem({
      certificate_fk: jsonData.certificate_fk,
      number: jsonData.number,
      date_of_expiration: jsonData.date_of_expiration,
      web_link: jsonData.web_link,
    } as Record<string, unknown>);
  } catch (err) {
    throw new Error(
      getApiErrorMessage(err, "Failed to create organizational approval")
    );
  }
}

/**
 * Update approval. PATCH api/v1/organizational-approvals/{id}/
 */
export async function updateOrganizationalApproval(
  id: number,
  payload: OrganizationalApprovalUpdate
): Promise<OrganizationalApproval> {
  const jsonData: Partial<OrganizationalApprovalJsonData> = {};
  if (payload.certificate_fk !== undefined) {
    const v = Number(payload.certificate_fk);
    if (!Number.isNaN(v)) jsonData.certificate_fk = v;
  }
  if (payload.number !== undefined) {
    const s = (payload.number ?? "").toString().trim();
    jsonData.number = s;
  }
  if (payload.date_of_expiration !== undefined) {
    jsonData.date_of_expiration = toApiDateStr(payload.date_of_expiration);
  }
  if (payload.web_link !== undefined) {
    const s = (payload.web_link ?? "").toString().trim();
    jsonData.web_link = s !== "" ? s : null;
  }

  if (Object.keys(jsonData).length === 0) {
    throw new Error("No fields to update.");
  }

  const body: OrganizationalApprovalRequestBody = { json_data: jsonData };
  try {
    const res = await apiClient.patch(
      `${BASE}/${id}/`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    const raw = getResponsePayload(res);
    if (raw != null) return normalizeItem(raw);
    return normalizeItem({ id, ...jsonData } as Record<string, unknown>);
  } catch (err) {
    throw new Error(
      getApiErrorMessage(err, "Failed to update organizational approval")
    );
  }
}

/**
 * Delete approval.
 * DELETE api/v1/organizational-approvals/{id}/
 */
export async function deleteOrganizationalApproval(id: number): Promise<void> {
  try {
    await apiClient.delete(`${BASE}/${id}/`);
  } catch (err) {
    throw new Error(
      getApiErrorMessage(err, "Failed to delete organizational approval")
    );
  }
}
