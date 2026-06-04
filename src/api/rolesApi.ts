import type { AxiosRequestConfig } from "axios";
import apiClient from "./index";
import { getAccountsPaged } from "./accountApi";

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
  create: boolean;
  update: boolean;
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

const USER_COUNT_FIELD_KEYS = [
  "user_count",
  "userCount",
  "users_count",
  "usersCount",
  "assigned_user_count",
  "assigned_users_count",
] as const;

/** Parse user count when the API includes it on a role payload. */
export function extractRoleUserCount(
  raw: Record<string, unknown> | null | undefined
): number | undefined {
  if (!raw) return undefined;
  for (const key of USER_COUNT_FIELD_KEYS) {
    if (!(key in raw)) continue;
    const val = raw[key];
    if (val === undefined || val === null || val === "") continue;
    const n = Number(val);
    if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
  }
  if (Array.isArray(raw.users)) return raw.users.length;
  if (Array.isArray(raw.accounts)) return raw.accounts.length;
  return undefined;
}

function parseRoleUserCountResponse(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.trunc(raw));
  }
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const inner = (obj.data ?? obj) as Record<string, unknown>;
  return (
    extractRoleUserCount(inner) ??
    extractRoleUserCount(obj) ??
    (typeof inner.count === "number" && Number.isFinite(inner.count)
      ? Math.max(0, Math.trunc(inner.count))
      : undefined) ??
    (typeof obj.count === "number" && Number.isFinite(obj.count)
      ? Math.max(0, Math.trunc(obj.count))
      : undefined) ??
    (typeof inner.total === "number" && Number.isFinite(inner.total)
      ? Math.max(0, Math.trunc(inner.total))
      : undefined) ??
    (typeof obj.total === "number" && Number.isFinite(obj.total)
      ? Math.max(0, Math.trunc(obj.total))
      : undefined)
  );
}

function normalizeRole(raw: Record<string, unknown>): Role {
  const getStr = (k: string, fallback = "") =>
    String(
      raw[k] ?? raw[k?.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? fallback
    );
  const getFirstStr = (keys: string[], fallback = "") => {
    for (const key of keys) {
      const val = raw[key] ?? raw[key.replace(/([A-Z])/g, "_$1").toLowerCase()];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val);
      }
    }
    return fallback;
  };
  const id = Number(raw.id ?? 0);
  return {
    id: isNaN(id) ? 0 : id,
    name: getStr("name"),
    description: getFirstStr([
      "description",
      "role_description",
      "roleDescription",
      "desc",
    ]),
    userCount: extractRoleUserCount(raw) ?? 0,
  };
}

/**
 * Resolve how many users are assigned to a role (for Edit Role).
 * Tries GET /roles/:id, optional count endpoints, then account list total by role name.
 */
export async function fetchRoleUserCount(
  roleId: number,
  roleName?: string
): Promise<number> {
  if (!roleId) return 0;

  const silent = {
    skipGlobalErrorLog: true,
  } as AxiosRequestConfig & { skipGlobalErrorLog?: boolean };

  try {
    const response = await apiClient.get(`roles/${roleId}/`, silent);
    const raw = response.data ?? {};
    const data = ((raw as Record<string, unknown>).data ?? raw) as Record<
      string,
      unknown
    >;
    const fromRole = parseRoleUserCountResponse(data);
    if (fromRole !== undefined) return fromRole;
  } catch {
    /* try fallbacks */
  }

  for (const path of [
    `roles/${roleId}/user-count/`,
    `roles/${roleId}/users/count/`,
  ]) {
    try {
      const response = await apiClient.get(path, silent);
      const fromCount = parseRoleUserCountResponse(response.data);
      if (fromCount !== undefined) return fromCount;
    } catch {
      /* next path */
    }
  }

  const name = roleName?.trim();
  if (name) {
    try {
      const { total } = await getAccountsPaged(1, 1, "", name);
      return Math.max(0, total);
    } catch {
      /* ignore */
    }
  }

  return 0;
}

/** List roles: try GET roles/roles-list and roles/paged first (many backends use POST-only on roles/). */
export const getRoles = async (): Promise<Role[]> => {
  const toList = (raw: unknown) => {
    const data = Array.isArray(raw) ? raw : (raw as Record<string, unknown>)?.results ?? (raw as Record<string, unknown>)?.items ?? (raw as Record<string, unknown>)?.data ?? [];
    return (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => normalizeRole(item));
  };
  const silent = {
    skipGlobalErrorLog: true,
  } as AxiosRequestConfig & { skipGlobalErrorLog?: boolean };
  const paths = [
    "roles/roles-list",
    "roles/paged/?page=1&limit=500",
    "roles/",
  ] as const;
  let lastError: unknown;
  for (const path of paths) {
    try {
      const response = await apiClient.get(path, silent);
      return toList(response.data ?? {});
    } catch (e) {
      lastError = e;
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status !== 404 && status !== 405) throw e;
    }
  }
  throw lastError ?? new Error("Failed to load roles");
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
  const del = Boolean(
    raw.delete ?? raw.can_delete ?? raw.canDelete ?? false
  );
  const hasCreate = raw.create !== undefined && raw.create !== null;
  const hasUpdate = raw.update !== undefined && raw.update !== null;
  let create: boolean;
  let update: boolean;
  if (hasCreate || hasUpdate) {
    create = Boolean(raw.create);
    update = Boolean(raw.update);
  } else {
    const write = Boolean(raw.write);
    const approve = Boolean(raw.approve);
    create = write;
    update = write || approve;
  }
  return { module, read, create, update, delete: del };
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

/** Request body fields for role name/description (backend may use either key). */
function buildRoleWriteBody(
  payload: { name: string; description: string },
  permissions?: Permission[]
): Record<string, unknown> {
  const name = payload.name.trim();
  const description = payload.description.trim();
  const body: Record<string, unknown> = {
    name,
    description,
    role_description: description,
  };
  if (Array.isArray(permissions) && permissions.length) {
    body.permissions = permissions;
  }
  return body;
}

/** Create role: POST /api/v1/roles/ — returns created role with permissions (RoleReadWithPermissions). */
export const createRole = async (
  payload: CreateRolePayload,
  permissions?: Permission[]
): Promise<RoleWithPermissions> => {
  const perms = Array.isArray(permissions) ? permissions : payload.permissions ?? [];
  const body = buildRoleWriteBody(payload, perms.length ? perms : undefined);
  const response = await apiClient.post("roles/", body);
  const raw = response.data ?? {};
  const data = (raw as Record<string, unknown>).data ?? raw;
  const obj = data as Record<string, unknown>;
  return normalizeRoleWithPermissions({ ...obj, id: Number(obj.id ?? 0) || 0 });
};

/** Update role: PUT /api/v1/roles/:id/ — optionally include permissions in body. */
export const updateRole = async (
  id: number,
  payload: { name: string; description: string },
  permissions?: Permission[]
): Promise<RoleWithPermissions> => {
  const body = buildRoleWriteBody(payload, permissions);
  const response = await apiClient.put(`roles/${id}/`, body);
  const raw = response.data ?? {};
  const data = (raw as Record<string, unknown>).data ?? raw;
  return normalizeRoleWithPermissions({ ...(data as Record<string, unknown>), id });
};

/** Delete role: DELETE /api/v1/roles/{role_id}/ */
export const deleteRole = async (roleId: number): Promise<void> => {
  await apiClient.delete(`roles/${roleId}/`);
};
