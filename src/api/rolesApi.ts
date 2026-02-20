import apiClient from "./index";

export interface Role {
  id: number;
  name: string;
  description: string;
  userCount: number;
}

export interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  approve: boolean;
}

function normalizeRole(raw: Record<string, unknown>): Role {
  const getStr = (k: string, fallback = "") =>
    String(raw[k] ?? raw[k?.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? fallback);
  const id = Number(raw.id ?? 0);
  return {
    id: isNaN(id) ? 0 : id,
    name: getStr("name"),
    description: getStr("description"),
    userCount: Number(raw.user_count ?? raw.userCount ?? 0),
  };
}

/** List roles (dropdowns): GET /api/v1/roles/roles-list */
export const getRoles = async (): Promise<Role[]> => {
  const response = await apiClient.get("roles/roles-list");
  const raw = response.data ?? {};
  const data = Array.isArray(raw) ? raw : raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  return list.map((item: Record<string, unknown>) => normalizeRole(item));
};

/** Get role: GET /api/v1/roles/{role_id} */
export const getRole = async (roleId: number): Promise<Role> => {
  const response = await apiClient.get(`roles/${roleId}`);
  const raw = response.data ?? {};
  return normalizeRole({ ...raw, id: roleId });
};

export interface PaginatedRolesResponse {
  items: Role[];
  total: number;
  page: number;
  pages: number;
}

/** Paged list: GET /api/v1/roles/paged?page=&limit= */
export const getRolesPaged = async (
  page = 1,
  limit = 20,
  search = ""
): Promise<PaginatedRolesResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search.trim()) params.set("search", search.trim());
  const response = await apiClient.get(`roles/paged?${params.toString()}`);
  const raw = response.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list.map((item: Record<string, unknown>) => normalizeRole(item));
  const total = raw.total ?? raw.count ?? items.length;
  const pages = raw.pages ?? Math.max(1, Math.ceil(Number(total) / limit));
  return { items, total: Number(total), page: raw.page ?? page, pages: Number(pages) };
};

/** Create role: POST /api/v1/roles/ */
export const createRole = async (
  payload: { name: string; description: string },
  permissions?: Permission[]
): Promise<Role> => {
  const body: Record<string, unknown> = {
    name: payload.name,
    description: payload.description,
  };
  if (Array.isArray(permissions) && permissions.length) {
    body.permissions = permissions;
  }
  const response = await apiClient.post("roles/", body);
  const raw = response.data ?? {};
  return normalizeRole(raw);
};

/** Update role: PUT /api/v1/roles/:id/ or PATCH */
export const updateRole = async (
  id: number,
  payload: { name?: string; description?: string },
  permissions?: Permission[]
): Promise<Role> => {
  const body: Record<string, unknown> = { ...payload };
  if (Array.isArray(permissions) && permissions.length) {
    body.permissions = permissions;
  }
  const response = await apiClient.put(`roles/${id}`, body);
  const raw = response.data ?? {};
  return normalizeRole({ ...raw, id });
};

/** Delete role: DELETE /api/v1/roles/{role_id} */
export const deleteRole = async (roleId: number): Promise<void> => {
  await apiClient.delete(`roles/${roleId}`);
};
