import apiClient from "./index";

export interface LDNDMonitoring {
  id: number;
  inspectionType: string;
  unit: string;
  tachDue: number;
  tachDone: number;
  start: string;
  end: string;
  nextDue: number;
}

export interface LDNDMonitoringCreate {
  inspectionType: string;
  unit: string;
  tachDue: number;
  tachDone: number;
  start: string;
  end: string;
  nextDue: number;
}

export interface LDNDMonitoringUpdate {
  inspectionType?: string;
  unit?: string;
  tachDue?: number;
  tachDone?: number;
  start?: string;
  end?: string;
  nextDue?: number;
}

export interface PaginatedLDNDResponse {
  items: LDNDMonitoring[];
  total: number;
  page: number;
  pages: number;
}

/** Response from GET .../ldnd-monitoring/latest (summary for info cards) */
export interface LDNDMonitoringLatest {
  currentTach: number | null;
  currentTachDisplay: string;
  nextInspection: string;
  lastUpdated: string;
}

const LDND_PATH = (aircraftId: number) =>
  `aircraft/${aircraftId}/ldnd-monitoring/`;

/** Map API response (any field naming) to frontend LDNDMonitoring shape */
function normalizeItem(raw: any): LDNDMonitoring {
  const r = raw ?? {};
  const tachDue =
    r.last_done_tach_due ??
    r.tach_due ??
    r.tachDue ??
    0;
  const tachDone =
    r.last_done_tach_done ?? r.tach_done ?? r.tachDone ?? 0;
  const start =
    r.performed_date_start ?? r.start ?? "";
  const end =
    r.performed_date_end ?? r.end ?? "";
  const nextDue =
    r.next_due_tach_hours != null
      ? Number(r.next_due_tach_hours)
      : Number(r.next_due ?? r.nextDue ?? 0);
  return {
    id: r.id ?? r.pk,
    inspectionType: r.inspection_type ?? r.inspectionType ?? r.type ?? "",
    unit: r.unit ?? "HRS",
    tachDue: Number(tachDue),
    tachDone: Number(tachDone),
    start: String(start),
    end: String(end),
    nextDue: Number(nextDue),
  };
}

/**
 * List LDND Monitoring for an aircraft (paged).
 * GET api/v1/aircraft/{aircraft_id}/ldnd-monitoring/paged?limit=10&page=1
 */
export const getAircraftLdndMonitoring = async (
  aircraftId: number,
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedLDNDResponse> => {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  params.append("page", String(page));
  if (search.trim()) params.append("search", search.trim());

  const endpoint = `${LDND_PATH(aircraftId)}paged?${params.toString()}`;
  let res: any;
  try {
    res = await apiClient.get(endpoint, {
      headers: { Accept: "application/json" },
    });
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return { items: [], total: 0, page: 1, pages: 1 };
    }
    throw err;
  }

  const data = res.data?.data ?? res.data;
  const rawItems = Array.isArray(data)
    ? data
    : data?.items ?? data?.results ?? data?.data ?? [];
  const allItems = (Array.isArray(rawItems) ? rawItems : [])
    .filter((x: any) => x != null)
    .map(normalizeItem);

  const isPaginated =
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    (data.total != null || data.count != null || data.pages != null);

  if (isPaginated) {
    const total = data.total ?? data.count ?? allItems.length;
    const pageNum = data.page ?? page;
    const limitUsed = data.limit ?? limit;
    const pages = data.pages ?? Math.max(1, Math.ceil(total / limitUsed));
    return { items: allItems, total, page: pageNum, pages };
  }

  const total = allItems.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = allItems.slice(start, start + limit);
  return { items, total, page, pages };
};

/** Format date string to YYYY-MM-DD for Last Updated */
function formatLastUpdatedToYYYYMMDD(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).trim();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get LDND latest summary for info cards (Current Tach, Next Inspection, Last Updated).
 * GET api/v1/aircraft/{aircraft_id}/ldnd-monitoring/latest
 * Next Inspection format: "{nextDue} HRS from {inspection_type} - Next due"
 * Last Updated format: YYYY-MM-DD
 */
