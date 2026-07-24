import apiClient from "./index";
import { Aircraft } from "../types/Aircraft";
import { toCamel, toCamelDeep } from "../utility/utils";

/**
 * Normalized maintenance snapshot for TCC / monitoring UIs.
 * Built from GET /aircraft/{id}/details/ whether the API returns a nested or flat body.
 */
export type AircraftMaintenanceDetails = {
  registration?: string | null;
  msn?: string | null;
  engineSerialNumber?: string | null;
  propellerSerialNumber?: string | null;
  tachometerEnd?: string | number | null;
  airframeAftt?: string | number | null;
  engineTsn?: string | number | null;
  engineTbo?: string | number | null;
  engineTso?: string | number | null;
  propellerTsn?: string | number | null;
  propellerTbo?: string | number | null;
  propellerTso?: string | number | null;
  /** Latest ATL sequence when provided under `atl` */
  sequenceNo?: string | null;
};

/**
 * API body shape (after `toCamelDeep`):
 * {
 *   aircraft: { aircraftId, registration, msn, engineSerialNumber, propellerSerialNumber },
 *   atl: { tachometerEnd, airframeAftt, engineTsn, engineTbo, engineTso, propellerTsn, propellerTbo, propellerTso, sequenceNo }
 * }
 */
type AircraftDetailsNestedCamel = {
  aircraft?: {
    aircraftId?: number;
    registration?: string | null;
    msn?: string | null;
    engineSerialNumber?: string | null;
    propellerSerialNumber?: string | null;
  };
  atl?: {
    tachometerEnd?: string | number | null;
    airframeAftt?: string | number | null;
    engineTsn?: string | number | null;
    engineTbo?: string | number | null;
    engineTso?: string | number | null;
    propellerTsn?: string | number | null;
    propellerTbo?: string | number | null;
    propellerTso?: string | number | null;
    sequenceNo?: string | null;
  };
};

function normalizeAircraftDetailsPayload(
  raw: Record<string, unknown>
): AircraftMaintenanceDetails {
  const deep = toCamelDeep(raw) as AircraftDetailsNestedCamel &
    AircraftMaintenanceDetails;

  const { aircraft, atl, ...rest } = deep;

  if (aircraft != null || atl != null) {
    return {
      registration: aircraft?.registration ?? null,
      msn: aircraft?.msn ?? null,
      engineSerialNumber: aircraft?.engineSerialNumber ?? null,
      propellerSerialNumber: aircraft?.propellerSerialNumber ?? null,
      tachometerEnd: atl?.tachometerEnd ?? null,
      airframeAftt: atl?.airframeAftt ?? null,
      engineTsn: atl?.engineTsn ?? null,
      engineTbo: atl?.engineTbo ?? null,
      engineTso: atl?.engineTso ?? null,
      propellerTsn: atl?.propellerTsn ?? null,
      propellerTbo: atl?.propellerTbo ?? null,
      propellerTso: atl?.propellerTso ?? null,
      sequenceNo: atl?.sequenceNo ?? null,
    };
  }

  return rest as AircraftMaintenanceDetails;
}

/**
 * GET /api/v1/aircraft/{aircraft_id}/details/
 *
 * Supports nested `{ aircraft, atl }` and legacy flat objects.
 */
export const getAircraftDetails = async (
  aircraftId: number
): Promise<AircraftMaintenanceDetails> => {
  const response = await apiClient.get(`aircraft/${aircraftId}/details/`);
  const raw = response.data?.data ?? response.data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return normalizeAircraftDetailsPayload(raw as Record<string, unknown>);
};

export const getAircrafts = (
  page = 1,
  limit = 10,
  search = "",
  status = "",
  sortParam = ""
) => {
  const params = new URLSearchParams();

  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (search.trim() !== "") {
    params.append("search", search);
  }

  if (status && status !== "all") {
    params.append("status", status);
  }

  if (sortParam) {
    params.append("sort", sortParam);
  }

  return apiClient.get(`aircraft/paged?${params.toString()}`);
};

export const getAircraftAll = (page = 1, limit = 10, search = "") =>
  apiClient.get(`aircraft/paged?limit=${limit}&page=${page}&search=${search}`);

export const getAircraftList = () => apiClient.get("aircraft/list");

export type AircraftListItem = {
  id: number;
  registration: string;
  displayOrder: number;
};

