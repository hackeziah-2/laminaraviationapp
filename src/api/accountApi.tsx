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
}): Promise<Account> => {
  const body = {
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
  const response = await apiClient.put(`${BASE}/${accountId}`, body);
  const raw = response.data ?? {};
  return normalizeAccount({ ...raw, id: accountId });
};

/** Delete: DELETE /api/v1/account-information/{account_id} */
export const deleteAccount = async (accountId: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${accountId}`);
};
