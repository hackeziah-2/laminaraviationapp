import apiClient from "../api/index";

function extractAccountDisplayName(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const direct =
      o.full_name ?? o.fullName ?? o.name ?? o.username ?? o.email;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const first = String(o.first_name ?? o.firstName ?? "").trim();
    const last = String(o.last_name ?? o.lastName ?? "").trim();
    const composed = [first, last].filter(Boolean).join(" ");
    if (composed) return composed;
  }
  return null;
}

export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "BULK_UPDATE";

export interface AuditLog {
  id: number;
  moduleName: string;
  tableName: string;
  recordId: number;
  action: AuditActionType | string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedFields: string[] | null;
  performedByUserId: number | null;
  performedByName: string | null;
  createdByName: string | null;
  updatedByName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AuditLogDetail extends AuditLog {}

export interface AuditLogSummary {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
}

export interface AuditLogListResponse {
  page: number;
  limit: number;
  total: number;
  summary: AuditLogSummary;
  items: AuditLog[];
}

export interface AuditLogFilterOptions {
  moduleNames: string[];
  performedByNames: string[];
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  moduleName?: string;
  action?: string;
  performedByName?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

function normalizeAuditLog(raw: Record<string, unknown>): AuditLog {
  return {
    id: Number(raw.id),
    moduleName: String(raw.module_name ?? raw.moduleName ?? ""),
    tableName: String(raw.table_name ?? raw.tableName ?? ""),
    recordId: Number(raw.record_id ?? raw.recordId ?? 0),
    action: String(raw.action ?? ""),
    oldData: (raw.old_data ?? raw.oldData ?? null) as Record<
      string,
      unknown
    > | null,
    newData: (raw.new_data ?? raw.newData ?? null) as Record<
      string,
      unknown
    > | null,
    changedFields: (raw.changed_fields ?? raw.changedFields ?? null) as
      | string[]
      | null,
    performedByUserId:
      raw.performed_by_user_id != null || raw.performedByUserId != null
        ? Number(raw.performed_by_user_id ?? raw.performedByUserId)
        : null,
    performedByName:
      extractAccountDisplayName(raw.performed_by ?? raw.performedBy) ??
      ((raw.performed_by_name ?? raw.performedByName ?? null) as string | null),
    createdByName: extractAccountDisplayName(raw.created_by ?? raw.createdBy),
    updatedByName: extractAccountDisplayName(raw.updated_by ?? raw.updatedBy),
    ipAddress: (raw.ip_address ?? raw.ipAddress ?? null) as string | null,
    userAgent: (raw.user_agent ?? raw.userAgent ?? null) as string | null,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    updatedAt:
      raw.updated_at != null || raw.updatedAt != null
        ? String(raw.updated_at ?? raw.updatedAt)
        : null,
  };
}

function normalizeSummary(raw: Record<string, unknown> | undefined): AuditLogSummary {
  const s = raw ?? {};
  return {
    total: Number(s.total ?? 0),
    creates: Number(s.creates ?? 0),
    updates: Number(s.updates ?? 0),
    deletes: Number(s.deletes ?? 0),
  };
}

/** Convert YYYY-MM-DD from a date input to UTC ISO start-of-local-day. */
export function formatAuditLogDateStart(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

/** Convert YYYY-MM-DD from a date input to UTC ISO end-of-local-day. */
export function formatAuditLogDateEnd(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function buildSearchParams(params: AuditLogQueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.moduleName) searchParams.set("module_name", params.moduleName);
  if (params.action) searchParams.set("action", params.action);
  if (params.performedByName) {
    searchParams.set("performed_by_name", params.performedByName);
  }
  if (params.startDate) {
    searchParams.set("start_date", formatAuditLogDateStart(params.startDate));
  }
  if (params.endDate) {
    searchParams.set("end_date", formatAuditLogDateEnd(params.endDate));
  }
  const search = params.search?.trim();
  if (search) searchParams.set("search", search);
  return searchParams;
}

export async function getAuditLogs(
  params: AuditLogQueryParams = {}
): Promise<AuditLogListResponse> {
  const qs = buildSearchParams(params).toString();
  const url = qs ? `audit-logs/?${qs}` : "audit-logs/";
  const response = await apiClient.get(url);
  const raw = response.data ?? {};

  const itemsRaw = raw.items ?? raw.results ?? raw.data ?? [];
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item: Record<string, unknown>) => normalizeAuditLog(item))
    : [];

  return {
    page: Number(raw.page ?? params.page ?? 1),
    limit: Number(raw.limit ?? params.limit ?? 10),
    total: Number(raw.total ?? items.length),
    summary: normalizeSummary(raw.summary),
    items,
  };
}

export async function getAuditLogDetail(id: number): Promise<AuditLogDetail> {
  const response = await apiClient.get(`audit-logs/${id}`);
  return normalizeAuditLog(response.data ?? {});
}

export async function getAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
  const response = await apiClient.get("audit-logs/filter-options");
  const raw = response.data ?? {};
  const modules = raw.module_names ?? raw.moduleNames ?? [];
  const users = raw.performed_by_names ?? raw.performedByNames ?? [];
  return {
    moduleNames: Array.isArray(modules) ? modules.map(String) : [],
    performedByNames: Array.isArray(users) ? users.map(String) : [],
  };
}

export async function exportAuditLogs(
  params: AuditLogQueryParams = {}
): Promise<AuditLog[]> {
  const res = await getAuditLogs({ ...params, page: 1, limit: 5000 });
  return res.items;
}