export type AircraftReorderItem = {
  aircraft_id: number;
  display_order: number;
};

export type AircraftReorderRequest = {
  items: AircraftReorderItem[];
};

export type AircraftReorderResponse = {
  items: AircraftListItem[];
};

function normalizeAircraftListItem(raw: unknown): AircraftListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const camel = toCamel(o) as Record<string, unknown>;
  const id = Number(camel.id ?? o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const displayOrder = Number(
    camel.displayOrder ?? o.display_order ?? o.displayOrder ?? 0
  );
  return {
    id,
    registration: String(camel.registration ?? o.registration ?? ""),
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
  };
}

/**
 * Minimal active fleet ordered by display_order (unpaginated).
 * GET api/v1/aircraft/list
 */
export async function getAircraftListOrdered(): Promise<AircraftListItem[]> {
  const response = await getAircraftList();
  const data = response.data?.data ?? response.data;
  const rawList = Array.isArray(data)
    ? data
    : data?.items ?? data?.results ?? data?.data ?? [];
  const list = Array.isArray(rawList) ? rawList : [];
  return list
    .map(normalizeAircraftListItem)
    .filter((item): item is AircraftListItem => item != null)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
}

/**
 * Persist shared aircraft display_order for Fleet Profile and Daily Update.
 * PUT api/v1/aircraft/reorder
 * Body: { items: [{ aircraft_id, display_order }, ...] } — complete active set, 1..N.
 */
export async function reorderAircraft(
  payload: AircraftReorderRequest
): Promise<AircraftReorderResponse> {
  const response = await apiClient.put("aircraft/reorder", payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const data = response.data?.data ?? response.data;
  const rawItems = Array.isArray(data)
    ? data
    : data?.items ?? data?.results ?? [];
  const items = (Array.isArray(rawItems) ? rawItems : [])
    .map(normalizeAircraftListItem)
    .filter((item): item is AircraftListItem => item != null);
  return { items };
}

/**
 * Fetch every active aircraft in display_order for arrangement-mode DnD.
 * Prefers /aircraft/list; falls back to aggregating /aircraft/paged.
 */
export async function getAllAircraftOrdered(): Promise<AircraftListItem[]> {
  try {
    const list = await getAircraftListOrdered();
    if (list.length > 0) return list;
  } catch {
    // fall through to paged aggregation
  }

  const pageLimit = 100;
  const first = await getAircrafts(1, pageLimit, "", "all", "");
  const data = first.data ?? {};
  const rawItems = data.items ?? data.results ?? data.data ?? [];
  let items = (Array.isArray(rawItems) ? rawItems : [])
    .map(normalizeAircraftListItem)
    .filter((item): item is AircraftListItem => item != null);
  const total = Number(data.total ?? data.count ?? items.length);
  const pages = Math.max(
    1,
    Number(data.pages ?? Math.ceil(total / pageLimit)) || 1
  );
  for (let page = 2; page <= pages; page += 1) {
    const res = await getAircrafts(page, pageLimit, "", "all", "");
    const pageData = res.data ?? {};
    const pageRaw = pageData.items ?? pageData.results ?? pageData.data ?? [];
    const pageItems = (Array.isArray(pageRaw) ? pageRaw : [])
      .map(normalizeAircraftListItem)
      .filter((item): item is AircraftListItem => item != null);
    items = items.concat(pageItems);
  }
  return items.sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id - b.id
  );
}

export type AircraftArrangementRow = {
  id: number;
  registration: string;
  model?: string;
  msn?: string;
  base?: string;
  status?: string;
  displayOrder?: number;
};

function normalizeArrangementRow(raw: unknown): AircraftArrangementRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const camel = toCamel(o) as Record<string, unknown>;
  const id = Number(camel.id ?? o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const displayOrder = Number(
    camel.displayOrder ?? o.display_order ?? o.displayOrder ?? 0
  );
  return {
    id,
    registration: String(camel.registration ?? o.registration ?? ""),
    model: String(camel.model ?? o.model ?? ""),
    msn: String(camel.msn ?? o.msn ?? ""),
    base: String(camel.base ?? o.base ?? ""),
    status: String(camel.status ?? o.status ?? ""),
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : undefined,
  };
}

/**
 * Full aircraft rows in display_order for Arrange Aircraft mode (no pagination).
 */
export async function getAllAircraftForArrangement(): Promise<
  AircraftArrangementRow[]
