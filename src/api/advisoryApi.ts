import apiClient from "./index";
import { formatDateForApi, normalizeWebLink } from "../utility/utils";

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
  item_type?: string;
  ITEM_TYPE?: string;
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
  AUTH_ISSUE_DATE?: string;
  auth_issue_date?: string;
  authIssueDate?: string;
  AUTH_ISSUE?: string;
  auth_issue?: string;
  date_of_auth_issue?: string;
  DATE_OF_AUTH_ISSUE?: string;
  authorization_issue_date?: string;
  AUTHORIZATION_ISSUE_DATE?: string;
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
  /** Same as list `TYPE` / `item_type` when API sends it separately. */
  item_type?: string;
  expiry: string;
  remainingValidity: string;
  regulatory_compliance?: string;
  /** From list/detail API; may be empty string. */
  web_link: string;
  /** Authorization issue date (AUTH_EXPIRY and related types). */
  auth_issue_date?: string;
}

/** GET /api/v1/advisory/{id}/?regulatory_compliance=… */
export interface AdvisoryRenewDetail {
  auth_issue_date: string;
  expiry_date: string;
  web_link: string;
}

/** PUT /api/v1/advisory/{id}/renew/ (auth_issue_date only for AUTH_EXPIRY renewals). */
export interface RenewAdvisoryBody {
  regulatory_compliance: string;
  expiry_date: string;
  web_link: string;
  /** Omitted when not AUTH_EXPIRY; null or YYYY-MM-DD when included. */
  auth_issue_date?: string | null;
}

/** @deprecated Use RenewAdvisoryBody */
export type RenewAdvisoryPayload = RenewAdvisoryBody;

