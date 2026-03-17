import apiClient from "./index";

const BASE = "account-information";

export interface Account {
  id: number;
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
  fullName: string;
  email: string;
  licenseNo: string;
  designation: string;
  roleId: number;
  status: boolean;
  createdAt: string;
  lastLogin: string;
}

export interface AccountResponse {
  id: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  license_no: string;
  designation: string;
}

export interface AccountListResponse {
  id: number;
  fullname: string;
  license_no: string;
  designation?: string;
}

function normalizeAccount(raw: Record<string, unknown>): Account {
  const getStr = (k: string, fallback = "") =>
    String(raw[k] ?? raw[k?.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? fallback);
  const firstName = getStr("first_name");
  const middleName = getStr("middle_name");
  const lastName = getStr("last_name");
  const composed = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim();
  const id = Number(raw.id ?? 0);
  return {
    id: isNaN(id) ? 0 : id,
    firstName,
    lastName,
    middleName,
    username: getStr("username"),
    fullName: getStr("fullname") || getStr("full_name") || composed || "",
    email: getStr("email"),
    licenseNo: getStr("license_no") || getStr("licenseNo", ""),
    designation: getStr("designation", ""),
    roleId: Number(raw.role_id ?? raw.roleId ?? 0),
    status: Boolean(raw.status ?? true),
    createdAt: getStr("created_at"),
    lastLogin: getStr("last_login"),
  };
}

/** List (dropdowns): GET /api/v1/account-information/account-informations-list */
export const getAccountsByDesignation = async (
  designations: string[],
  search: string = ""
): Promise<Account[]> => {
  const params = new URLSearchParams();
  designations.forEach((d) => params.append("designation", d));
  if (search.trim()) params.append("search", search.trim());
  const response = await apiClient.get(
    `${BASE}/account-informations-list?${params.toString()}`
  );
  const data = Array.isArray(response.data) ? response.data : response.data?.results ?? response.data?.items ?? [];
  return (Array.isArray(data) ? data : [])
    .filter((item: Record<string, unknown>) => item && (item.id ?? item.account_id))
    .map((item: Record<string, unknown>) => normalizeAccount(item));
};

/** Get all accounts (list for dropdowns) */
export const getAllAccounts = async (): Promise<Account[]> => {
  const response = await apiClient.get(`${BASE}/account-informations-list`);
  const data = Array.isArray(response.data) ? response.data : response.data?.results ?? response.data?.items ?? [];
  return (Array.isArray(data) ? data : [])
    .filter((item: Record<string, unknown>) => item && (item.id ?? item.account_id))
    .map((item: Record<string, unknown>) => normalizeAccount(item));
};

export interface PaginatedAccountsResponse {
  items: Account[];
  total: number;
  page: number;
  pages: number;
}

/** Paged: GET /api/v1/account-information/paged */
export const getAccountsPaged = async (
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedAccountsResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search.trim()) params.set("search", search.trim());
  const response = await apiClient.get(`${BASE}/paged?${params.toString()}`);
  const raw = response.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list.map((item: Record<string, unknown>) => normalizeAccount(item));
  const total = raw.total ?? raw.count ?? items.length;
  const pages = raw.pages ?? Math.max(1, Math.ceil(Number(total) / limit));
  return { items, total: Number(total), page: raw.page ?? page, pages: Number(pages) };
};

/** Get: GET /api/v1/account-information/{account_id} */
export const getAccount = async (accountId: number): Promise<Account> => {
  const response = await apiClient.get(`${BASE}/${accountId}`);
  const raw = response.data ?? {};
  return normalizeAccount({ ...raw, id: accountId });
};

/** Raw account-information record for fields like auth_initial_doi. GET /api/v1/account-information/{account_id} */
export const getAccountInformationById = async (
  accountId: number
): Promise<{ auth_initial_doi?: string }> => {
  const response = await apiClient.get(`${BASE}/${accountId}`);
  const raw = (response.data ?? {}) as Record<string, unknown>;
  const doi =
    raw.auth_initial_doi ?? raw.authInitialDoi ?? raw.authInitialDOI;
  return {
    auth_initial_doi:
      typeof doi === "string" ? doi.trim() || undefined : undefined,
  };
};

/** Create: POST /api/v1/account-information/ */
export const createAccount = async (payload: {
  firstName: string;
  lastName: string;
  middleName?: string;
  username: string;
  email: string;
  designation: string;
  licenseNo: string;
  roleId?: number;
  status?: boolean;
  password?: string;
  auth_initial_doi?: string;
}): Promise<Account> => {
  const body: Record<string, string | number | boolean | undefined> = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    middle_name: payload.middleName ?? "",
    username: payload.username,
    email: payload.email,
    designation: payload.designation ?? "",
    license_no: payload.licenseNo,
    role_id: payload.roleId ?? 0,
    status: payload.status ?? true,
    password: payload.password,
  };
  if (payload.auth_initial_doi != null && payload.auth_initial_doi !== "")
    body.auth_initial_doi = payload.auth_initial_doi.trim();
  const response = await apiClient.post(`${BASE}/`, body);
  const raw = response.data ?? {};
  return normalizeAccount(raw);
};

