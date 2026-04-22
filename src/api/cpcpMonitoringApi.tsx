import apiClient from "./index";

const BASE = "cpcp-monitoring";

function toStr(v: any): string {
  if (v == null || v === "") return "";
  return String(v).trim();
}
function numStr(v: any): string {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? String(n) : "";
}

/** Interval hours/months: numeric string for UI + forms, default "0" when missing or invalid */
function intervalStr(v: any): string {
  const n = numStr(v);
  return n === "" ? "0" : n;
}

function intervalPayloadValue(v: any): number {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  if (s === "" || s === "-") return 0;
  const n = typeof v === "number" ? v : parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Last-done tach / AFTT: omit when blank; otherwise numeric (0 allowed). */
function lastDoneFloatPayload(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || s === "-" || s === "—") return null;
  const n = typeof v === "number" ? v : parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Normalize raw API item to a flat entry for list/view. Backend may use snake_case. */
function normalizeEntry(raw: any): CPCPEntry {
  const r = raw ?? {};
  const id = r.id ?? r.pk ?? r.entry_id ?? 0;
  const atl = r.atl ?? r.atl_ref;
  const sequenceNo =
    (atl && typeof atl === "object" && (atl.sequence_no ?? atl.sequenceNo ?? atl.sequence_number))
      ? toStr(atl.sequence_no ?? atl.sequenceNo ?? atl.sequence_number)
      : toStr(r.sequence_no ?? r.sequenceNo ?? r.reference_sequence_no ?? "");
  const reference =
    sequenceNo ||
    toStr(
      r.reference ??
        (typeof r.atl_ref === "object"
          ? (r.atl_ref?.sequence_no ?? r.atl_ref?.sequenceNo ?? r.atl_ref?.sequence_number)
          : null) ??
        r.atl_ref_no
    );
  return {
    ...r,
    id: Number(id),
    inspectionCode: toStr(r.inspection_operation ?? r.inspection_code ?? r.inspectionCode),
    description: toStr(r.description),
    reference,
    status: toStr(r.status) || "white",
    remaining: {
      months: toStr(r.remaining_months ?? r.remaining?.months) || "-",
      days: toStr(r.remaining_days ?? r.remaining?.days) || "-",
      tach: toStr(r.remaining_tach ?? r.remaining?.tach ?? r.remaining?.tech) || "-",
      aftf: toStr(r.remaining_aftt ?? r.remaining?.aftf) || "-",
    },
    interval: {
      hours: intervalStr(r.interval_hours ?? r.interval?.hours),
      months: intervalStr(r.interval_months ?? r.interval?.months),
    },
    lastDone: {
      date: toStr(r.last_done_date ?? r.lastDone?.date),
      tach: numStr(r.last_done_tach ?? r.lastDone?.tach ?? r.lastDone?.tech),
      aftf: numStr(r.last_done_aftt ?? r.lastDone?.aftf),
    },
    nextDue: {
      date: toStr(r.next_due_date ?? r.nextDue?.date) || "-",
      tach: toStr(r.next_due_tach ?? r.nextDue?.tach ?? r.nextDue?.tech) || "-",
      aftf: toStr(r.next_due_aftt ?? r.nextDue?.aftf) || "-",
    },
  };
}

export interface CPCPEntry {
  id: number;
  inspectionCode?: string;
  description?: string;
  reference?: string;
  status?: string;
  remaining?: {
    months?: string | number;
    days?: string | number;
    tach?: string | number;
    aftf?: string | number;
  };
  interval?: {
    hours?: string | number;
    months?: string | number;
  };
  lastDone?: {
    date?: string;
    tach?: string | number;
    aftf?: string | number;
  };
  nextDue?: {
    date?: string;
    tach?: string | number;
    aftf?: string | number;
  };
  [key: string]: any;
}

export interface PaginatedCPCPResponse {
  items: CPCPEntry[];
  total: number;
  page: number;
  pages: number;
}

/**
 * List CPCP Monitoring (paged).
 * GET /api/v1/cpcp-monitoring/paged?page=&limit=&search=&aircraft_id= (optional)
 */
export async function getCpcpMonitoringPaged(
  page = 1,
  limit = 10,
  search = "",
  aircraftId?: string | number | null
): Promise<PaginatedCPCPResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search.trim()) params.set("search", search.trim());
  if (aircraftId != null && String(aircraftId).trim() !== "") {
    const aid = typeof aircraftId === "number" ? aircraftId : parseInt(String(aircraftId), 10);
    if (!isNaN(aid)) params.set("aircraft_id", String(aid));
  }
  const res = await apiClient.get(`${BASE}/paged?${params.toString()}`);
  const data = res.data ?? {};
  const rawItems = Array.isArray(data) ? data : data.items ?? data.results ?? data.data ?? [];
  const items = (Array.isArray(rawItems) ? rawItems : []).map((item: any) => normalizeEntry(item));
  const total = data.total ?? data.count ?? items.length;
  const pageNum = data.page ?? page;
  const pages = data.pages ?? Math.max(1, Math.ceil(Number(total) / (data.limit ?? limit)));
  return { items, total: Number(total), page: pageNum, pages };
}

