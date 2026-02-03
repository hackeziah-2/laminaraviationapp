import apiClient from "./index";

export interface WorkOrderAdMonitoring {
  id: number;
  woNumber: string;
  lastDoneActt: string | number;
  lastDoneTach: string | number;
  lastDoneDate: string;
  nextDoneActt: string | number;
  nextDueTach: string | number;
  atlRef: string;
}

export interface WorkOrderAdMonitoringCreate {
  woNumber: string;
  lastDoneActt: string | number;
  lastDoneTach: string | number;
  lastDoneDate: string;
  nextDoneActt: string | number;
  nextDueTach: string | number;
  atlRef: string;
}

export interface WorkOrderAdMonitoringUpdate {
  woNumber?: string;
  lastDoneActt?: string | number;
  lastDoneTach?: string | number;
  lastDoneDate?: string;
  nextDoneActt?: string | number;
  nextDueTach?: string | number;
  atlRef?: string;
}

export interface PaginatedWorkOrderResponse {
  items: WorkOrderAdMonitoring[];
  total: number;
  page: number;
  pages: number;
}

const WO_PATH = (aircraftFk: number, adMonitoringFk: number) =>
  `aircraft/${aircraftFk}/ad_monitoring/${adMonitoringFk}/work-order-ad-monitoring/`;

function normalizeItem(raw: any): WorkOrderAdMonitoring {
  const r = raw ?? {};
  return {
    id: r.id ?? r.pk,
    woNumber: r.work_order_number ?? r.wo_number ?? r.woNumber ?? "",
    lastDoneActt: r.last_done_actt ?? r.last_done_acft ?? r.lastDoneActt ?? "",
    lastDoneTach: r.last_done_tach ?? r.lastDoneTach ?? "",
    lastDoneDate: r.last_done_date ?? r.lastDoneDate ?? "",
    nextDoneActt: r.next_done_actt ?? r.next_due_acft ?? r.nextDoneActt ?? "",
    nextDueTach: r.tach ?? r.next_due_tach ?? r.nextDueTach ?? "",
    atlRef: r.atl_ref ?? r.atl_reference ?? r.atlRef ?? "",
  };
}

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

export const createWorkOrderAdMonitoring = async (
  aircraftFk: number,
  adMonitoringFk: number,
  data: WorkOrderAdMonitoringCreate
): Promise<WorkOrderAdMonitoring> => {
  const payload = {
    ad_monitoring_fk: adMonitoringFk,
    work_order_number: String(data.woNumber ?? "").trim(),
    last_done_actt: Number(data.lastDoneActt) || 0,
    last_done_tach: Number(data.lastDoneTach) || 0,
    last_done_date: data.lastDoneDate?.trim() || null,
    next_done_actt: Number(data.nextDoneActt) || 0,
    tach: Number(data.nextDueTach) || 0,
    atl_ref: String(data.atlRef ?? "").trim(),
  };
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
      lastDoneActt: payload.last_done_actt,
      lastDoneTach: payload.last_done_tach,
      lastDoneDate: payload.last_done_date ?? "",
      nextDoneActt: payload.next_done_actt,
      nextDueTach: payload.tach,
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
  const payload = {
    work_order_number: String(data.woNumber ?? "").trim(),
    last_done_actt: Number(data.lastDoneActt) || 0,
    last_done_tach: Number(data.lastDoneTach) || 0,
    last_done_date: data.lastDoneDate?.trim() || null,
    next_done_actt: Number(data.nextDoneActt) || 0,
    tach: Number(data.nextDueTach) || 0,
    atl_ref: String(data.atlRef ?? "").trim(),
  };

  const res = await apiClient.put(`work-order-ad-monitoring/${id}/`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  return {
    id,
    woNumber: payload.work_order_number,
    lastDoneActt: payload.last_done_actt,
    lastDoneTach: payload.last_done_tach,
    lastDoneDate: payload.last_done_date ?? "",
    nextDoneActt: payload.next_done_actt,
    nextDueTach: payload.tach,
    atlRef: payload.atl_ref,
  };
};

export const deleteWorkOrderAdMonitoring = async (
  aircraftFk: number,
  adMonitoringFk: number,
  id: number
): Promise<void> => {
  await apiClient.delete(
    `${WO_PATH(aircraftFk, adMonitoringFk)}${id}/`
  );
};
