import apiClient from "./index";

export interface WorkOrderAdMonitoring {
  id: number;
  woNumber: string;
  /** May be set per row from API, or filled from parent AD in UI/export */
  subject?: string;
  lastDoneAftt: string | number;
  lastDoneTach: string | number;
  lastDoneDate: string;
  nextDueAftt: string | number;
  nextDueTach: string | number;
  atlRef: string;
}

export interface WorkOrderAdMonitoringCreate {
  woNumber: string;
  lastDoneAftt: string | number;
  lastDoneTach: string | number;
  lastDoneDate: string;
  nextDueAftt: string | number;
  nextDueTach: string | number;
  atlRef: string;
}

export interface WorkOrderAdMonitoringUpdate {
  woNumber?: string;
  lastDoneAftt?: string | number;
  lastDoneTach?: string | number;
  lastDoneDate?: string;
  nextDueAftt?: string | number;
  nextDueTach?: string | number;
  atlRef?: string;
}

export interface PaginatedWorkOrderResponse {
  items: WorkOrderAdMonitoring[];
  total: number;
  page: number;
  pages: number;
}

/** GET/POST/DELETE …/aircraft/{id}/ad_monitoring/{adId}/work-order-ad-monitoring/ */
const WO_PATH = (aircraftFk: number, adMonitoringFk: number) =>
  `aircraft/${aircraftFk}/ad_monitoring/${adMonitoringFk}/work-order-ad-monitoring/`;

function normalizeItem(raw: any): WorkOrderAdMonitoring {
  const r = raw ?? {};
  return {
    id: r.id ?? r.pk,
    woNumber: r.work_order_number ?? r.wo_number ?? r.woNumber ?? "",
    subject:
      r.subject ??
      r.ad_subject ??
      (typeof r.ad_monitoring === "object" && r.ad_monitoring
        ? r.ad_monitoring.subject
        : undefined) ??
      undefined,
    lastDoneAftt:
      r.last_done_aftt ??
      r.last_done_actt ??
      r.last_done_acft ??
      r.lastDoneAftt ??
      r.lastDoneActt ??
      "",
    lastDoneTach: r.last_done_tach ?? r.lastDoneTach ?? "",
    lastDoneDate: r.last_done_date ?? r.lastDoneDate ?? "",
    nextDueAftt:
      r.next_due_aftt ??
      r.next_done_actt ??
      r.next_due_acft ??
      r.nextDueAftt ??
      r.nextDoneActt ??
      "",
    nextDueTach:
      r.next_due_tach ?? r.tach ?? r.nextDueTach ?? "",
    atlRef: r.atl_ref ?? r.atl_reference ?? r.atlRef ?? "",
  };
}

function toApiPayload(
  data: WorkOrderAdMonitoringCreate | WorkOrderAdMonitoringUpdate,
  adMonitoringFk?: number
) {
  const payload: Record<string, unknown> = {
    work_order_number: String(data.woNumber ?? "").trim(),
    last_done_aftt: Number(data.lastDoneAftt) || 0,
    last_done_tach: Number(data.lastDoneTach) || 0,
    last_done_date: data.lastDoneDate?.trim() || null,
    next_due_aftt: Number(data.nextDueAftt) || 0,
    next_due_tach: Number(data.nextDueTach) || 0,
    atl_ref: String(data.atlRef ?? "").trim(),
  };
  if (adMonitoringFk != null) {
    payload.ad_monitoring_fk = adMonitoringFk;
  }
  return payload;
}

/**
 * List (paged).
 * GET api/v1/aircraft/{aircraftId}/ad_monitoring/{adMonitoringId}/work-order-ad-monitoring/paged
 */
export const getWorkOrderAdMonitoring = async (
  aircraftFk: number,
  adMonitoringFk: number,
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedWorkOrderResponse> => {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  params.append("page", String(page));
  if (search.trim()) params.append("search", search.trim());

  const endpoint = `${WO_PATH(aircraftFk, adMonitoringFk)}paged?${params.toString()}`;
  let res: any;
  try {
    res = await apiClient.get(endpoint, {
      headers: { Accept: "application/json" },
    });
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      return { items: [], total: 0, page: 1, pages: 1 };
    }
    throw err;
  }

  const data = res.data?.data ?? res.data;
  const rawItems = Array.isArray(data)
    ? data
    : data?.items ?? data?.results ?? data?.data ?? [];
  const rawList = Array.isArray(rawItems) ? rawItems : [];
  const allItems = rawList
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

/**
 * Create.
 * POST api/v1/aircraft/{aircraftId}/ad_monitoring/{adMonitoringId}/work-order-ad-monitoring/
 */
export const createWorkOrderAdMonitoring = async (
  aircraftFk: number,
  adMonitoringFk: number,
  data: WorkOrderAdMonitoringCreate
): Promise<WorkOrderAdMonitoring> => {
  const payload = toApiPayload(data, adMonitoringFk);
  const res = await apiClient.post(
    WO_PATH(aircraftFk, adMonitoringFk),
    payload,
    {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    }
  );
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  if (res.status === 201) {
    return {
      id: (res.data as any)?.id ?? 0,
      woNumber: String(payload.work_order_number),
      lastDoneAftt: payload.last_done_aftt as number,
      lastDoneTach: payload.last_done_tach as number,
      lastDoneDate: (payload.last_done_date as string | null) ?? "",
      nextDueAftt: payload.next_due_aftt as number,
      nextDueTach: payload.next_due_tach as number,
      atlRef: String(payload.atl_ref),
    };
  }
  throw new Error("Invalid create response");
};

/**
 * Update Work Order.
 * PUT api/v1/work-order-ad-monitoring/{id}/
 */
export const updateWorkOrderAdMonitoring = async (
  _aircraftFk: number,
  _adMonitoringFk: number,
  id: number,
  data: WorkOrderAdMonitoringUpdate
): Promise<WorkOrderAdMonitoring> => {
  const payload = toApiPayload(data);

  const res = await apiClient.put(`work-order-ad-monitoring/${id}/`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  return {
    id,
    woNumber: String(payload.work_order_number),
    lastDoneAftt: payload.last_done_aftt as number,
    lastDoneTach: payload.last_done_tach as number,
    lastDoneDate: (payload.last_done_date as string | null) ?? "",
    nextDueAftt: payload.next_due_aftt as number,
    nextDueTach: payload.next_due_tach as number,
    atlRef: String(payload.atl_ref),
  };
};

/**
 * Delete.
 * DELETE api/v1/aircraft/{aircraftId}/ad_monitoring/{adMonitoringId}/work-order-ad-monitoring/{id}/
 */
export const deleteWorkOrderAdMonitoring = async (
  aircraftFk: number,
  adMonitoringFk: number,
  id: number
): Promise<void> => {
  await apiClient.delete(
    `${WO_PATH(aircraftFk, adMonitoringFk)}${id}/`
  );
};
