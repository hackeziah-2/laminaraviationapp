import apiClient from "./index";
import {
  DEFAULT_API_PAGE_SIZE,
  MAX_API_PAGE_SIZE,
} from "../constants/pagination";
import { toCamel } from "../utility/utils";
import { appendPagedQueryParams } from "../utils/pagedQuery";

export type AuthorizationScopeType = "cessna" | "baron" | "piper" | "others";

/** Scope option for dropdown: value is id, label is for display. */
export interface AuthorizationScopeOption {
  id: number;
  label: string;
}

export interface AuthorizationScope {
  id: number;
  name: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PaginatedAuthorizationScopesResponse {
  items: AuthorizationScope[];
  total: number;
  page: number;
  pages: number;
}

function scopeBasePath(type: AuthorizationScopeType): string {
  return `authorization-scope-${type}`;
}

function parseAuthorizationScope(
  raw: Record<string, unknown> | null | undefined
): AuthorizationScope {
  if (raw == null || typeof raw !== "object") {
    return { id: 0, name: "" };
  }
  const c = toCamel(raw as Record<string, unknown>) as Record<string, unknown>;
  const id = Number(c.id ?? raw.id ?? 0);
  const name = String(c.name ?? raw.name ?? "").trim();
  const createdAt =
    (c.createdAt ?? raw.created_at) != null
      ? String(c.createdAt ?? raw.created_at)
      : null;
  const updatedAt =
    (c.updatedAt ?? raw.updated_at) != null
      ? String(c.updatedAt ?? raw.updated_at)
      : null;
  return {
    id: Number.isFinite(id) ? id : 0,
    name,
    createdAt,
    updatedAt,
  };
}

function parseScopeOption(
  item: unknown,
  index: number
): AuthorizationScopeOption | null {
  if (item != null && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const id = Number(o.id ?? o.pk ?? index + 1);
    const label = String(o.name ?? o.value ?? o.label ?? o.scope ?? "").trim();
    if (label.length > 0 && Number.isFinite(id)) return { id, label };
  }
  if (typeof item === "string") {
    const label = item.trim();
    if (label.length > 0) return { id: index + 1, label };
  }
  return null;
}

function optionsFromPayload(raw: unknown): AuthorizationScopeOption[] {
  const data = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { results?: unknown[] })?.results)
      ? (raw as { results: unknown[] }).results
      : Array.isArray((raw as { items?: unknown[] })?.items)
        ? (raw as { items: unknown[] }).items
        : Array.isArray((raw as { data?: unknown[] })?.data)
          ? (raw as { data: unknown[] }).data
          : [];
  const list = Array.isArray(data) ? data : [];
  return list
    .map((item, index) => parseScopeOption(item, index))
    .filter((opt): opt is AuthorizationScopeOption => opt != null);
}

/**
 * Fetch list of scope options for dropdown.
 * GET /api/v1/authorization-scope-{type}/list
 * Falls back to /paged when /list is empty or unavailable.
 */
async function fetchScopeList(
  type: AuthorizationScopeType
): Promise<AuthorizationScopeOption[]> {
  try {
    const path = `${scopeBasePath(type)}/list`;
    const response = await apiClient.get(path, {
      headers: { Accept: "application/json" },
    });
    const fromList = optionsFromPayload(response.data);
    if (fromList.length > 0) return fromList;
  } catch {
    // /list may 404 after paging migration
  }
  const paged = await getAuthorizationScopesPaged(type, 1, MAX_API_PAGE_SIZE);
  return paged.items
    .filter((scope) => scope.id > 0 && scope.name.trim().length > 0)
    .map((scope) => ({ id: scope.id, label: scope.name }));
}

/** GET authorization-scope-cessna/list */
export async function getAuthorizationScopeCessnaList(): Promise<
  AuthorizationScopeOption[]
> {
  try {
    return await fetchScopeList("cessna");
  } catch {
    return [];
  }
}

/** GET authorization-scope-baron/list */
export async function getAuthorizationScopeBaronList(): Promise<
  AuthorizationScopeOption[]
> {
  try {
    return await fetchScopeList("baron");
  } catch {
    return [];
  }
}

/** GET authorization-scope-piper/list */
export async function getAuthorizationScopePiperList(): Promise<
  AuthorizationScopeOption[]
> {
  try {
    return await fetchScopeList("piper");
  } catch {
    return [];
  }
}

/** GET authorization-scope-others/list */
export async function getAuthorizationScopeOthersList(): Promise<
  AuthorizationScopeOption[]
> {
  try {
    return await fetchScopeList("others");
  } catch {
    return [];
  }
}

export async function getAuthorizationScopesPaged(
  type: AuthorizationScopeType,
  page = 1,
  limit = DEFAULT_API_PAGE_SIZE,
  search?: string
): Promise<PaginatedAuthorizationScopesResponse> {
  const params = new URLSearchParams();
  appendPagedQueryParams(params, page, limit);
  if (search?.trim()) params.set("search", search.trim());

  const res = await apiClient.get(
    `${scopeBasePath(type)}/paged?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );
  const raw = res.data?.data ?? res.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list
    .map((row: Record<string, unknown>) => {
      try {
        return parseAuthorizationScope(row);
      } catch {
        return null;
      }
    })
    .filter((x): x is AuthorizationScope => x != null && x.id > 0);
  const total = Number(raw.total ?? raw.count ?? items.length);
  const pages =
    Number(raw.pages) ||
    Math.max(1, Math.ceil((Number.isFinite(total) ? total : items.length) / limit));
  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
    page: Number(raw.page ?? page),
    pages,
  };
}

export async function getAuthorizationScopeById(
  type: AuthorizationScopeType,
  id: number
): Promise<AuthorizationScope> {
  const res = await apiClient.get(`${scopeBasePath(type)}/${id}`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  return parseAuthorizationScope(raw);
}

export async function createAuthorizationScope(
  type: AuthorizationScopeType,
  payload: { name: string }
): Promise<AuthorizationScope> {
  const res = await apiClient.post(
    `${scopeBasePath(type)}/`,
    { name: payload.name.trim() },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  const raw = res.data?.data ?? res.data;
  return parseAuthorizationScope(raw);
}

/** POST authorization-scope-cessna/ - create new Cessna scope */
export async function createAuthorizationScopeCessna(
  value: string
): Promise<AuthorizationScope> {
  return createAuthorizationScope("cessna", { name: value });
}

/** POST authorization-scope-baron/ - create new Baron scope */
export async function createAuthorizationScopeBaron(
  value: string
): Promise<AuthorizationScope> {
  return createAuthorizationScope("baron", { name: value });
}

/** POST authorization-scope-piper/ - create new PIPER PA-34 scope */
export async function createAuthorizationScopePiper(
  value: string
): Promise<AuthorizationScope> {
  return createAuthorizationScope("piper", { name: value });
}

/** POST authorization-scope-others/ - create new Others scope */
export async function createAuthorizationScopeOthers(
  value: string
): Promise<AuthorizationScope> {
  return createAuthorizationScope("others", { name: value });
}

export async function updateAuthorizationScope(
  type: AuthorizationScopeType,
  id: number,
  payload: { name: string }
): Promise<AuthorizationScope> {
  const res = await apiClient.put(
    `${scopeBasePath(type)}/${id}`,
    { name: payload.name.trim() },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  const raw = res.data?.data ?? res.data;
  return parseAuthorizationScope(raw);
}

export async function deleteAuthorizationScope(
  type: AuthorizationScopeType,
  id: number
): Promise<void> {
  await apiClient.delete(`${scopeBasePath(type)}/${id}`, {
    headers: { Accept: "application/json" },
  });
}
