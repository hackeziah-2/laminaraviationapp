import apiClient from "./index";

/** Path under apiClient baseURL. Full: /api/v1/personnel-authorization/ */
const BASE = "personnel-authorization";

/** Creation: POST /personnel-authorization/ */
const PATH_CREATE = "personnel-authorization/";

/** Update: PUT /personnel-authorization/{id}/ */
const pathUpdate = (id: number) => `personnel-authorization/${id}/`;

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
}

/** Create payload (snake_case for API). Scope fields are IDs (0 or id). */
export interface PersonnelAuthorizationCreate {
  account_information_id?: number;
  authorization_no: string;
  name: string;
  position: string;
  license_no_type?: string;
  auth_initial_doi?: string;
  auth_issue_date?: string;
  auth_expiry_date?: string;
  authorization_scope_cessna_id?: number;
  authorization_scope_baron_id?: number;
  authorization_scope_others_id?: number;
  caap_license_expiry?: string;
  human_factors_training_expiry?: string;
  type_training_expiry_cessna?: string;
  type_training_expiry_baron?: string;
}

/** Update payload (snake_case, all optional). Scope fields are IDs (0 or id). */
export interface PersonnelAuthorizationUpdate {
  account_information_id?: number;
  authorization_no?: string;
  name?: string;
  position?: string;
  license_no_type?: string;
  auth_initial_doi?: string;
  auth_issue_date?: string;
  auth_expiry_date?: string;
  authorization_scope_cessna_id?: number;
  authorization_scope_baron_id?: number;
  authorization_scope_others_id?: number;
  caap_license_expiry?: string;
  human_factors_training_expiry?: string;
  type_training_expiry_cessna?: string;
  type_training_expiry_baron?: string;
}

export interface PersonnelAuthorizationPagedResponse {
  items: PersonnelAuthorizationRecord[];
  total: number;
  page: number;
  pages: number;
}

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
    (isAcc ? formatFullName(acc.full_name) : "") ||
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

  return {
    id: isNaN(id) ? 0 : id,
    accountInformationId: Number.isFinite(accountInformationId) ? accountInformationId : undefined,
    authorizationNo,
    name,
    position,
    licNoType,
    authInitialDOI: getStr(raw, "authInitialDOI", "auth_initial_doi"),
    authIssueDate: getStr(raw, "authIssueDate", "auth_issue_date"),
    authExpiryDate: getStr(raw, "authExpiryDate", "auth_expiry_date"),
    scopeCessna: getScopeName(raw, ["scopeCessna", "scope_cessna"], "authorization_scope_cessna"),
    scopeBaron: getScopeName(raw, ["scopeBaron", "scope_baron"], "authorization_scope_baron"),
    scopeOthers: getScopeName(raw, ["scopeOthers", "scope_others"], "authorization_scope_others"),
    scopeCessnaId: scopeCessnaId || undefined,
    scopeBaronId: scopeBaronId || undefined,
    scopeOthersId: scopeOthersId || undefined,
    caapLicExpiry: getStr(raw, "caapLicExpiry", "caap_license_expiry", "caap_lic_expiry"),
    hfTrainingExpiry: getStr(raw, "hfTrainingExpiry", "human_factors_training_expiry", "hf_training_expiry"),
    typeTrainingCessna: getStr(raw, "typeTrainingCessna", "type_training_expiry_cessna", "type_training_cessna"),
    typeTrainingBaron: getStr(raw, "typeTrainingBaron", "type_training_expiry_baron", "type_training_baron"),
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

/**
 * GET paged list. API: /api/v1/personnel-authorization/paged?limit=10&page=1&ordering=account_information_id__auth_stamp
 * Sort by AUTH NO (account_information_id__auth_stamp).
 */
export async function getPersonnelAuthorizationsPaged(
  page = 1,
  limit = 10
): Promise<PersonnelAuthorizationPagedResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("page", String(page));
  params.set("ordering", "account_information_id__auth_stamp");

  const path = `${BASE}/paged?${params.toString()}`;
  try {
    const res = await apiClient.get(path, {
      headers: { Accept: "application/json" },
    });
    const data = res.data ?? {};
    const inner =
      data?.data && typeof data.data === "object" ? data.data : data;
    const rawItems = Array.isArray(data)
      ? data
      : Array.isArray(inner)
        ? inner
        : inner?.items ??
          inner?.results ??
          inner?.data ??
          data?.items ??
          data?.results ??
          data?.data ??
          [];
    const list = Array.isArray(rawItems) ? rawItems : [];
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
    const pages =
      Number(inner?.pages ?? data?.pages ?? data?.total_pages) ||
      Math.max(1, Math.ceil(total / limit));
    return { items, total, page, pages };
  } catch (err) {
    console.error("personnel-authorization paged failed:", path, err);
    return { items: [], total: 0, page: 1, pages: 1 };
  }
}

/**
 * GET single. API: /api/v1/personnel-authorization/{id}/
 */
