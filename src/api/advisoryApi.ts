import apiClient from "./index";

/**
 * Advisory payloads can arrive in either camelCase or uppercase field names.
 * Paged list GET api/v1/advisory example:
 * { items: [{ id, regulatory_compliance, ITEM, TYPE, EXPIRY, REMAINING_VALIDITY, REMAINING_DAYS?, category_type, web_link }], total, page, pages }
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
  expiration_date?: string;
  EXPIRATION_DATE?: string;
  expiry_date?: string;
  EXPIRY_DATE?: string;
  date_of_expiration?: string;
  DATE_OF_EXPIRATION?: string;
  REMAINING_VALIDITY?: number | string;
  remaining_validity?: number | string;
  remainingValidity?: number | string;
  REMAINING_DAYS?: number | string;
  remaining_days?: number | string;
  regulatory_compliance?: string;
  WEB_LINK?: string;
  web_link?: string;
  webLink?: string;
  WEBLINK?: string;
  weblink?: string;
  link?: string;
  LINK?: string;
  url?: string;
  URL?: string;
  pk?: number | string;
  PK?: number | string;
  ID?: number | string;
  advisoryId?: number | string;
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
  /** From list/detail API; may be empty string. */
  web_link: string;
}

/** Payload for renew advisory: PUT advisory/{id}/{expiry}/ */
export interface RenewAdvisoryPayload {
  regulatory_compliance?: string;
  category_type?: string;
  web_link?: string;
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

/** Advisory primary key from common API spellings; null if missing or not numeric. */
function advisoryPkFromRaw(raw: unknown): number | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const candidates = [
    o.advisory_id,
    o.id,
    o.pk,
    o.PK,
    o.ID,
    o.advisoryId,
  ];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = typeof c === "number" ? c : Number(String(c).trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function webLinkFromFlatRecord(r: Record<string, unknown>): string {
  return firstString(
    r.WEB_LINK,
    r.web_link,
    r.webLink,
    r.WEBLINK,
    r.weblink,
    r.WEB_LINK_URL,
    r.web_link_url,
    r.assign_link,
    r.assignLink,
    r.link_to_manual,
    r.linkToManual,
    r.link,
    r.LINK,
    r.url,
    r.URL,
    r.uri,
    r.URI,
    r.href,
    r.HREF,
    r.source_url,
    r.sourceUrl
  );
}

function hasExpiryLikeField(o: Record<string, unknown>): boolean {
  return (
    firstString(
      o.EXPIRY,
      o.expiry,
      o.EXPIRATION_DATE,
      o.expiration_date,
      o.EXPIRY_DATE,
      o.expiry_date,
      o.DATE_OF_EXPIRATION,
      o.date_of_expiration
    ) !== ""
  );
}

function looksLikeAdvisoryRow(o: Record<string, unknown>): boolean {
  return (
    advisoryPkFromRaw(o) != null ||
    firstString(o.ITEM, o.item) !== "" ||
    firstString(o.TYPE, o.type) !== "" ||
    (typeof o.category_type === "string" && o.category_type.trim() !== "") ||
    (typeof o.regulatory_compliance === "string" &&
      o.regulatory_compliance.trim() !== "") ||
    webLinkFromFlatRecord(o) !== "" ||
    hasExpiryLikeField(o) ||
    o.REMAINING_VALIDITY != null ||
    o.remaining_validity != null ||
    o.remainingValidity != null ||
    o.REMAINING_DAYS != null ||
    o.remaining_days != null
  );
}

function asAdvisoryRawIfShape(o: unknown): AdvisoryItemRaw | null {
  if (o == null || typeof o !== "object" || Array.isArray(o)) return null;
  const obj = o as Record<string, unknown>;
  if (!looksLikeAdvisoryRow(obj)) return null;
  return obj as AdvisoryItemRaw;
}

/** Unwrap GET advisory/{id}/ JSON into a single advisory object (many backends wrap in data/result/etc.). */
function unwrapAdvisoryDetailPayload(root: unknown): AdvisoryItemRaw | null {
  if (root == null) return null;
  if (Array.isArray(root)) {
    for (const el of root) {
      const u = unwrapAdvisoryDetailPayload(el);
      if (u) return u;
    }
    return null;
  }
  if (typeof root !== "object") return null;
  const r = root as Record<string, unknown>;

  const direct = asAdvisoryRawIfShape(r);
  if (direct) return direct;

  for (const key of [
    "data",
    "result",
    "payload",
    "advisory",
    "detail",
    "document",
    "object",
    "body",
  ]) {
    const hit = asAdvisoryRawIfShape(r[key]);
    if (hit) return hit;
    const nested = r[key];
    if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
      const inner = (nested as Record<string, unknown>).advisory;
      const fromInner = asAdvisoryRawIfShape(inner ?? nested);
      if (fromInner) return fromInner;
    }
  }

  const results = r.results;
  if (Array.isArray(results) && results[0]) {
    const fromArr = asAdvisoryRawIfShape(results[0]);
    if (fromArr) return fromArr;
  }

  const items = r.items;
  if (Array.isArray(items) && items.length === 1) {
    const fromArr = asAdvisoryRawIfShape(items[0]);
    if (fromArr) return fromArr;
  }

  return null;
}

/** Detail endpoint sometimes returns the same shape as the list (items/results with one row). */
function findAdvisoryRowByIdInPayload(
  root: unknown,
  id: number | string
): AdvisoryItemRaw | null {
  const want = Number(id);
  if (!Number.isFinite(want) || root == null || typeof root !== "object")
    return null;
  if (Array.isArray(root)) {
    for (const el of root) {
      if (advisoryPkFromRaw(el) === want) return el as AdvisoryItemRaw;
    }
    return null;
  }
  const r = root as Record<string, unknown>;
  for (const key of ["items", "results", "data", "payload", "advisory"]) {
    const v = r[key];
    if (!Array.isArray(v)) continue;
    for (const el of v) {
      if (advisoryPkFromRaw(el) === want) return el as AdvisoryItemRaw;
    }
  }
  return null;
}

function deepFindAdvisoryRecord(
  node: unknown,
  depth = 0,
  preferredPk: number | null = null
): AdvisoryItemRaw | null {
  if (depth > 12 || node == null) return null;
  const hit = asAdvisoryRawIfShape(node);
  if (hit) {
    if (preferredPk == null) return hit;
    const pk = advisoryPkFromRaw(hit);
    if (pk === preferredPk) return hit;
  }
  if (typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const el of node.slice(0, 80)) {
      const inner = deepFindAdvisoryRecord(el, depth + 1, preferredPk);
      if (inner) return inner;
    }
    return null;
  }
  for (const v of Object.values(node as Record<string, unknown>)) {
    const inner = deepFindAdvisoryRecord(v, depth + 1, preferredPk);
    if (inner) return inner;
  }
  return null;
}

