import apiClient from "./index";

/** CRUD + paged list: /api/v1/personnel-compliance/ */
const COMPLIANCE = "personnel-compliance";

/** Filter values for personnel-compliance/paged `item_type` query param. */
export const PERSONNEL_COMPLIANCE_ITEM_TYPES = [
  "AUTH_EXPIRY",
  "CAAP_LICENSE",
  "HF_TRAINING",
  "CESSNA",
  "BARON",
  "OTHERS",
] as const;

export type PersonnelComplianceItemType =
  (typeof PERSONNEL_COMPLIANCE_ITEM_TYPES)[number];

const pathComplianceOne = (id: number) => `${COMPLIANCE}/${id}/`;

/** Single personnel authorization record (app-facing). */
export interface PersonnelAuthorizationRecord {
  id: number;
  /** Set when record is linked to account information (for edit/update). */
  accountInformationId?: number;
  authorizationNo: string;
  name: string;
  position: string;
  licNoType: string;
  authInitialDOI: string;
  authIssueDate: string;
  authExpiryDate: string;
  /** Display name from API (authorization_scope_cessna.name). */
  scopeCessna: string;
  scopeBaron: string;
  scopeOthers: string;
  /** Scope FK ids for edit/update payload. */
  scopeCessnaId?: number;
  scopeBaronId?: number;
  scopeOthersId?: number;
  caapLicExpiry: string;
  hfTrainingExpiry: string;
  typeTrainingCessna: string;
  typeTrainingBaron: string;
  isWithhold?: boolean;
  /** List view: item type from API (item_type). */
  itemType: string;
  /** List view: single scope label or combined from API. */
  authorizationScope: string;
  /** List view: separate expiry (expiry_date), distinct from auth expiry. */
  expiryDate: string;
}

/**
 * POST / PUT body for /api/v1/personnel-compliance/
 * (single expiry_date; scopes as FK ids).
 */
export interface PersonnelCompliancePayload {
  account_information_id?: number;
  item_type: string;
  authorization_scope_cessna_id?: number | null;
  authorization_scope_baron_id?: number | null;
  authorization_scope_others_id?: number | null;
  auth_issue_date?: string;
  expiry_date?: string;
}

export type PersonnelAuthorizationCreate = PersonnelCompliancePayload;
export type PersonnelAuthorizationUpdate = PersonnelCompliancePayload;

function getStr(
  raw: Record<string, unknown>,
  ...keys: (string | undefined)[]
): string {
  for (const k of keys) {
    if (k == null) continue;
    const v = raw[k];
    if (v != null && typeof v === "string") return v;
    const snake = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    const w = raw[snake];
    if (w != null && typeof w === "string") return w;
  }
  return "";
}