/**
 * Get CPCP Monitoring by ID.
 * GET /api/v1/cpcp-monitoring/{entry_id}
 */
export async function getCpcpMonitoringById(entryId: number): Promise<CPCPEntry> {
  const res = await apiClient.get(`${BASE}/${entryId}`);
  const raw = res.data?.data ?? res.data;
  if (raw == null) throw new Error("CPCP entry not found");
  return normalizeEntry(raw);
}

/** Build API payload (snake_case) from form/modal data for create/update */
export function buildCpcpPayload(form: Record<string, any>): Record<string, any> {
  const p: Record<string, any> = {};
  p.inspection_operation = form.inspection_operation ?? form.inspection_code ?? form.inspectionType ?? null;
  p.description = form.description ?? form.findings ?? null;
  p.interval_hours = intervalPayloadValue(form.interval_hours ?? form.interval?.hours);
  p.interval_months = intervalPayloadValue(form.interval_months ?? form.interval?.months);
  if (form.aircraft_id != null) p.aircraft_id = form.aircraft_id;

  const atlRaw = form.atl_ref ?? form.atlId;
  if (atlRaw != null && atlRaw !== "") {
    const atlNum = typeof atlRaw === "number" ? atlRaw : parseInt(String(atlRaw), 10);
    if (Number.isFinite(atlNum) && atlNum > 0) p.atl_ref = atlNum;
  }

  const lastTach = lastDoneFloatPayload(
    form.last_done_tach ?? form.lastDone?.tach ?? form.lastDone?.tech
  );
  if (lastTach != null) p.last_done_tach = lastTach;

  const lastAftt = lastDoneFloatPayload(form.last_done_aftt ?? form.lastDone?.aftf);
  if (lastAftt != null) p.last_done_aftt = lastAftt;

  const lastDateRaw = form.last_done_date ?? form.lastDone?.date ?? form.inspectionDate;
  const lastDate =
    lastDateRaw != null && String(lastDateRaw).trim() !== "" && String(lastDateRaw).trim() !== "-"
      ? String(lastDateRaw).trim()
      : null;
  if (lastDate) p.last_done_date = lastDate;

  return Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== ""));
}

/**
 * Create CPCP Monitoring entry.
 * POST /api/v1/cpcp-monitoring/
 */
export async function createCpcpMonitoring(payload: Record<string, any>): Promise<CPCPEntry> {
  const apiPayload = Object.keys(payload).length && (payload.inspection_operation ?? payload.inspection_code ?? payload.inspectionType ?? payload.description ?? payload.findings) != null
    ? buildCpcpPayload(payload)
    : payload;
  const res = await apiClient.post(`${BASE}/`, apiPayload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeEntry(raw);
  if (res.status === 201) return normalizeEntry({ id: (res.data as any)?.id ?? 0, ...apiPayload });
  throw new Error("Invalid create response");
}

/**
 * Update CPCP Monitoring entry.
 * PUT /api/v1/cpcp-monitoring/{entry_id}
 */
export async function updateCpcpMonitoring(
  entryId: number,
  payload: Record<string, any>
): Promise<CPCPEntry> {
  const apiPayload = Object.keys(payload).length && (payload.inspection_operation ?? payload.inspection_code ?? payload.inspectionType ?? payload.description ?? payload.findings) != null
    ? buildCpcpPayload(payload)
    : payload;
  const res = await apiClient.put(`${BASE}/${entryId}/`, apiPayload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeEntry(raw);
  if (res.status === 200) return normalizeEntry({ id: entryId, ...apiPayload });
  throw new Error("Invalid update response");
}

/**
 * Soft delete CPCP Monitoring entry.
 * DELETE /api/v1/cpcp-monitoring/{entry_id}
 */
export async function deleteCpcpMonitoring(entryId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${entryId}`);
}
