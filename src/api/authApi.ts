import apiClient from "./index";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  /** Role ID for loading permissions; may come from backend or resolved by role name */
  roleId?: number;
  status: "active" | "inactive";
  lastLogin: string;
  createdDate: string;
  /** When present, use for created_by (account_information_id) on ATL create */
  accountInformationId?: number;
}

export interface AuthUserCreate {
  first_name: string;
  last_name: string;
  middle_name: string;
  username: string;
  email: string;
  designation: string;
  license_no: string;
  role_id: number;
  status: boolean;
  password: string;
  /** Optional; sent when present (bulk JSON / extended register) */
  auth_initial_doi?: string;
  auth_stamp?: string;
}

export interface AuthUserUpdate {
  name?: string;
  email?: string;
  role?: string;
  status?: "active" | "inactive";
}

/** Role label from /me — backends vary: `role`, `role_name`, nested `role.name`, etc. */
function pickRoleString(raw: Record<string, unknown>): string {
  const asTrimmed = (v: unknown): string | undefined => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t || undefined;
  };
  const nestedName =
    raw.role && typeof raw.role === "object" && raw.role !== null
      ? asTrimmed((raw.role as Record<string, unknown>).name)
      : undefined;
  return (
    asTrimmed(raw.role) ??
    asTrimmed(raw.role_name) ??
    asTrimmed(raw.roleName) ??
    nestedName ??
    "Viewer"
  );
}

function normalizeUser(raw: Record<string, unknown>): AuthUser {
  const getStr = (k: string, fallback = "") =>
    String(raw[k] ?? raw[k?.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? fallback);
  const id = Number(raw.id ?? raw.user_id ?? 0);
  const accountInfoId = Number(raw.account_information_id ?? raw.accountInformationId ?? 0);
  const roleId = Number(raw.role_id ?? raw.roleId ?? 0);
  const composedName = `${getStr("first_name")} ${getStr("middle_name")} ${getStr("last_name")}`
    .replace(/\s+/g, " ")
    .trim();
  return {
    id: isNaN(id) ? 0 : id,
    name: getStr("name") || getStr("full_name") || composedName || getStr("username", ""),
    email: getStr("email"),
    role: pickRoleString(raw),
    roleId: isNaN(roleId) ? undefined : roleId,
    status: (getStr("status", "active").toLowerCase() === "inactive" ? "inactive" : "active") as "active" | "inactive",
    lastLogin: getStr("last_login") || getStr("lastLogin", "Never"),
    createdDate: getStr("created_date") || getStr("createdDate") || getStr("created_at", ""),
    accountInformationId: isNaN(accountInfoId) ? undefined : accountInfoId,
  };
}

/** List users from /api/v1/auth/users/ (non-paged) */
export const getUsers = async (search = ""): Promise<AuthUser[]> => {
  const params = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const endpoint = params ? `auth/users/${params}` : "auth/users/";
  const response = await apiClient.get(endpoint);
  const raw = response.data ?? {};
  const data = Array.isArray(raw) ? raw : raw.results ?? raw.items ?? raw.data ?? raw.users ?? [];
  const list = Array.isArray(data) ? data : [];
  return list.map((item: Record<string, unknown>) => normalizeUser(item));
};

export interface PaginatedUsersResponse {
  items: AuthUser[];
  total: number;
  page: number;
  pages: number;
}

/** Paged list: GET /api/v1/auth/users/paged?page=&limit=&search= */
export const getUsersPaged = async (
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedUsersResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search.trim()) params.set("search", search.trim());
  const response = await apiClient.get(`auth/users/paged?${params.toString()}`);
  const raw = response.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? raw.users ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list.map((item: Record<string, unknown>) => normalizeUser(item));
  const total = raw.total ?? raw.count ?? items.length;
  const pages = raw.pages ?? Math.max(1, Math.ceil(Number(total) / limit));
  return { items, total: Number(total), page: raw.page ?? page, pages: Number(pages) };
};

