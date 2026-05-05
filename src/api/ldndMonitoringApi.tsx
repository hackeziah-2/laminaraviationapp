import apiClient from "./index";

/** Matches backend: inspection_type, unit (HRS|CYCLES), last_done_tach_due, last_done_tach_done, next_due_tach_hours, performed_date_start */
export interface LDNDMonitoring {
  id: number;
  inspectionType: string;
  type: string;
  unit: "HRS" | "CYCLES";
  lastDoneTachDue: number | null;
  lastDoneTachDone: number | null;
  nextDueTachHours: number | null;
  performedDateStart: string | null;
  performedDateEnd: string | null;
}

export interface LDNDMonitoringCreate {
  inspectionType?: string;
  type?: string;
  unit: "HRS" | "CYCLES";
  lastDoneTachDue?: number | string | null;
  lastDoneTachDone?: number | string | null;
  nextDueTachHours?: number | string | null;
  performedDateStart?: string | null;
  performedDateEnd?: string | null;
}

export interface LDNDMonitoringUpdate {
  inspectionType?: string;
  type?: string;
  unit?: "HRS" | "CYCLES";
  lastDoneTachDue?: number | string | null;
  lastDoneTachDone?: number | string | null;
  nextDueTachHours?: number | string | null;
  performedDateStart?: string | null;
  performedDateEnd?: string | null;
}

export interface PaginatedLDNDResponse {
  items: LDNDMonitoring[];
  total: number;
  page: number;
  pages: number;
}

/** Response from GET .../ldnd-monitoring/latest */
export interface LDNDLatest {
  currentTach: number | string | null;
  nextInspectionDue: number | null;
  nextInspectionUnit: string | null;
  lastUpdated: string | null;
}

const LDND_PATH = (aircraftId: number) =>
  `aircraft/${aircraftId}/ldnd-monitoring/`;

function toNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function normalizeItem(raw: any): LDNDMonitoring {
  const r = raw ?? {};
  const type = r.inspection_type ?? r.inspectionType ?? r.type ?? "";
  const unit = (r.unit === "CYCLES" ? "CYCLES" : "HRS") as "HRS" | "CYCLES";
  return {
    id: r.id ?? r.pk,
    inspectionType: type,
    type,
    unit,
    lastDoneTachDue: toNum(r.last_done_tach_due ?? r.lastDoneTachDue),
    lastDoneTachDone: toNum(r.last_done_tach_done ?? r.lastDoneTachDone),
    nextDueTachHours: toNum(r.next_due_tach_hours ?? r.nextDueTachHours),
    performedDateStart: r.performed_date_start ?? r.performedDateStart ?? null,
    performedDateEnd: r.performed_date_end ?? r.performedDateEnd ?? null,
  };
}

/**
 * Get latest LDND summary for an aircraft.
 * GET api/v1/aircraft/{aircraft_id}/ldnd-monitoring/latest
 */