function parseMaybeJsonResponse(data: unknown): unknown {
  if (typeof data !== "string") return data;
  const t = data.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return data;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return data;
  }
}

/** Resolve web_link from list/detail shapes (top-level or one-level nested). */
function extractWebLink(raw: AdvisoryItemRaw): string {
  const r = raw as Record<string, unknown>;
  let s = webLinkFromFlatRecord(r);
  if (s) return s;
  for (const key of [
    "advisory",
    "detail",
    "document",
    "metadata",
    "fields",
  ]) {
    const n = r[key];
    if (n != null && typeof n === "object" && !Array.isArray(n)) {
      s = webLinkFromFlatRecord(n as Record<string, unknown>);
      if (s) return s;
    }
  }
  return "";
}

/** Normalize expiry strings from the API for HTML date inputs (YYYY-MM-DD). */
export function advisoryExpiryToDateInputValue(
  dateStr: string | null | undefined
): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const trimmed = dateStr.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const pk = advisoryPkFromRaw(raw);
  const idValue = pk !== null ? pk : index;
  const item = firstString(raw?.ITEM, raw?.item);
  const type = firstString(raw?.TYPE, raw?.type, typeKey);
  const expiry = firstString(
    raw?.EXPIRY,
    raw?.expiry,
    raw?.EXPIRATION_DATE,
    raw?.expiration_date,
    raw?.EXPIRY_DATE,
    raw?.expiry_date,
    raw?.DATE_OF_EXPIRATION,
    raw?.date_of_expiration
  );
  const remainingValidity = formatRemainingValidity(
    raw?.REMAINING_VALIDITY ??
      raw?.remaining_validity ??
      raw?.remainingValidity ??
      raw?.REMAINING_DAYS ??
      raw?.remaining_days
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

  const web_link = extractWebLink(raw);

  return {
    id: Number.isFinite(idValue) ? idValue : index,
    item,
    type,
    expiry,
    remainingValidity,
    web_link,
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
 * GET single advisory for renew/edit (full fields e.g. web_link). GET /api/v1/advisory/{id}/
 * Tries trailing slash and no-slash paths; unwraps common response envelopes.
 */
export async function getAdvisoryById(
  id: number | string
): Promise<AdvisoryItem | null> {
  const tryGet = async (path: string): Promise<unknown | null> => {
    try {
      const { data } = await apiClient.get<unknown>(path, {
        headers: { Accept: "application/json" },
      });
      return parseMaybeJsonResponse(data ?? null);
    } catch {
      return null;
    }
  };

  const raw =
    (await tryGet(`advisory/${id}/`)) ?? (await tryGet(`advisory/${id}`));
  const wantNum = Number(id);
  const preferredPk = Number.isFinite(wantNum) ? wantNum : null;
  let inner: AdvisoryItemRaw | null =
    unwrapAdvisoryDetailPayload(raw) ??
    (preferredPk != null ? findAdvisoryRowByIdInPayload(raw, id) : null) ??
    deepFindAdvisoryRecord(raw, 0, preferredPk);
  if (inner == null) {
    inner = deepFindAdvisoryRecord(raw, 0, null);
  }
  if (inner == null) return null;
  const typeHint = firstString(inner.TYPE, inner.type, "");
  const idNum = Number(id);
  return normalizeItem(
    inner,
    typeHint,
    Number.isFinite(idNum) ? idNum : 0
  );
}

/**
 * Renew advisory: PUT /api/v1/advisory/{id}/{expiry}/
 * Body: { regulatory_compliance?, category_type?, web_link? } — include `web_link` when updating advisory URL (may be "").
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
  if (payload.web_link !== undefined)
    body.web_link = String(payload.web_link).trim();
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