/** List users with paged API or fallback to non-paged (client-side pagination) */
export const getUsersList = async (
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedUsersResponse> => {
  try {
    return await getUsersPaged(page, limit, search);
  } catch {
    const all = await getUsers(search);
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    return { items, total, page, pages };
  }
};

/** Login: POST /api/v1/auth/login */
export const login = async (username: string, password: string): Promise<unknown> => {
  const creds = { username: username.trim(), password };
  try {
    // Primary path: JSON body for FastAPI/Pydantic schema
    const response = await apiClient.post("auth/login/", creds, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    // Retry only when body parsing/validation failed.
    if (status !== 400 && status !== 415 && status !== 422) {
      throw error;
    }

    // Fallback path: some auth backends accept form-encoded payload
    const form = new URLSearchParams();
    form.set("username", creds.username);
    form.set("password", creds.password);
    const fallback = await apiClient.post("auth/login/", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return fallback.data;
  }
};

/** Token: POST /api/v1/auth/token */
export const token = async (username?: string, password?: string): Promise<unknown> => {
  const response = await apiClient.post("auth/token", { username, password });
  return response.data;
};

/** Default route after sign-in: mechanics land on fleet profile, others on dashboard. */
export function getPostLoginPath(role: string | undefined | null): string {
  return role?.trim() === "Mechanic" ? "/profile" : "/dashboard";
}

/**
 * Current user: GET /api/v1/auth/me
 * Request URL: `{VITE_API_URL}auth/me` (default `http://localhost:8000/api/v1/` + `auth/me`).
 */
export const getMe = async (): Promise<AuthUser> => {
  const response = await apiClient.get("auth/me", {
    headers: { Accept: "application/json" },
  });
  const data = response.data as Record<string, unknown> | undefined;
  const raw =
    (data?.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : data) ?? {};
  return normalizeUser(raw);
};

/** Register: POST /api/v1/auth/register/ (trailing slash matches auth/login/ and Django-style routes) */
export const registerUser = async (payload: AuthUserCreate): Promise<AuthUser> => {
  const body: Record<string, string | number | boolean | undefined> = {
    first_name: payload.first_name,
    last_name: payload.last_name,
    middle_name: payload.middle_name,
    username: payload.username,
    email: payload.email,
    designation: payload.designation,
    license_no: payload.license_no,
    role_id: payload.role_id,
    status: payload.status,
    password: payload.password,
  };
  const doi = payload.auth_initial_doi?.trim();
  if (doi) body.auth_initial_doi = doi;
  const stamp = payload.auth_stamp?.trim();
  if (stamp) body.auth_stamp = stamp;
  const response = await apiClient.post("auth/register/", body, {
    headers: { "Content-Type": "application/json" },
  });
  const raw = response.data?.user ?? response.data ?? {};
  return normalizeUser(
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}
  );
};

/** Update user: PUT /api/v1/auth/users/:id/ or PATCH */
export const updateUser = async (id: number, payload: AuthUserUpdate): Promise<AuthUser> => {
  const response = await apiClient.put(`auth/users/${id}/`, payload);
  const raw = response.data ?? {};
  return normalizeUser({ ...raw, id });
};

/** Delete user: DELETE /api/v1/auth/users/:id/ */
export const deleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`auth/users/${id}/`);
};

/** Toggle user status: PATCH /api/v1/auth/users/:id/status/ */
export const setUserStatus = async (
  id: number,
  status: "active" | "inactive"
): Promise<AuthUser> => {
  const response = await apiClient.patch(`auth/users/${id}/status/`, { status });
  const raw = response.data ?? {};
  return normalizeUser({ ...raw, id });
};

/** Reset password: POST /api/v1/auth/users/:id/reset-password/ */
export const resetUserPassword = async (
  id: number,
  newPassword: string,
  forceChangeOnNextLogin: boolean
): Promise<void> => {
  await apiClient.post(`auth/users/${id}/reset-password/`, {
    new_password: newPassword,
    force_change_on_next_login: forceChangeOnNextLogin,
  });
};
