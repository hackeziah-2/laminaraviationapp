import apiClient from "./index";

/**
 * Advisory payloads can arrive in either camelCase or uppercase field names.
 * The API is expected to return paged responses with:
 * { items: [{ ITEM, TYPE, EXPIRY, REMAINING_VALIDITY }], total, page, pages }
 */
export interface AdvisoryItemRaw {
  id?: number | string;
  advisory_id?: number | string;
  ITEM?: string;
  item?: string;
  TYPE?: string;
  type?: string;
  category_type?: string;
  EXPIRY?: string;
  expiry?: string;
  REMAINING_VALIDITY?: number | string;
  remaining_validity?: number | string;
  remainingValidity?: number | string;
  regulatory_compliance?: string;
}

/** One advisory row for the UI. */
export interface AdvisoryItem {
  id: number;
  item: string;
  type: string;
  category_type?: string;
  expiry: string;
  remainingValidity: string;
  regulatory_compliance?: string;
}

/** Payload for renew advisory: PUT advisory/{id}/{expiry}/ */
export interface RenewAdvisoryPayload {
  regulatory_compliance?: string;
  category_type?: string;
}

/** Response: flat list, grouped by type, or wrapped in results/items. */
export type AdvisoryGroupedByTypeResponse = Record<string, AdvisoryItemRaw[]>;

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text !== "") return text;
  }
  return "";
}

function formatRemainingValidity(value: number | string | undefined): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") {
    if (value < 0) return "Expired";
    return String(value);
  }
  const s = String(value).trim();
  if (!s) return "";
  const n = Number.parseInt(s, 10);
  if (!Number.isNaN(n) && n < 0) return "Expired";
  return s;
}

function normalizeItem(
  raw: AdvisoryItemRaw,
  typeKey: string,
  index: number
): AdvisoryItem {
  const idValue = Number(raw?.advisory_id ?? raw?.id ?? index);
  const item = firstString(raw?.ITEM, raw?.item);
  const type = firstString(raw?.TYPE, raw?.type, typeKey);
  const expiry = firstString(raw?.EXPIRY, raw?.expiry);
  const remainingValidity = formatRemainingValidity(
    raw?.REMAINING_VALIDITY ??
      raw?.remaining_validity ??
      raw?.remainingValidity
  );

  const regulatory_compliance =
    typeof raw.regulatory_compliance === "string" &&
    raw.regulatory_compliance.trim() !== ""
      ? raw.regulatory_compliance.trim()
      : undefined;

  const category_type =
    typeof raw.category_type === "string" && raw.category_type.trim() !== ""
      ? raw.category_type.trim()
      : undefined;

  return {
    id: Number.isFinite(idValue) ? idValue : index,
    item,
    type,
    expiry,
    remainingValidity,
    ...(regulatory_compliance ? { regulatory_compliance } : {}),
    ...(category_type ? { category_type } : {}),
  };
}

/**
 * Normalize API response to AdvisoryItem[].
 * Supports paged { items: [...] }, flat arrays, and grouped payloads.
 */
export function normalizeAdvisoryResponse(
  data:
    | AdvisoryItemRaw[]
    | { items?: AdvisoryItemRaw[]; results?: AdvisoryItemRaw[] }
    | AdvisoryGroupedByTypeResponse
): AdvisoryItem[] {
  const list: AdvisoryItem[] = [];
  let index = 0;

  if (Array.isArray(data)) {
    for (const raw of data) {
      list.push(normalizeItem(raw, raw?.type ?? raw?.TYPE ?? "", index++));
    }
    return list;
  }

  if (!data || typeof data !== "object") return list;

  const payload = (
    "items" in data ? data.items : "results" in data ? data.results : data
  ) as AdvisoryItemRaw[] | AdvisoryGroupedByTypeResponse | undefined;

  if (Array.isArray(payload)) {
    for (const raw of payload) {
      list.push(
        normalizeItem(raw, raw?.type ?? raw?.TYPE ?? "", index++)
      );
    }
    return list;
  }

  for (const [typeKey, items] of Object.entries(
    payload as AdvisoryGroupedByTypeResponse
  )) {
    if (Array.isArray(items)) {
      for (const raw of items) {
        list.push(normalizeItem(raw, typeKey, index++));
      }
    }
  }

  return list;
}