/** Resolve required `regulatory_compliance` query/body value from a list row. */
export function resolveAdvisoryRegulatoryCompliance(
  advisory: Pick<AdvisoryItem, "regulatory_compliance" | "category_type" | "type">
): string {
  const direct = String(advisory.regulatory_compliance ?? "").trim();
  if (direct) return direct;
  const raw = String(advisory.category_type ?? advisory.type ?? "").trim();
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** True when item_type / TYPE / category_type is AUTH_EXPIRY (renew shows auth issue date). */
export function isAuthExpiryAdvisoryType(
  type?: string,
  categoryType?: string,
  itemType?: string
): boolean {
  const norm = (s?: string) =>
    String(s ?? "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
  for (const raw of [itemType, type, categoryType]) {
    const t = norm(raw);
    if (t === "AUTH_EXPIRY" || t.includes("AUTH_EXPIRY")) return true;
  }
  return false;
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

function authIssueDateFromFlatRecord(r: Record<string, unknown>): string {
  return firstString(
    r.AUTH_ISSUE_DATE,
    r.auth_issue_date,
    r.authIssueDate,
    r.AUTH_ISSUE,
    r.auth_issue,
    r.date_of_auth_issue,
    r.DATE_OF_AUTH_ISSUE,
    r.authorization_issue_date,
    r.AUTHORIZATION_ISSUE_DATE,
    r.issue_date,
    r.ISSUE_DATE,
    r.date_of_issue,
    r.DATE_OF_ISSUE
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
    authIssueDateFromFlatRecord(o) !== "" ||
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

/** Resolve auth issue date from list/detail shapes (top-level or one-level nested). */
function extractAuthIssueDate(raw: AdvisoryItemRaw): string {
  const r = raw as Record<string, unknown>;
  let s = authIssueDateFromFlatRecord(r);
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
      s = authIssueDateFromFlatRecord(n as Record<string, unknown>);
      if (s) return s;
    }
  }
  return "";
}

/** Normalize expiry strings from the API for DateInput (YYYY-MM-DD). */
export function advisoryExpiryToDateInputValue(
  dateStr: string | null | undefined
): string {
  return formatDateForApi(dateStr);
}

/** Renew form/API text: null, undefined, or placeholder → "". */
export function renewTextFieldOrEmpty(
  value: string | null | undefined
): string {
  const s = String(value ?? "").trim();
  if (!s || s === "-" || s === "—" || /^n\/?a$/i.test(s)) return "";
  return s;
}

/** Renew date field: unparseable or missing → "". */
export function renewDateFieldOrEmpty(
  value: string | null | undefined
): string {
  return advisoryExpiryToDateInputValue(value) || "";
}

/** AUTH_EXPIRY renew: expiration = auth issue date + 1 calendar year (YYYY-MM-DD). */
export function expiryFromAuthIssueDate(
  authIssueDate: string | null | undefined
): string {
  const issue = renewDateFieldOrEmpty(authIssueDate);
  if (!issue) return "";
  const [y, m, d] = issue.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return "";
  }
  const date = new Date(y, m - 1, d);
  date.setFullYear(date.getFullYear() + 1);
  const y2 = date.getFullYear();
  const m2 = String(date.getMonth() + 1).padStart(2, "0");
  const d2 = String(date.getDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

/** Renew web_link: no data → ""; otherwise normalized URL. */
export function renewWebLinkFieldOrEmpty(
  value: string | null | undefined
): string {
  const raw = renewTextFieldOrEmpty(value);
  if (!raw) return "";
  return normalizeWebLink(raw) ?? raw;
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
    raw?.expiry_date,
    raw?.EXPIRY_DATE,
    raw?.EXPIRY,
    raw?.expiry,
    raw?.EXPIRATION_DATE,
    raw?.expiration_date,
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

  const item_type = firstString(raw?.item_type, raw?.ITEM_TYPE, type);

  const web_link = extractWebLink(raw);
  const auth_issue_date = extractAuthIssueDate(raw);

  return {
    id: Number.isFinite(idValue) ? idValue : index,
    item,
    type,
    expiry,
    remainingValidity,
    web_link,
    ...(regulatory_compliance ? { regulatory_compliance } : {}),
    ...(category_type ? { category_type } : {}),
    ...(item_type ? { item_type } : {}),
    ...(auth_issue_date ? { auth_issue_date } : {}),
  };
}

/** Merge GET advisory/{id}/?regulatory_compliance=… into renew form state. */
export function mergeAdvisoryRenewFormFromDetail(
  prev: {
    id: number;
    expiry: string;
    category_type: string;
    web_link: string;
    auth_issue_date: string;
    regulatory_compliance: string;
  },
  detail: AdvisoryRenewDetail
): typeof prev {
  return {
    ...prev,
    expiry: detail.expiry_date || prev.expiry,
    web_link: renewTextFieldOrEmpty(detail.web_link),
    auth_issue_date: renewDateFieldOrEmpty(detail.auth_issue_date),
  };
}

function parseAdvisoryRenewDetail(raw: unknown): AdvisoryRenewDetail | null {
  const root = parseMaybeJsonResponse(raw);
  if (root == null || typeof root !== "object") return null;

  let o = root as Record<string, unknown>;
  if (o.data != null && typeof o.data === "object" && !Array.isArray(o.data)) {
    o = o.data as Record<string, unknown>;
  } else if (
    o.result != null &&
    typeof o.result === "object" &&
    !Array.isArray(o.result)
  ) {
    o = o.result as Record<string, unknown>;
  }

  const expiry_date = advisoryExpiryToDateInputValue(
    firstString(
      o.expiry_date,
      o.EXPIRY_DATE,
      o.expiry,
      o.EXPIRY,
      o.EXPIRATION_DATE,
      o.expiration_date
    )
  );
  if (!expiry_date) return null;

  const auth_issue_date = renewDateFieldOrEmpty(
    firstString(
      o.auth_issue_date,
      o.AUTH_ISSUE_DATE,
      o.authIssueDate,
      authIssueDateFromFlatRecord(o)
    )
  );
  const web_link = renewTextFieldOrEmpty(
    firstString(o.web_link, o.WEB_LINK, o.webLink)
  );

  return {
    expiry_date,
    auth_issue_date,
    web_link,
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
 * GET advisory renewal fields.
 * GET /api/v1/advisory/{id}/?regulatory_compliance={value} (required)
 */
export async function getAdvisoryForRenew(
  id: number | string,
  regulatory_compliance: string
): Promise<AdvisoryRenewDetail> {
  const rc = String(regulatory_compliance ?? "").trim();
  if (!rc) {
    throw new Error("regulatory_compliance is required");
  }
  const params = new URLSearchParams({ regulatory_compliance: rc });
  const { data } = await apiClient.get<unknown>(
    `advisory/${id}/?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );
  const parsed = parseAdvisoryRenewDetail(data);
  if (!parsed) {
    throw new Error("Invalid advisory detail response");
  }
  return parsed;
}

/** @deprecated Use getAdvisoryForRenew(id, regulatory_compliance) */
export async function getAdvisoryById(
  id: number | string,
  regulatory_compliance?: string
): Promise<AdvisoryItem | null> {
  if (regulatory_compliance?.trim()) {
    try {
      const detail = await getAdvisoryForRenew(id, regulatory_compliance);
      const idNum = Number(id);
      return {
        id: Number.isFinite(idNum) ? idNum : 0,
        item: "",
        type: "",
        expiry: detail.expiry_date,
        remainingValidity: "",
        web_link: detail.web_link,
        auth_issue_date: detail.auth_issue_date,
        regulatory_compliance: regulatory_compliance.trim(),
      };
    } catch {
      return null;
    }
  }
  return null;
}

/** Input for PUT /advisory/{id}/renew/ */
export type BuildRenewAdvisoryBodyInput = {
  regulatory_compliance: string;
  expiry_date: string;
  web_link: string;
  auth_issue_date?: string | null;
  /** When false, auth_issue_date is not sent (non–AUTH_EXPIRY). */
  include_auth_issue_date?: boolean;
};

/**
 * Build PUT /advisory/{id}/renew/ body.
 * auth_issue_date is only included when include_auth_issue_date is true;
 * empty value is sent as null (not required).
 */
export function buildRenewAdvisoryBody(
  fields: BuildRenewAdvisoryBodyInput
): RenewAdvisoryBody {
  const regulatory_compliance = String(
    fields.regulatory_compliance ?? ""
  ).trim();
  const expiry_date = renewDateFieldOrEmpty(fields.expiry_date);
  const web_link = renewWebLinkFieldOrEmpty(fields.web_link);

  const body: RenewAdvisoryBody = {
    regulatory_compliance,
    expiry_date,
    web_link,
  };

  if (fields.include_auth_issue_date) {
    const auth_issue_date = renewDateFieldOrEmpty(fields.auth_issue_date);
    body.auth_issue_date = auth_issue_date || null;
  }

  return body;
}

/**
 * Renew advisory: PUT /api/v1/advisory/{id}/renew/
 */
export async function renewAdvisory(
  id: number | string,
  fields: BuildRenewAdvisoryBodyInput
): Promise<void> {
  const body = buildRenewAdvisoryBody(fields);
  if (!body.regulatory_compliance) {
    throw new Error("regulatory_compliance is required");
  }
  if (!body.expiry_date) {
    throw new Error("expiry_date is required");
  }
  await apiClient.put(`advisory/${id}/renew/`, body, {
    headers: { "Content-Type": "application/json" },
  });
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
