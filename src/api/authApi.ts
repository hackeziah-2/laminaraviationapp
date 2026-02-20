import apiClient from "./index";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
  createdDate: string;
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
}

export interface AuthUserUpdate {
  name?: string;
  email?: string;
  role?: string;
  status?: "active" | "inactive";
}

function normalizeUser(raw: Record<string, unknown>): AuthUser {
  const getStr = (k: string, fallback = "") =>
    String(raw[k] ?? raw[k?.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? fallback);
  const id = Number(raw.id ?? raw.user_id ?? 0);
  const composedName = `${getStr("first_name")} ${getStr("middle_name")} ${getStr("last_name")}`
    .replace(/\s+/g, " ")
    .trim();
  return {
    id: isNaN(id) ? 0 : id,
    name: getStr("name") || getStr("full_name") || composedName || getStr("username", ""),
    email: getStr("email"),
    role: getStr("role", "Viewer"),
    status: (getStr("status", "active").toLowerCase() === "inactive" ? "inactive" : "active") as "active" | "inactive",
    lastLogin: getStr("last_login") || getStr("lastLogin", "Never"),
    createdDate: getStr("created_date") || getStr("createdDate") || getStr("created_at", ""),
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

/** Current user: GET /api/v1/auth/me (or similar) */
export const getMe = async (): Promise<AuthUser> => {
  const response = await apiClient.get("auth/me");
  const raw = response.data ?? {};
  return normalizeUser(raw);
};

/** Register: POST /api/v1/auth/register */
export const registerUser = async (payload: AuthUserCreate): Promise<AuthUser> => {
  const body = {
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
  const response = await apiClient.post("auth/register", body);
  const raw = response.data?.user ?? response.data ?? {};
  return normalizeUser(raw);
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