export const getAircraftLdndMonitoringLatest = async (
  aircraftId: number
): Promise<LDNDMonitoringLatest> => {
  const res = await apiClient.get(`${LDND_PATH(aircraftId)}latest`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data ?? {};
  const currentTach =
    raw.current_tach != null
      ? Number(raw.current_tach)
      : raw.currentTach != null
      ? Number(raw.currentTach)
      : null;
  const currentTachDisplay =
    currentTach != null && !isNaN(currentTach)
      ? `${currentTach.toFixed(1)} hrs`
      : "";

  // Next Inspection: "{nextDue} HRS from {inspection_type} - Next due"
  const nextDueHours =
    raw.next_due_tach_hours ?? raw.next_due_tach ?? raw.next_due ?? raw.nextDue;
  const inspectionType =
    raw.inspection_type ?? raw.inspectionType ?? raw.type ?? "";
  let nextInspection = raw.next_inspection ?? raw.nextInspection ?? "";
  if (
    nextDueHours != null &&
    String(nextDueHours).trim() !== "" &&
    !isNaN(Number(nextDueHours))
  ) {
    const hrs = Number(nextDueHours);
    nextInspection = `${hrs} HRS from ${inspectionType || "Inspection"} - Next due`;
  }
  if (!nextInspection.trim()) nextInspection = "-";

  // Last Updated: YYYY-MM-DD
  const lastUpdatedRaw = raw.last_updated ?? raw.lastUpdated ?? "";
  const lastUpdated = lastUpdatedRaw
    ? formatLastUpdatedToYYYYMMDD(lastUpdatedRaw) || "-"
    : "-";

  return {
    currentTach:
      currentTach != null && !isNaN(currentTach) ? currentTach : null,
    currentTachDisplay: currentTachDisplay || "-",
    nextInspection,
    lastUpdated,
  };
};

/**
 * Get one LDND record.
 * GET api/v1/aircraft/{aircraft_id}/ldnd-monitoring/{id}/
 */
export const getAircraftLdndMonitoringById = async (
  aircraftId: number,
  id: number
): Promise<LDNDMonitoring> => {
  const res = await apiClient.get(`${LDND_PATH(aircraftId)}${id}/`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw == null) throw new Error("LDND record not found");
  return normalizeItem(raw);
};

/**
 * Create LDND record.
 * POST api/v1/aircraft/{aircraft_id}/ldnd-monitoring/
 */
export const createAircraftLdndMonitoring = async (
  aircraftId: number,
  data: LDNDMonitoringCreate
): Promise<LDNDMonitoring> => {
  const payload = {
    aircraft_fk: aircraftId,
    inspection_type: data.inspectionType,
    unit: data.unit,
    last_done_tach_due: data.tachDue,
    last_done_tach_done: data.tachDone,
    performed_date_start: data.start,
    performed_date_end: data.end,
    next_due_tach_hours: data.nextDue,
  };
  const res = await apiClient.post(LDND_PATH(aircraftId), payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw == null) throw new Error("Invalid create response");
  return normalizeItem(raw);
};

/**
 * Update LDND record.
 * PUT api/v1/aircraft/{aircraft_id}/ldnd-monitoring/{id}/
 */
export const updateAircraftLdndMonitoring = async (
  aircraftId: number,
  id: number,
  data: LDNDMonitoringUpdate
): Promise<LDNDMonitoring> => {
  const payload: Record<string, unknown> = { aircraft_fk: aircraftId };
  if (data.inspectionType !== undefined)
    payload.inspection_type = data.inspectionType;
  if (data.unit !== undefined) payload.unit = data.unit;
  if (data.tachDue !== undefined) payload.last_done_tach_due = data.tachDue;
  if (data.tachDone !== undefined) payload.last_done_tach_done = data.tachDone;
  if (data.start !== undefined) payload.performed_date_start = data.start;
  if (data.end !== undefined) payload.performed_date_end = data.end;
  if (data.nextDue !== undefined) payload.next_due_tach_hours = data.nextDue;

  const res = await apiClient.put(`${LDND_PATH(aircraftId)}${id}/`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw == null) throw new Error("Invalid update response");
  return normalizeItem(raw);
};

/**
 * Delete LDND record.
 * DELETE api/v1/aircraft/{aircraft_id}/ldnd-monitoring/{id}/
 */
export const deleteAircraftLdndMonitoring = async (
  aircraftId: number,
  id: number
): Promise<void> => {
  await apiClient.delete(`${LDND_PATH(aircraftId)}${id}/`);
};