/** Update: PUT /api/v1/account-information/{account_id} */
export const updateAccount = async (
  accountId: number,
  payload: Partial<{
    firstName: string;
    lastName: string;
    middleName: string;
    username: string;
    email: string;
    licenseNo: string;
    designation: string;
    roleId: number;
    status: boolean;
    auth_initial_doi: string;
  }>
): Promise<Account> => {
  const body: Record<string, string | number | boolean> = {};
  if (payload.firstName != null) body.first_name = payload.firstName;
  if (payload.lastName != null) body.last_name = payload.lastName;
  if (payload.middleName != null) body.middle_name = payload.middleName;
  if (payload.username != null) body.username = payload.username;
  if (payload.email != null) body.email = payload.email;
  if (payload.licenseNo != null) body.license_no = payload.licenseNo;
  if (payload.designation != null) body.designation = payload.designation;
  if (payload.roleId != null) body.role_id = payload.roleId;
  if (payload.status != null) body.status = payload.status;
  if (payload.auth_initial_doi != null) body.auth_initial_doi = payload.auth_initial_doi.trim();
  const response = await apiClient.put(`${BASE}/${accountId}`, body);
  const raw = response.data ?? {};
  return normalizeAccount({ ...raw, id: accountId });
};

/** Delete: DELETE /api/v1/account-information/{account_id} */
export const deleteAccount = async (accountId: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${accountId}`);
};

/**
 * Account information option for Authorization Number searchable dropdown.
 * API: GET /api/v1/account-information/by-auth-stamp?search=<query>
 * Return: id (account_information_id), auth_stamp, full_name, designation, license_no, auth_initial_doi.
 */
export interface AuthStampOption {
  account_information_id: number;
  auth_stamp: string;
  full_name: string;
  designation: string;
  license_no: string;
  auth_initial_doi?: string;
}

const AUTH_STAMP_REQUEST_LIMIT = 50;
const AUTH_STAMP_RETURN_LIMIT = 10;

/** Case-insensitive match: item matches search if any of auth_stamp, full_name, designation, license_no contain search. */
function authStampMatches(o: AuthStampOption, searchLower: string): boolean {
  if (!searchLower) return true;
  return (
    o.auth_stamp.toLowerCase().includes(searchLower) ||
    o.full_name.toLowerCase().includes(searchLower) ||
    o.designation.toLowerCase().includes(searchLower) ||
    o.license_no.toLowerCase().includes(searchLower)
  );
}

/**
 * Get account information list by auth_stamp search (case-insensitive).
 * GET /api/v1/account-information/by-auth-stamp?search=<query>&limit=<n>
 * Requests at least 10 data; returns up to 10 options. Search is applied case-insensitively on auth_stamp, full_name, designation, license_no.
 */
export const getAuthStampListFromAccountInformation = async (
  search: string,
  limit = AUTH_STAMP_RETURN_LIMIT
): Promise<AuthStampOption[]> => {
  const searchTrimmed = typeof search === "string" ? search.trim() : "";
  const params = new URLSearchParams();
  params.set("search", searchTrimmed);
  params.set("limit", String(Math.max(AUTH_STAMP_REQUEST_LIMIT, limit)));
  const url = `${BASE}/by-auth-stamp?${params.toString()}`;
  try {
    const response = await apiClient.get(url, { headers: { Accept: "application/json" } });
    const raw = response.data;
    const data = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as any)?.results)
        ? (raw as any).results
        : Array.isArray((raw as any)?.items)
          ? (raw as any).items
          : Array.isArray((raw as any)?.data)
            ? (raw as any).data
            : (raw && typeof raw === "object" && Array.isArray((raw as any).list) ? (raw as any).list : []);
    const list = (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => {
      const id = item.id ?? item.account_information_id ?? item.accountInformationId;
      const account_information_id = typeof id === "number" && Number.isFinite(id) ? id : Number(id);
      const rawDoi = item.auth_initial_doi ?? item.authInitialDoi ?? item.authInitialDOI ?? "";
      const auth_initial_doi = typeof rawDoi === "string" ? rawDoi.trim() : "";
      return {
        account_information_id: Number.isFinite(account_information_id) ? account_information_id : 0,
        auth_stamp: String(item.auth_stamp ?? item.authStamp ?? "").trim(),
        full_name: String(item.full_name ?? item.fullName ?? item.name ?? "").trim(),
        designation: String(item.designation ?? item.position ?? "").trim(),
        license_no: String(item.license_no ?? item.licenseNo ?? item.license ?? "").trim(),
        auth_initial_doi: auth_initial_doi || undefined,
      };
    });
    const withStamp = list.filter((o) => o.auth_stamp.length > 0);
    const searchLower = searchTrimmed.toLowerCase();
    const filtered = searchLower ? withStamp.filter((o) => authStampMatches(o, searchLower)) : withStamp;
    return filtered.slice(0, Math.max(AUTH_STAMP_RETURN_LIMIT, limit));
  } catch (err) {
    console.error("by-auth-stamp search failed:", url, err);
    return [];
  }
};

/** @deprecated Use getAuthStampListFromAccountInformation. Same: list of auth_stamp from account information. */
export const getAccountByAuthStamp = getAuthStampListFromAccountInformation;