> {
  const pageLimit = 100;
  const first = await getAircrafts(1, pageLimit, "", "all", "");
  const data = first.data ?? {};
  const rawItems = data.items ?? data.results ?? data.data ?? [];
  let items = (Array.isArray(rawItems) ? rawItems : [])
    .map(normalizeArrangementRow)
    .filter((item): item is AircraftArrangementRow => item != null);
  const total = Number(data.total ?? data.count ?? items.length);
  const pages = Math.max(
    1,
    Number(data.pages ?? Math.ceil(total / pageLimit)) || 1
  );
  for (let page = 2; page <= pages; page += 1) {
    const res = await getAircrafts(page, pageLimit, "", "all", "");
    const pageData = res.data ?? {};
    const pageRaw = pageData.items ?? pageData.results ?? pageData.data ?? [];
    const pageItems = (Array.isArray(pageRaw) ? pageRaw : [])
      .map(normalizeArrangementRow)
      .filter((item): item is AircraftArrangementRow => item != null);
    items = items.concat(pageItems);
  }
  return items.sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id
  );
}
// export const updateAircraft = async (id: number, data: any) => {
//   try {
//     const response = await apiClient.put<Aircraft>(`/aircraft/${id}`, data);
//     return toCamel(response.data);
//   } catch (error) {
//     // rethrow to be handled by caller
//     throw error;
//   }
// };

export const updateAircraft = async (id: number, formData: FormData) => {
  try {
    const response = await apiClient.put<Aircraft>(`/aircraft/${id}`, formData);
    return toCamel(response.data);
  } catch (error) {
    // rethrow to be handled by caller
    throw error;
  }
};

export const getAircraftById = (id: number) => apiClient.get(`/aircraft/${id}`);

export interface AircraftHistoryRow {
  [key: string]: unknown;
}

export interface AircraftHistoryPagedResponse {
  items: AircraftHistoryRow[];
  total: number;
  page: number;
  pages: number;
}

/**
 * GET /api/v1/aircraft/{aircraft_id}/history?limit=10&page=1
 */
export const getAircraftHistory = async (
  aircraftId: number,
  page = 1,
  limit = 10
): Promise<AircraftHistoryPagedResponse> => {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("page", String(page));

  const response = await apiClient.get(
    `aircraft/${aircraftId}/history?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
    }
  );

  const data = response.data?.data ?? response.data ?? {};
  const dataObj =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const rawList =
    dataObj.results ??
    dataObj.items ??
    dataObj.data ??
    (Array.isArray(data) ? data : []);
  const list = Array.isArray(rawList) ? rawList.filter(Boolean) : [];
  const items = list.map((item) =>
    toCamelDeep(item as Record<string, unknown>)
  ) as AircraftHistoryRow[];

  const total = Number(dataObj.count ?? dataObj.total ?? items.length);
  const currentPage = Number(dataObj.page ?? page);
  const pages = Number(
    dataObj.pages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)))
  );

  return {
    items,
    total,
    page: Number.isFinite(currentPage) ? currentPage : page,
    pages: Number.isFinite(pages) ? pages : 1,
  };
};
// export const createAircraft = (data: any) => apiClient.post("/aircrafts", data);
export const deleteAircraft = (id: number) =>
  apiClient.delete(`aircraft/${id}`);

export const createAircraft = async (formData: FormData) => {
  try {
    const response = await apiClient.post("/aircraft/", formData);
    return toCamel(response.data);
  } catch (error) {
    throw error;
  }
};

export const createReportAircraft = async (data: any): Promise<Blob> => {
  try {
    const response = await apiClient.post("aircraft/reports/excel", data, {
      responseType: "blob", // <- important
    });
    return response.data; // Axios returns the blob here
  } catch (error) {
    throw error;
  }
};

export const createReportPDFAircraft = async (
  data: any, // request payload
  headers: Record<string, string> = {} // optional headers
): Promise<Blob> => {
  try {
    const response = await apiClient.post("aircraft/reports/pdf", data, {
      headers, // headers go inside the third argument
      responseType: "blob", // important to get PDF as Blob
    });

    return response.data; // Blob of the PDF
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

/**
 * Import aircraft from Excel file.
 * POST api/v1/excel-data/aircraft/import
 */
export const importAircraftExcel = async (file: File): Promise<{ data?: unknown }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("excel-data/aircraft/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data ?? response;
};