/** Paged response from API (server-side pagination). */
export interface AdvisoryPagedResponse {
  items: AdvisoryItem[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Fetch advisories from GET api/v1/advisory.
 */
export async function getAdvisoryGroupedByType(): Promise<AdvisoryItem[]> {
  const { data } = await apiClient.get<
    | AdvisoryItemRaw[]
    | { items?: AdvisoryItemRaw[]; results?: AdvisoryItemRaw[] }
    | AdvisoryGroupedByTypeResponse
  >("advisory");
  return normalizeAdvisoryResponse(data);
}

type AdvisoryPagedPayload = {
  items?: AdvisoryItemRaw[];
  results?: AdvisoryItemRaw[];
  total?: number;
  count?: number;
  total_count?: number;
  page?: number;
  current_page?: number;
  pages?: number;
  total_pages?: number;
  limit?: number;
  page_size?: number;
};

/** Sort field names for advisory list. API orders by remaining_validity only. */
export type AdvisorySortBy = "remaining_validity" | "item" | "type";

/** Sort order: asc = nearest expiry first, desc = farthest expiry first. */
export type AdvisorySortOrder = "asc" | "desc";

/**
 * Fetch advisories with pagination, optional type filtering, and sort.
 * Sort uses remaining_validity only. GET api/v1/advisory?page=&limit=&type=&sort=
 * - Ascending (nearest expiry): sort=asc | sort=remaining_validity | omit
 * - Descending (farthest expiry): sort=desc | sort=-remaining_validity
 */
export async function getAdvisoryPaged(
  page = 1,
  limit = 10,
  search = "",
  typeFilter?: string,
  sortBy: AdvisorySortBy = "remaining_validity",
  sortOrder: AdvisorySortOrder = "desc"
): Promise<AdvisoryPagedResponse> {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };

  // API accepts single sort param for remaining_validity only: asc | desc | remaining_validity | -remaining_validity (no expiry)
  if (sortBy === "remaining_validity") {
    params.sort = sortOrder === "asc" ? "asc" : "desc";
  }

  if (search.trim()) {
    params.search = search.trim();
  }

  if (typeFilter && typeFilter !== "all" && typeFilter.trim()) {
    params.type = typeFilter.trim();
  }

  const { data } = await apiClient.get<
    | AdvisoryItemRaw[]
    | { items?: AdvisoryItemRaw[]; results?: AdvisoryItemRaw[] }
    | AdvisoryGroupedByTypeResponse
    | AdvisoryPagedPayload
  >("advisory", { params });

  const inner =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as AdvisoryPagedPayload)
      : null;

  const rawItems = Array.isArray(inner?.items)
    ? inner.items
    : Array.isArray(inner?.results)
      ? inner.results
      : null;

  if (rawItems && inner) {
    const items = normalizeAdvisoryResponse(rawItems);
    const total = Number(inner.total ?? inner.count ?? inner.total_count ?? items.length);
    const pageNum = Number(inner.page ?? inner.current_page ?? page);
    const limitUsed = Number(inner.limit ?? inner.page_size ?? limit);
    const pages =
      Number(inner.pages ?? inner.total_pages) ||
      Math.max(1, Math.ceil(total / (limitUsed || 1)));

    return { items, total, page: pageNum, pages };
  }

  // Fallback for non-paged payloads: normalize and slice client-side.
  const all = normalizeAdvisoryResponse(
    data as
      | AdvisoryItemRaw[]
      | { items?: AdvisoryItemRaw[]; results?: AdvisoryItemRaw[] }
      | AdvisoryGroupedByTypeResponse
  );
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);
  return { items, total, page, pages };
}

/**
 * Renew advisory: PUT /api/v1/advisory/{id}/{expiry}/
 * Body: { regulatory_compliance?, category_type? }
 */
export async function renewAdvisory(
  id: number | string,
  expiry: string,
  payload: RenewAdvisoryPayload
): Promise<void> {
  const body: RenewAdvisoryPayload = {};
  if (payload.regulatory_compliance)
    body.regulatory_compliance = payload.regulatory_compliance;
  if (payload.category_type) body.category_type = payload.category_type;
  await apiClient.put(`advisory/${id}/${encodeURIComponent(expiry)}/`, body);
}

/**
 * Withhold advisory: POST /api/v1/advisory/withhold/{id}/regulatory_compliance
 * Body: { regulatory_compliance? } (optional)
 */
export async function withholdAdvisory(
  id: number | string,
  regulatoryCompliance?: string
): Promise<void> {
  await apiClient.put(
    `advisory/withhold/${id}/${regulatoryCompliance}`
  );
}
