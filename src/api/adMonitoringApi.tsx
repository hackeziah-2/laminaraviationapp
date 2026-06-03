import apiClient from "./index";
import { normalizeWebLink } from "../utility/utils";

export interface ADMonitoring {
  id: number;
  adNumber: string;
  subject: string;
  status: string;
  inspectionInterval: string;
  compliDate: string;
  workOrders: number;
  dateViewed: string;
  webLink?: string | null;
}

export interface ADMonitoringCreate {
  adNumber: string;
  subject: string;
  inspectionInterval: string;
  compliDate: string;
  webLink?: string | null;
}

export interface ADMonitoringUpdate {
  adNumber?: string;
  subject?: string;
  inspectionInterval?: string;
  compliDate?: string;
  webLink?: string | null;
}

export interface PaginatedADResponse {
  items: ADMonitoring[];
  total: number;
  page: number;
  pages: number;
}

const AD_PATH = (aircraftId: number) => `aircraft/${aircraftId}/ad_monitoring/`;

function normalizeItem(raw: any): ADMonitoring {
  const r = raw ?? {};
  const compliDate =
    r.compli_date ??
    r.compliDate ??
    r.compliance_required ??
    r.complianceRequired ??
    "";
  const webLinkRaw = r.web_link ?? r.webLink;
  const webLink =
    webLinkRaw != null && String(webLinkRaw).trim() !== ""
      ? String(webLinkRaw).trim()
      : null;
  return {
    id: r.id ?? r.pk,
    adNumber: r.ad_number ?? r.adNumber ?? "",
    subject: r.subject ?? "",
    status: r.status ?? "Active",
    inspectionInterval: r.inspection_interval ?? r.inspectionInterval ?? "",
    compliDate:
      typeof compliDate === "string"
        ? compliDate
        : compliDate
        ? String(compliDate).slice(0, 10)
        : "",
    workOrders: Array.isArray(r.ad_works)
      ? r.ad_works.length
      : Number(r.workOrders ?? 0),
    dateViewed: r.date_viewed ?? r.dateViewed ?? "",
    webLink,
  };
}

export const getAircraftAdMonitoring = async (
  aircraftId: number,
  page = 1,
  limit = 10,
  search = ""
): Promise<PaginatedADResponse> => {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  params.append("page", String(page));
  if (search.trim()) params.append("search", search.trim());

  const endpoint = `${AD_PATH(aircraftId)}paged?${params.toString()}`;
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

export const getAircraftAdMonitoringById = async (
  aircraftId: number,
  id: number
): Promise<ADMonitoring> => {
  const res = await apiClient.get(`${AD_PATH(aircraftId)}${id}/`, {
    headers: { Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw == null) throw new Error("AD record not found");
  return normalizeItem(raw);
};

export const createAircraftAdMonitoring = async (
  aircraftId: number,
  data: ADMonitoringCreate
): Promise<ADMonitoring> => {
  const payload: Record<string, unknown> = {
    aircraft_fk: aircraftId,
    ad_number: String(data.adNumber ?? "").trim(),
    subject: String(data.subject ?? "").trim(),
    inspection_interval: String(data.inspectionInterval ?? "").trim(),
    compli_date: data.compliDate?.trim() || null,
    web_link: normalizeWebLink(data.webLink),
  };

  const res = await apiClient.post(AD_PATH(aircraftId), payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  if (res.status === 201) {
    return {
      id: (res.data as any)?.id ?? 0,
      adNumber: String(payload.ad_number),
      subject: String(payload.subject),
      status: "Active",
      inspectionInterval: String(payload.inspection_interval),
      compliDate: payload.compli_date
        ? String(payload.compli_date).slice(0, 10)
        : "",
      workOrders: 0,
      dateViewed: "",
      webLink: (payload.web_link as string | null) ?? null,
    };
  }
  throw new Error("Invalid create response");
};

export const updateAircraftAdMonitoring = async (
  aircraftId: number,
  id: number,
  data: ADMonitoringUpdate
): Promise<ADMonitoring> => {
  const payload: Record<string, unknown> = {
    aircraft_fk: aircraftId,
    ad_number: String(data.adNumber ?? "").trim(),
    subject: String(data.subject ?? "").trim(),
    inspection_interval: String(data.inspectionInterval ?? "").trim(),
    compli_date: data.compliDate?.trim() || null,
    web_link: normalizeWebLink(data.webLink),
  };

  const res = await apiClient.put(`${AD_PATH(aircraftId)}${id}/`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  return {
    id,
    adNumber: String(payload.ad_number),
    subject: String(payload.subject),
    status: "Active",
    inspectionInterval: String(payload.inspection_interval),
    compliDate: payload.compli_date
      ? String(payload.compli_date).slice(0, 10)
      : "",
    workOrders: 0,
    dateViewed: "",
    webLink: (payload.web_link as string | null) ?? null,
  };
};

export const deleteAircraftAdMonitoring = async (
  aircraftId: number,
  id: number
): Promise<void> => {
  await apiClient.delete(`${AD_PATH(aircraftId)}${id}/`);
};
