import apiClient from "./index";

const BASE = "modules";

export interface Module {
  id: number;
  name: string;
  description?: string;
  code?: string;
}

function normalizeModule(raw: Record<string, unknown>): Module {
  const getStr = (k: string, fallback = "") =>
    String(raw[k] ?? raw[k?.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? fallback);
  const id = Number(raw.id ?? 0);
  return {
    id: isNaN(id) ? 0 : id,
    name: getStr("name"),
    description: getStr("description", ""),
    code: getStr("code", ""),
  };
}

/** List (dropdowns): GET /api/v1/modules/modules-list */
export const getModulesList = async (): Promise<Module[]> => {
  const response = await apiClient.get(`${BASE}/modules-list`);
  const raw = response.data ?? {};
  const data = Array.isArray(raw) ? raw : raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  return list.map((item: Record<string, unknown>) => normalizeModule(item));
};

export interface PaginatedModulesResponse {
  items: Module[];
  total: number;
  page: number;
  pages: number;
}

/** Paged: GET /api/v1/modules/paged */
export const getModulesPaged = async (
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedModulesResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search.trim()) params.set("search", search.trim());
  const response = await apiClient.get(`${BASE}/paged?${params.toString()}`);
  const raw = response.data ?? {};
  const data = raw.results ?? raw.items ?? raw.data ?? [];
  const list = Array.isArray(data) ? data : [];
  const items = list.map((item: Record<string, unknown>) => normalizeModule(item));
  const total = raw.total ?? raw.count ?? items.length;
  const pages = raw.pages ?? Math.max(1, Math.ceil(Number(total) / limit));
  return { items, total: Number(total), page: raw.page ?? page, pages: Number(pages) };
};

/** Get: GET /api/v1/modules/{module_id} */
export const getModule = async (moduleId: number): Promise<Module> => {
  const response = await apiClient.get(`${BASE}/${moduleId}`);
  const raw = response.data ?? {};
  return normalizeModule({ ...raw, id: moduleId });
};

/** Create: POST /api/v1/modules/ */
export const createModule = async (payload: { name: string; description?: string; code?: string }): Promise<Module> => {
  const body = {
    name: payload.name,
    description: payload.description,
    code: payload.code,
  };
  const response = await apiClient.post(`${BASE}/`, body);
  const raw = response.data ?? {};
  return normalizeModule(raw);
};

/** Update: PUT /api/v1/modules/{module_id} */
export const updateModule = async (moduleId: number, payload: Partial<Module>): Promise<Module> => {
  const body = {
    name: payload.name,
    description: payload.description,
    code: payload.code,
  };
  const response = await apiClient.put(`${BASE}/${moduleId}`, body);
  const raw = response.data ?? {};
  return normalizeModule({ ...raw, id: moduleId });
};

/** Delete: DELETE /api/v1/modules/{module_id} */
export const deleteModule = async (moduleId: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${moduleId}`);
};