/** Get scope id from raw: direct key (e.g. authorization_scope_cessna_id) or nested object id */
function getScopeId(
  raw: Record<string, unknown>,
  idKey: string,
  nestedKey: string
): number {
  const v = raw[idKey];
  if (v != null && (typeof v === "number" && Number.isFinite(v))) return v;
  if (v != null && typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  const nested = raw[nestedKey];
  if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
    const obj = nested as Record<string, unknown>;
    const id = obj.id ?? obj.pk;
    if (id != null && (typeof id === "number" && Number.isFinite(id))) return id;
    if (id != null && typeof id === "string") {
      const n = Number(id);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

/** Get scope name from raw: string or nested object (e.g. authorization_scope_cessna.name) */
function getScopeName(
  raw: Record<string, unknown>,
  directKeys: string[],
  nestedKey: string
): string {
  for (const k of directKeys) {
    if (!k) continue;
    const v = raw[k];
    if (v != null && typeof v === "string") return (v as string).trim();
  }
  const nested = raw[nestedKey];
  if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
    const obj = nested as Record<string, unknown>;
    const name = obj.name ?? obj.value ?? obj.label;
    if (name != null && typeof name === "string") return String(name).trim();
  }
  return "";
}

/** From account_information: { designation, auth_stamp, full_name: { last_name, first_name }, license } */
function getStrFromAccountInfo(
  acc: Record<string, unknown>,
  key: string,
  altKey?: string
): string {
  const v = acc[key] ?? (altKey ? acc[altKey] : undefined);
  if (v != null && typeof v === "string") return (v as string).trim();
  return "";
}

/** full_name: { last_name, first_name } → display as "last_name, first_name" */
function formatFullName(fullName: unknown): string {
  if (fullName == null) return "";
  if (typeof fullName === "string") return fullName.trim();
  if (typeof fullName === "object" && !Array.isArray(fullName)) {
    const o = fullName as Record<string, unknown>;
    const last = (o.last_name ?? o.lastName) != null ? String(o.last_name ?? o.lastName).trim() : "";
    const first = (o.first_name ?? o.firstName) != null ? String(o.first_name ?? o.firstName).trim() : "";
    if (last && first) return `${last}, ${first}`;
    if (last) return last;
    if (first) return first;
  }
  return "";
}

/** List row: AUTHORIZATION_SCOPE follows ITEM_TYPE → matching scope nested `.name`. */
function authorizationScopeForItemType(
  itemType: string,
  scopeCessnaName: string,
  scopeBaronName: string,
  scopeOthersName: string,
  fallback: string
): string {
  const u = itemType.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "CESSNA" || u === "CESSANA") return scopeCessnaName || fallback;
  if (u === "BARON") return scopeBaronName || fallback;
  if (u === "OTHERS" || u === "OTHER") return scopeOthersName || fallback;
  return fallback;
}

function extractPagedItemsAndMeta(raw: Record<string, unknown>): {
  items: unknown[];
  total: number | null;
  pages: number | null;
  limit: number;
} {
  const data = raw ?? {};
  const envelope =
    data?.data != null && typeof data.data === "object" && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data;
  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray(envelope)
      ? envelope
      : (envelope?.items ??
          envelope?.results ??
          envelope?.data ??
          data.items ??
          data.results ??
          []) as unknown;
  const list = Array.isArray(rawItems) ? rawItems : [];
  const limit = Number(envelope?.limit ?? data.limit ?? 10) || 10;

  const totalRaw = envelope?.total ?? envelope?.count ?? data.total ?? data.count;
  const total =
    totalRaw != null && Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : null;

  const pagesRaw = envelope?.pages ?? data.pages;
  const pages =
    pagesRaw != null && Number.isFinite(Number(pagesRaw)) && Number(pagesRaw) >= 1
      ? Number(pagesRaw)
      : null;

  return { items: list, total, pages, limit };
}

function normalizeItem(
  raw: Record<string, unknown> | null | undefined
): PersonnelAuthorizationRecord {
  if (raw == null || typeof raw !== "object") {
    return {
      id: 0,
      authorizationNo: "",
      name: "",
      position: "",
      licNoType: "",
      authInitialDOI: "",
      authIssueDate: "",
      authExpiryDate: "",
      scopeCessna: "",
      scopeBaron: "",
      scopeOthers: "",
      caapLicExpiry: "",
      hfTrainingExpiry: "",
      typeTrainingCessna: "",
      typeTrainingBaron: "",
      isWithhold: false,
      itemType: "",
      authorizationScope: "",
      expiryDate: "",
    };
  }
  const id = Number(raw.id ?? 0);
  const accountInfo = raw.account_information;
  const isAcc = accountInfo != null && typeof accountInfo === "object" && !Array.isArray(accountInfo);
  const acc = isAcc ? (accountInfo as Record<string, unknown>) : ({} as Record<string, unknown>);
  const accountInformationId =
    Number(raw.account_information_id ?? 0) ||
    (isAcc ? Number(acc.id ?? acc.account_information_id ?? 0) : 0);

  const authorizationNo =
    (isAcc ? getStrFromAccountInfo(acc, "auth_stamp", "Auth_stamp") : "") ||
    getStr(raw, "authorizationNo", "authorization_no");
  const name =
    (isAcc ? (formatFullName(acc.full_name) || formatFullName(acc)) : "") ||
    getStr(raw, "name", "full_name");
  const position =
    (isAcc ? getStrFromAccountInfo(acc, "designation") : "") ||
    getStr(raw, "position", "designation");
  const licNoType =
    (isAcc ? getStrFromAccountInfo(acc, "license") : "") ||
    getStr(raw, "licNoType", "license_no_type");

  const scopeCessnaId = getScopeId(raw, "authorization_scope_cessna_id", "authorization_scope_cessna");
  const scopeBaronId = getScopeId(raw, "authorization_scope_baron_id", "authorization_scope_baron");
  const scopeOthersId = getScopeId(raw, "authorization_scope_others_id", "authorization_scope_others");

  const scopeCessnaName = getScopeName(raw, ["scopeCessna", "scope_cessna"], "authorization_scope_cessna");
  const scopeBaronName = getScopeName(raw, ["scopeBaron", "scope_baron"], "authorization_scope_baron");
  const scopeOthersName = getScopeName(raw, ["scopeOthers", "scope_others"], "authorization_scope_others");
  const combinedScope = [scopeCessnaName, scopeBaronName, scopeOthersName]
    .filter((s) => s.length > 0)
    .join(" · ");

  const authorizationScopeSingle =
    getStr(raw, "authorizationScope", "authorization_scope") ||
    getScopeName(raw, [], "authorization_scope");

  const itemTypeStr = getStr(raw, "itemType", "item_type", "ITEM_TYPE");
  const scopeFallback = authorizationScopeSingle || combinedScope;
  const authorizationScopeResolved = authorizationScopeForItemType(
    itemTypeStr,
    scopeCessnaName,
    scopeBaronName,
    scopeOthersName,
    scopeFallback
  );

  const expiryDateApi = getStr(raw, "expiryDate", "expiry_date", "EXPIRY_DATE");
  let authExpiryDate = getStr(raw, "authExpiryDate", "auth_expiry_date");
  let caapLicExpiry = getStr(raw, "caapLicExpiry", "caap_license_expiry", "caap_lic_expiry");
  let hfTrainingExpiry = getStr(raw, "hfTrainingExpiry", "human_factors_training_expiry", "hf_training_expiry");
  let typeTrainingCessna = getStr(raw, "typeTrainingCessna", "type_training_expiry_cessna", "type_training_cessna");
  let typeTrainingBaron = getStr(raw, "typeTrainingBaron", "type_training_expiry_baron", "type_training_baron");

  if (expiryDateApi) {
    const u = itemTypeStr.trim().toUpperCase().replace(/\s+/g, "_");
    if (!authExpiryDate && (u === "AUTH_EXPIRY" || u === "OTHERS"))
      authExpiryDate = expiryDateApi;
    if (!caapLicExpiry && u === "CAAP_LICENSE") caapLicExpiry = expiryDateApi;
    if (!hfTrainingExpiry && u === "HF_TRAINING") hfTrainingExpiry = expiryDateApi;
    if (!typeTrainingCessna && u === "CESSNA") typeTrainingCessna = expiryDateApi;
    if (!typeTrainingBaron && u === "BARON") typeTrainingBaron = expiryDateApi;
  }

  return {
    id: isNaN(id) ? 0 : id,
    accountInformationId: Number.isFinite(accountInformationId) ? accountInformationId : undefined,
    authorizationNo,
    name,
    position,
    licNoType,
    authInitialDOI: getStr(raw, "authInitialDOI", "auth_initial_doi"),
    authIssueDate: getStr(raw, "authIssueDate", "auth_issue_date"),
    authExpiryDate,
    scopeCessna: scopeCessnaName,
    scopeBaron: scopeBaronName,
    scopeOthers: scopeOthersName,
    scopeCessnaId: scopeCessnaId || undefined,
    scopeBaronId: scopeBaronId || undefined,
    scopeOthersId: scopeOthersId || undefined,
    caapLicExpiry,
    hfTrainingExpiry,
    typeTrainingCessna,
    typeTrainingBaron,
    isWithhold: Boolean((raw as any).is_withhold ?? (raw as any).isWithhold ?? false),
    itemType: itemTypeStr,
    authorizationScope: authorizationScopeResolved,
    expiryDate: expiryDateApi,
  };
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: unknown } }).response;
    const data = res?.data;
    if (data && typeof data === "object") {
      const msg =
        (data as any).message ??
        (data as any).detail ??
        (Array.isArray((data as any).errors)
          ? (data as any).errors.join(" ")
          : null);
      if (msg && typeof msg === "string") return msg;
    }
  }
  return err instanceof Error ? err.message : fallback;
}

