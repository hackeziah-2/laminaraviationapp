import apiClient from "./index";

export interface Role {
  id: number;
  name: string;
  description: string;
  userCount: number;
}

/** Permission item for a single module. `module` must be the display name (e.g. "Dashboard", "General Information") as expected by the backend. */
export interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  approve: boolean;
  /** Remove records in this module (API may send `delete` or `can_delete`). */
  delete: boolean;
}

/** Role as returned by GET /roles/:id and POST /roles/ (includes permissions). */
export type RoleWithPermissions = Role & { permissions: Permission[] };

/** Request body for POST /api/v1/roles/ */
export interface CreateRolePayload {
  name: string;
  description: string;
  permissions?: Permission[];
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

/** List roles: GET /api/v1/roles/ (fallback: GET roles/roles-list if roles/ returns 404) */
export const getRoles = async (): Promise<Role[]> => {
  const toList = (raw: unknown) => {
    const data = Array.isArray(raw) ? raw : (raw as Record<string, unknown>)?.results ?? (raw as Record<string, unknown>)?.items ?? (raw as Record<string, unknown>)?.data ?? [];
    return (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => normalizeRole(item));
  };
  try {
    const response = await apiClient.get("roles/");
    return toList(response.data ?? {});
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 405) {
      const response = await apiClient.get("roles/roles-list");
      return toList(response.data ?? {});
    }
    throw e;
  }
};

/** Get role with permissions: GET /api/v1/roles/{role_id}/ */
export const getRole = async (roleId: number): Promise<RoleWithPermissions> => {
  const response = await apiClient.get(`roles/${roleId}/`);
  const raw = response.data ?? {};
  const data = (raw as Record<string, unknown>).data ?? raw;
  return normalizeRoleWithPermissions({ ...(data as Record<string, unknown>), id: roleId });
};

function normalizePermission(raw: Record<string, unknown>): Permission {
  const module = String(raw.module ?? "");
  const read = Boolean(raw.read);
  const write = Boolean(raw.write);
  const approve = Boolean(raw.approve);
  const del = Boolean(
    raw.delete ?? raw.can_delete ?? raw.canDelete ?? false
  );
  return { module, read, write, approve, delete: del };
}

function normalizeRoleWithPermissions(raw: Record<string, unknown>): RoleWithPermissions {
  const role = normalizeRole(raw);
  const list = raw.permissions ?? raw.permission ?? [];
  const arr = Array.isArray(list) ? list : [];
  const permissions = arr.map((item: Record<string, unknown>) => normalizePermission(item));
  return { ...role, permissions };
}

/** Get permissions for a role: GET /api/v1/roles/{role_id} (uses permissions from response) or GET /api/v1/roles/{role_id}/permissions */
export const getRolePermissions = async (roleId: number): Promise<Permission[]> => {
  try {
    const response = await apiClient.get(`roles/${roleId}/`);
    const raw = response.data ?? {};
    const list = raw.permissions ?? raw.permission ?? [];
    const arr = Array.isArray(list) ? list : [];
    return arr.map((item: Record<string, unknown>) => normalizePermission(item));
  } catch {
    try {
      const response = await apiClient.get(`roles/${roleId}/permissions/`);
      const raw = response.data ?? {};
      const list = Array.isArray(raw) ? raw : raw.results ?? raw.items ?? raw.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      return arr.map((item: Record<string, unknown>) => normalizePermission(item));
    } catch {
      return [];
    }
  }
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
  const response = await apiClient.get(`roles/paged/?${params.toString()}`);
  const raw = response.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list.map((item: Record<string, unknown>) => normalizeRole(item));
  const total = raw.total ?? raw.count ?? items.length;
  const pages = raw.pages ?? Math.max(1, Math.ceil(Number(total) / limit));
  return { items, total: Number(total), page: raw.page ?? page, pages: Number(pages) };
};

/** Create role: POST /api/v1/roles/ — returns created role with permissions (RoleReadWithPermissions). */
export const createRole = async (
  payload: CreateRolePayload,
  permissions?: Permission[]
): Promise<RoleWithPermissions> => {
  const perms = Array.isArray(permissions) ? permissions : payload.permissions ?? [];
  const body: Record<string, unknown> = {
    name: payload.name,
    description: payload.description,
  };
  if (perms.length) {
    body.permissions = perms;
  }
  const response = await apiClient.post("roles/", body);
  const raw = response.data ?? {};
  const data = (raw as Record<string, unknown>).data ?? raw;
  const obj = data as Record<string, unknown>;
  return normalizeRoleWithPermissions({ ...obj, id: Number(obj.id ?? 0) || 0 });
};

/** Update role: PUT /api/v1/roles/:id/ — optionally include permissions in body. */
export const updateRole = async (
  id: number,
  payload: { name?: string; description?: string },
  permissions?: Permission[]
): Promise<RoleWithPermissions> => {
  const body: Record<string, unknown> = { ...payload };
  if (Array.isArray(permissions) && permissions.length) {
    body.permissions = permissions;
  }
  const response = await apiClient.put(`roles/${id}/`, body);
  const raw = response.data ?? {};
  const data = (raw as Record<string, unknown>).data ?? raw;
  return normalizeRoleWithPermissions({ ...(data as Record<string, unknown>), id });
};

/** Delete role: DELETE /api/v1/roles/{role_id}/ */
export const deleteRole = async (roleId: number): Promise<void> => {
  await apiClient.delete(`roles/${roleId}/`);
};