export async function getPersonnelAuthorization(
  id: number
): Promise<PersonnelAuthorizationRecord> {
  const res = await apiClient.get(`${BASE}/${id}/`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null && typeof raw === "object")
    return normalizeItem(raw as Record<string, unknown>);
  return normalizeItem({ id });
}

/**
 * POST create. API: /personnel-authorization/
 */
export async function createPersonnelAuthorization(
  payload: PersonnelAuthorizationCreate
): Promise<PersonnelAuthorizationRecord> {
  const scopeIdOrNull = (id: number | undefined): number | null =>
    id != null && Number.isFinite(id) && id > 0 ? id : null;

  const body: Record<string, string | number | null | undefined> = {
    ...(payload.account_information_id != null && Number.isFinite(payload.account_information_id)
      ? { account_information_id: payload.account_information_id }
      : {}),
    authorization_no: payload.authorization_no?.trim() || "",
    name: payload.name?.trim() || "",
    position: payload.position?.trim() || "",
    license_no_type: payload.license_no_type?.trim() || undefined,
    auth_initial_doi: payload.auth_initial_doi?.trim() || undefined,
    auth_issue_date: payload.auth_issue_date?.trim() || undefined,
    auth_expiry_date: payload.auth_expiry_date?.trim() || undefined,
    authorization_scope_cessna_id: scopeIdOrNull(payload.authorization_scope_cessna_id),
    authorization_scope_baron_id: scopeIdOrNull(payload.authorization_scope_baron_id),
    authorization_scope_others_id: scopeIdOrNull(payload.authorization_scope_others_id),
    caap_license_expiry: payload.caap_license_expiry?.trim() || undefined,
    human_factors_training_expiry: payload.human_factors_training_expiry?.trim() || undefined,
    type_training_expiry_cessna: payload.type_training_expiry_cessna?.trim() || undefined,
    type_training_expiry_baron: payload.type_training_expiry_baron?.trim() || undefined,
  };
  const res = await apiClient.post(PATH_CREATE, body, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const rawRes = res.data?.data ?? res.data;
  if (rawRes != null && typeof rawRes === "object")
    return normalizeItem(rawRes as Record<string, unknown>);
  return normalizeItem({ ...body });
}

/**
 * PUT update. API: /personnel-authorization/{id}/
 */
export async function updatePersonnelAuthorization(
  id: number,
  payload: PersonnelAuthorizationUpdate
): Promise<PersonnelAuthorizationRecord> {
  const scopeIdOrNull = (scopeId: number | undefined): number | null =>
    scopeId != null && Number.isFinite(scopeId) && scopeId > 0 ? scopeId : null;

  const body: Record<string, string | number | null | undefined> = {};
  if (payload.account_information_id != null && Number.isFinite(payload.account_information_id))
    body.account_information_id = payload.account_information_id;
  if (payload.authorization_no != null) body.authorization_no = payload.authorization_no.trim() || undefined;
  if (payload.name != null) body.name = payload.name.trim() || undefined;
  if (payload.position != null) body.position = payload.position.trim() || undefined;
  if (payload.license_no_type != null) body.license_no_type = payload.license_no_type.trim() || undefined;
  if (payload.auth_initial_doi != null) body.auth_initial_doi = payload.auth_initial_doi.trim() || undefined;
  if (payload.auth_issue_date != null) body.auth_issue_date = payload.auth_issue_date.trim() || undefined;
  if (payload.auth_expiry_date != null) body.auth_expiry_date = payload.auth_expiry_date.trim() || undefined;
  body.authorization_scope_cessna_id = scopeIdOrNull(payload.authorization_scope_cessna_id);
  body.authorization_scope_baron_id = scopeIdOrNull(payload.authorization_scope_baron_id);
  body.authorization_scope_others_id = scopeIdOrNull(payload.authorization_scope_others_id);
  if (payload.caap_license_expiry != null) body.caap_license_expiry = payload.caap_license_expiry.trim() || undefined;
  if (payload.human_factors_training_expiry != null) body.human_factors_training_expiry = payload.human_factors_training_expiry.trim() || undefined;
  if (payload.type_training_expiry_cessna != null) body.type_training_expiry_cessna = payload.type_training_expiry_cessna.trim() || undefined;
  if (payload.type_training_expiry_baron != null) body.type_training_expiry_baron = payload.type_training_expiry_baron.trim() || undefined;

  const res = await apiClient.put(pathUpdate(id), body, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const rawRes = res.data?.data ?? res.data;
  if (rawRes != null && typeof rawRes === "object")
    return normalizeItem(rawRes as Record<string, unknown>);
  return normalizeItem({ id, ...body });
}

/**
 * DELETE. API: /api/v1/personnel-authorization/{id}/
 */
export async function deletePersonnelAuthorization(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}/`);
}

export { getApiErrorMessage as getPersonnelApiErrorMessage };