export interface GetPersonnelAuthorizationsOptions {
  /** When set, sent as `item_type` on personnel-compliance/paged. */
  itemType?: PersonnelComplianceItemType | "";
  /**
   * Order by EXPIRY_DATE on personnel-compliance/paged:
   * - asc → `sort=expiry_date`
   * - desc → `sort=-expiry_date`
   */
  sortExpiryDate?: "asc" | "desc";
}

/**
 * GET list for table. API: /api/v1/personnel-compliance/paged?page=&limit=&item_type=&sort=
 * Fetches all pages and merges (UI still paginates client-side).
 */
export async function getPersonnelAuthorizations(
  options?: GetPersonnelAuthorizationsOptions
): Promise<PersonnelAuthorizationRecord[]> {
  const limit = 100;
  const maxPages = 500;
  const all: PersonnelAuthorizationRecord[] = [];
  const itemTypeFilter =
    options?.itemType && String(options.itemType).trim() !== ""
      ? String(options.itemType).trim()
      : "";
  const sortExpiry = options?.sortExpiryDate;
  const sortParam =
    sortExpiry === "asc"
      ? "expiry_date"
      : sortExpiry === "desc"
        ? "-expiry_date"
        : "";

  try {
    let page = 1;

    while (page <= maxPages) {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (itemTypeFilter) params.set("item_type", itemTypeFilter);
      if (sortParam) params.set("sort", sortParam);
      const path = `${COMPLIANCE}/paged?${params.toString()}`;
      const res = await apiClient.get(path, {
        headers: { Accept: "application/json" },
      });
      const root = (res.data ?? {}) as Record<string, unknown>;
      const { items, pages, total, limit: pageLimit } = extractPagedItemsAndMeta(root);

      if (items.length === 0) break;

      for (const item of items) {
        all.push(normalizeItem((item as Record<string, unknown>) ?? {}));
      }

      if (pages != null && page >= pages) break;
      if (total != null && all.length >= total) break;
      if (items.length < pageLimit) break;

      page += 1;
    }

    return all;
  } catch (err) {
    console.error("personnel-compliance/paged list failed:", err);
    return [];
  }
}

