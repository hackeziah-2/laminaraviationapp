import apiClient from "./index";
import { toCamel } from "../utility/utils";

/**
 * Fleet Daily Update item (one row in the list).
 * API may return snake_case; we normalize to camelCase.
 */
export interface FleetDailyUpdateItem {
  id?: number;
  aircraftId?: number;
  aircraftFk?: number;
  ident?: string;
  registration?: string;
  status?: string;
  workStatus?: string;
  nextInspDue?: string;
  nextInspectionDue?: string;
  tachDue?: number;
  tachTimeDue?: number;
  tachEod?: number;
  remainingNextInsp?: number;
  remainingEngine?: number;
  remainingPropeller?: number;
  remarks?: string;
  statusColor?: string;
  rowColor?: string;
  criticalValue?: string | null;
  /** Backend may use aircraft.registration as ident */
  aircraft?: { id: number; registration: string; model?: string; type?: string };
}

export interface FleetDailyUpdatePagedResponse {
  items: FleetDailyUpdateItem[];
  total: number;
  page: number;
  pages: number;
}

function normalizeItem(raw: any): FleetDailyUpdateItem {
  const o = raw && typeof raw === "object" ? raw : {};
  const camel = toCamel(o) as any;
  const aircraft = camel?.aircraft ?? o?.aircraft;
  const ident =
    camel?.ident ??
    camel?.registration ??
    aircraft?.registration ??
    "";
  return {
    id: camel?.id ?? o?.id,
    aircraftId: camel?.aircraftId ?? camel?.aircraftFk ?? o?.aircraft_id ?? o?.aircraft_fk,
    ident: String(ident),
    registration: camel?.registration ?? aircraft?.registration ?? ident,
    status: camel?.status ?? camel?.workStatus ?? o?.work_status ?? "",
    workStatus: camel?.workStatus ?? o?.work_status,
    nextInspDue:
      camel?.nextInspDue ??
      camel?.nextInspectionDue ??
      o?.next_inspection_due ??
      "",
    nextInspectionDue: camel?.nextInspectionDue ?? o?.next_inspection_due,
    tachDue: camel?.tachDue ?? camel?.tachTimeDue ?? o?.tach_time_due,
    tachTimeDue: camel?.tachTimeDue ?? o?.tach_time_due,
    tachEod: camel?.tachEod ?? o?.tach_eod,
    remainingNextInsp: camel?.remainingNextInsp ?? o?.remaining_next_insp,
    remainingEngine: camel?.remainingEngine ?? o?.remaining_engine,
    remainingPropeller: camel?.remainingPropeller ?? o?.remaining_propeller,
    remarks: camel?.remarks ?? o?.remarks ?? "",
    statusColor: camel?.statusColor ?? o?.status_color,
    rowColor: camel?.rowColor ?? o?.row_color,
    criticalValue: camel?.criticalValue ?? o?.critical_value ?? null,
    aircraft:
      aircraft && typeof aircraft === "object"
        ? {
            id: aircraft.id ?? aircraft.pk,
            registration: aircraft.registration ?? ident,
            model: aircraft.model,
            type: aircraft.type,
          }
        : undefined,
  };
}

/**
 * Get fleet daily update for a single aircraft.
 * GET api/v1/aircraft/{aircraft_id}/fleet-daily-update
 */
export async function getAircraftFleetDailyUpdate(
  aircraftId: number
): Promise<FleetDailyUpdateItem | null> {
  const res = await apiClient.get(`aircraft/${aircraftId}/fleet-daily-update`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw == null) return null;
  return normalizeItem(raw);
}

/**
 * Get paginated fleet daily update list (all aircraft).
 * Supports pagination, search, and status filter.
 * GET api/v1/fleet-daily-update/paged?page=&limit=&search=&status=
 * Or if backend uses aircraft path: api/v1/aircraft/fleet-daily-update/paged?...
 */
export async function getFleetDailyUpdatePaged(
  page = 1,
  limit = 10,
  search = "",
  status = ""
): Promise<FleetDailyUpdatePagedResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search.trim()) params.set("search", search.trim());
  if (status && status !== "all") params.set("status", status);

  try {
    const res = await apiClient.get(`fleet-daily-update/paged?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const data = res.data ?? {};
    const rawItems =
      Array.isArray(data) ? data : data.items ?? data.results ?? data.data ?? [];
    const list = Array.isArray(rawItems) ? rawItems : [];
    const items = list.map((item: any) => normalizeItem(item));
    const total = data.total ?? data.count ?? items.length;
    const pageNum = data.page ?? page;
    const pages =
      data.pages ?? Math.max(1, Math.ceil(Number(total) / (data.limit ?? limit)));
    return { items, total: Number(total), page: pageNum, pages };
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      return { items: [], total: 0, page: 1, pages: 1 };
    }
    throw err;
  }
}

/**
 * Payload for updating a fleet daily update record (remarks and/or status).
 */
export interface FleetDailyUpdateUpdatePayload {
  remarks?: string;
  status?: string;
}

/**
 * Update remarks and/or status for a fleet daily update record.
 * Sends snake_case body for backend: remarks, work_status (and status for backends that expect it).
 * PATCH api/v1/fleet-daily-update/{id}/ or PUT api/v1/aircraft/{aircraft_id}/fleet-daily-update/
 */
export async function updateFleetDailyUpdateRemark(
  item: FleetDailyUpdateItem,
  payload: FleetDailyUpdateUpdatePayload
): Promise<FleetDailyUpdateItem | null> {
  const body: Record<string, string> = {};
  if (payload.remarks !== undefined) {
    body.remarks = payload.remarks ?? "";
  }
  if (payload.status !== undefined) {
    const statusValue = payload.status ?? "";
    body.work_status = statusValue; // backend often expects snake_case
    body.status = statusValue;       // some backends use status
  }
  if (Object.keys(body).length === 0) return normalizeItem(item as any);
  const mergedItem = (raw: any): FleetDailyUpdateItem =>
    raw != null ? normalizeItem(raw) : { ...item, remarks: payload.remarks ?? item.remarks, status: payload.status ?? item.status };

  if (item.id != null) {
    const res = await apiClient.patch(`fleet-daily-update/${item.id}/`, body, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
    const data = res.data ?? {};
    const raw = (data as any).data ?? (data as any).result ?? data;
    return mergedItem(raw);
  }
  const aircraftId = item.aircraftId ?? item.aircraft?.id;
  if (aircraftId != null) {
    const res = await apiClient.put(`aircraft/${aircraftId}/fleet-daily-update/`, body, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
    const data = res.data ?? {};
    const raw = (data as any).data ?? (data as any).result ?? data;
    return mergedItem(raw);
  }
  throw new Error("Fleet daily update item has no id or aircraftId");
}