export const getAircraftLdndMonitoringLatest = async (
  aircraftId: number
): Promise<LDNDLatest | null> => {
  try {
    const res = await apiClient.get(`${LDND_PATH(aircraftId)}latest/`, {
      headers: { Accept: "application/json" },
    });
    const raw = res?.data?.data ?? res?.data ?? {};
    const r = raw ?? {};
    return {
      currentTach: r.current_tach ?? r.currentTach ?? null,
      nextInspectionDue: toNum(r.next_inspection_due ?? r.nextInspectionDue),
      nextInspectionUnit:
        r.next_inspection_unit ?? r.nextInspectionUnit ?? null,
      lastUpdated: r.last_updated ?? r.lastUpdated ?? null,
    };
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

/**
 * List LDND Monitoring for an aircraft (paged).
 * GET api/v1/aircraft/{aircraft_id}/ldnd-monitoring/?limit=10&page=1
 * or .../ldnd-monitoring/paged?limit=10&page=1
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

  const endpointPaged = `${LDND_PATH(aircraftId)}paged?${params.toString()}`;
  const endpointList = `${LDND_PATH(aircraftId)}?${params.toString()}`;
  let res: any;
  try {
    res = await apiClient.get(endpointPaged, {
      headers: { Accept: "application/json" },
    });
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      try {
        res = await apiClient.get(endpointList, {
          headers: { Accept: "application/json" },
        });
      } catch (e2: any) {
        if (e2?.response?.status === 404 || e2?.response?.status === 405) {
          return { items: [], total: 0, page: 1, pages: 1 };
        }
        throw e2;
      }
    } else {
      throw err;
    }
  }

  const data = res?.data?.data ?? res?.data;
  const rawItems = Array.isArray(data)
    ? data
    : data &&
      typeof data === "object" &&
      (data.items ?? data.results ?? data.data)
    ? data.items ?? data.results ?? data.data
    : [];
  const rawList = Array.isArray(rawItems) ? rawItems : [];
  const allItems = rawList.filter((x: any) => x != null).map(normalizeItem);

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

export const createAircraftLdndMonitoring = async (
  aircraftId: number,
  data: LDNDMonitoringCreate
): Promise<LDNDMonitoring> => {
  const unit = data.unit === "CYCLES" ? "CYCLES" : "HRS";
  const payload = {
    aircraft_fk: aircraftId,
    inspection_type: String(data.inspectionType ?? data.type ?? "").trim(),
    unit,
    last_done_tach_due:
      data.lastDoneTachDue != null && data.lastDoneTachDue !== ""
        ? Number(data.lastDoneTachDue)
        : null,
    last_done_tach_done:
      data.lastDoneTachDone != null && data.lastDoneTachDone !== ""
        ? Number(data.lastDoneTachDone)
        : null,
    next_due_tach_hours:
      data.nextDueTachHours != null && data.nextDueTachHours !== ""
        ? Number(data.nextDueTachHours)
        : null,
    performed_date_start: data.performedDateStart?.trim() || null,
    performed_date_end: data.performedDateEnd?.trim() || null,
  };
  const res = await apiClient.post(LDND_PATH(aircraftId), payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  if (res.status === 201) {
    return {
      id: (res.data as any)?.id ?? 0,
      inspectionType: String(payload.inspection_type),
      type: String(payload.inspection_type),
      unit,
      lastDoneTachDue: payload.last_done_tach_due,
      lastDoneTachDone: payload.last_done_tach_done,
      nextDueTachHours: payload.next_due_tach_hours,
      performedDateStart: payload.performed_date_start,
      performedDateEnd: payload.performed_date_end,
    };
  }
  throw new Error("Invalid create response");
};

export const updateAircraftLdndMonitoring = async (
  aircraftId: number,
  id: number,
  data: LDNDMonitoringUpdate
): Promise<LDNDMonitoring> => {
  const unit = (data.unit === "CYCLES" ? "CYCLES" : "HRS") as "HRS" | "CYCLES";
  const payload: Record<string, unknown> = {
    aircraft_fk: aircraftId,
    inspection_type: String(data.inspectionType ?? data.type ?? "").trim(),
    unit: data.unit ?? "HRS",
    last_done_tach_due:
      data.lastDoneTachDue != null && data.lastDoneTachDue !== ""
        ? Number(data.lastDoneTachDue)
        : null,
    last_done_tach_done:
      data.lastDoneTachDone != null && data.lastDoneTachDone !== ""
        ? Number(data.lastDoneTachDone)
        : null,
    next_due_tach_hours:
      data.nextDueTachHours != null && data.nextDueTachHours !== ""
        ? Number(data.nextDueTachHours)
        : null,
    performed_date_start: data.performedDateStart?.trim() || null,
    performed_date_end: data.performedDateEnd?.trim() || null,
  };
  const res = await apiClient.put(`${LDND_PATH(aircraftId)}${id}/`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  return {
    id,
    inspectionType: String(payload.inspection_type),
    type: String(payload.inspection_type),
    unit,
    lastDoneTachDue: payload.last_done_tach_due as number | null,
    lastDoneTachDone: payload.last_done_tach_done as number | null,
    nextDueTachHours: payload.next_due_tach_hours as number | null,
    performedDateStart: (payload.performed_date_start as string) ?? null,
    performedDateEnd: (payload.performed_date_end as string) ?? null,
  };
};

export const deleteAircraftLdndMonitoring = async (
  aircraftId: number,
  id: number
): Promise<void> => {
  await apiClient.delete(`${LDND_PATH(aircraftId)}${id}/`);
};