/**
 * GET single. API: /api/v1/personnel-compliance/{id}/
 */
export async function getPersonnelAuthorization(
  id: number
): Promise<PersonnelAuthorizationRecord> {
  const res = await apiClient.get(pathComplianceOne(id), {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null && typeof raw === "object")
    return normalizeItem(raw as Record<string, unknown>);
  return normalizeItem({ id });
}

function buildPersonnelComplianceBody(
  payload: PersonnelCompliancePayload
): Record<string, string | number | null | undefined> {
  const scopeIdOrNull = (id: number | null | undefined): number | null =>
    id != null && Number.isFinite(id) && id > 0 ? id : null;

  const body: Record<string, string | number | null | undefined> = {
    item_type: payload.item_type.trim(),
    authorization_scope_cessna_id: scopeIdOrNull(
      payload.authorization_scope_cessna_id ?? undefined
    ),
    authorization_scope_baron_id: scopeIdOrNull(
      payload.authorization_scope_baron_id ?? undefined
    ),
    authorization_scope_others_id: scopeIdOrNull(
      payload.authorization_scope_others_id ?? undefined
    ),
  };
  if (
    payload.account_information_id != null &&
    Number.isFinite(payload.account_information_id) &&
    payload.account_information_id > 0
  ) {
    body.account_information_id = payload.account_information_id;
  }
  const issue = payload.auth_issue_date?.trim();
  if (issue) body.auth_issue_date = issue;
  const exp = payload.expiry_date?.trim();
  if (exp) body.expiry_date = exp;
  return body;
}

/**
 * POST create. API: /api/v1/personnel-compliance/
 */
export async function createPersonnelAuthorization(
  payload: PersonnelCompliancePayload
): Promise<PersonnelAuthorizationRecord> {
  const body = buildPersonnelComplianceBody(payload);
  const res = await apiClient.post(`${COMPLIANCE}/`, body, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const rawRes = res.data?.data ?? res.data;
  if (rawRes != null && typeof rawRes === "object")
    return normalizeItem(rawRes as Record<string, unknown>);
  return normalizeItem({ ...body });
}

/**
 * PUT update. API: /api/v1/personnel-compliance/{id}/
 */
export async function updatePersonnelAuthorization(
  id: number,
  payload: PersonnelCompliancePayload
): Promise<PersonnelAuthorizationRecord> {
  const body = buildPersonnelComplianceBody(payload);
  const res = await apiClient.put(pathComplianceOne(id), body, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const rawRes = res.data?.data ?? res.data;
  if (rawRes != null && typeof rawRes === "object")
    return normalizeItem(rawRes as Record<string, unknown>);
  return normalizeItem({ id, ...body });
}

/**
 * DELETE. API: /api/v1/personnel-compliance/{id}/
 */
export async function deletePersonnelAuthorization(id: number): Promise<void> {
  await apiClient.delete(pathComplianceOne(id));
}

export { getApiErrorMessage as getPersonnelApiErrorMessage };
