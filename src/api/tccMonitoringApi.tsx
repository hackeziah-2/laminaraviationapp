import apiClient from "./index";
import { DEFAULT_API_PAGE_SIZE } from "../constants/pagination";
import { appendPagedQueryParams } from "../utils/pagedQuery";

export interface TCCMonitoring {
  id: number;
  remaining: string;
  date: string;
  when: string;
  aftt: string;
  partNo: string;
  serialNo: string;
  description: string;
  limitHours: string; // COMPONENT LIMIT: Hours
  limitYears: string; // COMPONENT LIMIT: Years
  methodOfCompliance: string;
  lastDoneDate: string;
  /** LAST DONE TACH - from API last_done_tach */
  lastDoneYear: string;
  lastDoneTach?: string;
  lastDoneAftt: string;
  lastDoneMethodOfCompliance?: string;
  nextDueDate: string;
  nextDueYear: string;
  nextDueAftt: string;
  reference: string;
  category?: string;
  /** ATL row id when API returns nested atl or numeric FK */
  atlId?: number;
  /** 1-based persistent row order (display_order) */
  displayOrder?: number;
  /**
   * From GET profile/{id}/maintenance-tcc/paged — server-computed remaining / next due.
   * When present, list UI prefers these over client-side formulas.
   */
  remainingYears?: number | null;
  remainingDays?: number | null;
  remainingTach?: number | null;
  remainingAftt?: number | null;
}

export interface TCCReorderItem {
  id: number;
  display_order: number;
}

export interface TCCReorderRequest {
  items: TCCReorderItem[];
}

export interface TCCReorderResponse {
  items: TCCMonitoring[];
}

export interface TCCMonitoringCreate {
  category: string;
  partNo?: string;
  serialNo?: string;
  description?: string;
  limitHours?: string;
  limitYears?: string;
  methodOfCompliance?: string;
  lastDoneDate?: string;
  lastDoneYear?: string;
  lastDoneAftt?: string;
  lastDoneMethodOfCompliance?: string;
  nextDueDate?: string;
  nextDueYear?: string;
  nextDueAftt?: string;
  reference?: string;
  sequenceNumber?: string;
  atlId?: number;
}

export interface TCCMonitoringUpdate {
  category?: string;
  partNo?: string;
  serialNo?: string;
  description?: string;
  limitHours?: string;
  limitYears?: string;
  methodOfCompliance?: string;
  lastDoneDate?: string;
  lastDoneYear?: string;
  /** Same source as last_done_tach when sent from the form */
  lastDoneTach?: string;
  lastDoneAftt?: string;
  lastDoneMethodOfCompliance?: string;
  nextDueDate?: string;
  nextDueYear?: string;
  nextDueAftt?: string;
  /** ATL Reference: sequence_number (string) */
  reference?: string;
  sequenceNumber?: string;
  /** ATL Reference ID: Use this for atl_ref if updating the relationship */
  atlId?: number;
}

export interface PaginatedTCCResponse {
  items: TCCMonitoring[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Profile-scoped Maintenance TCC.
 * api/v1/profile/{id}/maintenance-tcc
 *
 * `{id}` is the aircraft profile id from `/profile/:id/maintenance-tcc`,
 * not the TCC row id. Row id is only appended for update and delete.
 */
function maintenanceTccPath(profileId: number): string {
  const id = Number(profileId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("A valid profile ID is required.");
  }
  return `profile/${id}/maintenance-tcc`;
}

/**
 * TCC Maintenance CRUD field mapping (backend ↔ UI):
 *   path {id}       ← Aircraft profile ID from /profile/:id/maintenance-tcc
 *   aircraft_fk     ← Same profile ID (backend aircraft foreign key)
 *   category        ← Form category (POWERPLANT → "Powerplant", etc.)
 *   part_number     ← Form "Part Number" → partNo
 *   serial_number   ← Form "Serial Number" → serialNo
 *   description     ← Form "Description"
 *   component_limit_years  ← Form "Time/Distance (Years)" → limitYears
 *   component_limit_hours   ← Form "Component Limit (Hours)" → limitHours
 *   component_method_of_compliance ← Form "Method of Compliance"
 */
function parseNullableNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeItem(raw: any): TCCMonitoring {
  const r = raw ?? {};
  const numStr = (v: any) => (v != null && v !== "" ? String(v) : "");
  const atlObj = r.atl;
  const atlId =
    typeof atlObj?.id === "number"
      ? atlObj.id
      : typeof r.atl_fk === "number"
        ? r.atl_fk
        : typeof r.atl_ref === "number"
          ? r.atl_ref
          : undefined;
  return {
    id: r.id ?? r.pk ?? 0,
    remaining: "",
    date: "",
    when: "",
    aftt: "",
    partNo: numStr(r.part_number ?? r.part_no ?? r.partNo),
    serialNo: numStr(r.serial_number ?? r.serial_no ?? r.serialNo),
    description: numStr(r.description),
    limitHours: numStr(r.component_limit_hours ?? r.limitHours ?? r.hours),
    limitYears: numStr(r.component_limit_years ?? r.limitYears ?? r.threshold),
    methodOfCompliance: numStr(
      r.component_method_of_compliance ??
        r.method_of_compliance ??
        r.methodOfCompliance
    ),
    lastDoneDate: numStr(r.last_done_date ?? r.lastDoneDate),
    lastDoneYear: numStr(
      r.last_done_tach ?? r.last_done_year ?? r.lastDoneYear
    ),
    lastDoneTach: numStr(
      r.last_done_tach ?? r.lastDoneTach ?? r.last_done_year ?? r.lastDoneYear
    ) || undefined,
    lastDoneAftt: numStr(r.last_done_aftt ?? r.lastDoneAftt),
    lastDoneMethodOfCompliance:
      numStr(
        r.last_done_method_of_compliance ?? r.lastDoneMethodOfCompliance
      ) || undefined,
    nextDueDate: numStr(r.next_due_date ?? r.nextDueDate),
    nextDueYear: numStr(r.next_due_tach ?? r.next_due_year ?? r.nextDueYear),
    nextDueAftt: numStr(r.next_due_aftt ?? r.nextDueAftt),
    reference: numStr(
      r.atl?.sequence_no ?? r.atl?.sequence_number ?? r.atl_ref
    ),
    category: r.category ?? undefined,
    atlId,
    displayOrder: (() => {
      const n = parseNullableNumber(r.display_order ?? r.displayOrder);
      return n != null && n >= 1 ? n : undefined;
    })(),
    remainingYears: parseNullableNumber(
      r.remaining_years ?? r.remainingYears
    ),
    remainingDays: parseNullableNumber(
      r.remaining_days ?? r.remainingDays
    ),
    remainingTach: parseNullableNumber(
      r.remaining_tach ?? r.remainingTach
    ),
    remainingAftt: parseNullableNumber(
      r.remaining_aftt ?? r.remainingAftt
    ),
  };
}

/**
 * List Maintenance TCC for a profile (paged), optional category filter.
 * GET api/v1/profile/{id}/maintenance-tcc/paged?limit=&page=&search=&category=
 *
 * Paged items may include server fields (snake_case or camelCase):
 * remaining_years, remaining_days, remaining_tach, remaining_aftt,
 * next_due_date, next_due_tach, next_due_aftt — mapped into TCCMonitoring and
 * preferred in the list table over client-side calculations.
 */
export const getAircraftTccMonitoring = async (
  profileId: number,
  page = 1,
  limit = DEFAULT_API_PAGE_SIZE,
  search = "",
  category?: string
): Promise<PaginatedTCCResponse> => {
  const params = new URLSearchParams();
  appendPagedQueryParams(params, page, limit);
  if (search.trim()) params.append("search", search.trim());
  const c = category?.trim();
  if (c) {
    const categoryMap: Record<string, string> = {
      POWERPLANT: "Powerplant",
      AIRFRAME: "Airframe",
      PROPELLER: "Propeller",
      INSPECTION_SERVICING: "Inspection Servicing",
    };
    const value = categoryMap[c.toUpperCase()] ?? c;
    params.append("category", value);
  }

  const endpoint = `${maintenanceTccPath(profileId)}/paged?${params.toString()}`;
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
  const list = Array.isArray(rawItems) ? rawItems : [];
  const items = list.filter((x: any) => x != null).map(normalizeItem);

  const isPaginated =
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    (data.total != null || data.count != null || data.pages != null);

  if (isPaginated) {
    const total = data.total ?? data.count ?? items.length;
    const pageNum = data.page ?? page;
    const limitUsed = data.page_size ?? data.limit ?? limit;
    const pages = data.pages ?? Math.max(1, Math.ceil(total / limitUsed));
    return { items, total, page: pageNum, pages };
  }

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, page, pages };
};

/**
 * Create TCC entry.
 * POST api/v1/profile/{id}/maintenance-tcc
 * Payload: aircraft_fk (profile id), category, part_number, serial_number, description, component_limit_years, component_limit_hours, component_method_of_compliance
 */
export const createAircraftTccMonitoring = async (
  profileId: number,
  data: TCCMonitoringCreate
): Promise<TCCMonitoring> => {
  const num = (v: string | undefined) => {
    if (v == null || String(v).trim() === "") return null;
    const n = parseFloat(String(v).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: string | undefined) => (v ?? "").trim() || null;
  const numOrZero = (v: string | undefined) => num(v) ?? 0;
  const categoryMap: Record<string, string> = {
    POWERPLANT: "Powerplant",
    AIRFRAME: "Airframe",
    PROPELLER: "Propeller",
    INSPECTION_SERVICING: "Inspection Servicing",
  };
  const categoryValue = str(data.category);
  const category = categoryValue
    ? categoryMap[categoryValue.toUpperCase()] ?? categoryValue
    : null;
  const payload: any = {
    aircraft_fk: profileId,
    category,
    part_number: str(data.partNo) ?? null,
    serial_number: str(data.serialNo) ?? null,
    description: str(data.description) ?? null,
    component_limit_years: num(data.limitYears) ?? null,
    component_limit_hours: num(data.limitHours) ?? null,
    component_method_of_compliance: str(data.methodOfCompliance) ?? null,
  };

  if (data.lastDoneDate) payload.last_done_date = str(data.lastDoneDate);
  const lastDoneTachVal = (data as any).lastDoneTach ?? data.lastDoneYear;
  if (lastDoneTachVal !== undefined && lastDoneTachVal !== null && String(lastDoneTachVal).trim() !== "")
    payload.last_done_tach = numOrZero(String(lastDoneTachVal));
  if (data.lastDoneAftt) payload.last_done_aftt = numOrZero(data.lastDoneAftt);
  if (data.lastDoneMethodOfCompliance)
    payload.last_done_method_of_compliance = str(
      data.lastDoneMethodOfCompliance
    );

  const atlIdNum =
    data.atlId != null && Number.isFinite(Number(data.atlId))
      ? Number(data.atlId)
      : NaN;
  if (Number.isFinite(atlIdNum) && atlIdNum > 0) {
    payload.atl_ref = atlIdNum;
  } else {
    const seqNum = str(data.sequenceNumber ?? data.reference);
    if (seqNum !== null) payload.sequence_number = seqNum;
  }

  const res = await apiClient.post(maintenanceTccPath(profileId), payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  if (res.status === 201) {
    return normalizeItem({ id: (res.data as any)?.id ?? 0, ...payload });
  }
  throw new Error("Invalid create response");
};

/**
 * Update TCC entry.
 * PUT api/v1/profile/{id}/maintenance-tcc/{tccId}
 * `{id}` is the profile id. `{tccId}` is the TCC row id.
 * Payload includes: atl_ref, last_done_date, last_done_tach, last_done_aftt, last_done_method_of_compliance (Edit fields).
 */
export const updateAircraftTccMonitoring = async (
  profileId: number,
  id: number,
  data: TCCMonitoringUpdate
): Promise<TCCMonitoring> => {
  const num = (v: string | undefined) => {
    if (v == null || String(v).trim() === "") return null;
    const n = parseFloat(String(v).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  };
  const numOrZero = (v: string | undefined) => num(v) ?? 0;
  const str = (v: string | undefined) => (v ?? "").trim() || null;
  const categoryMap: Record<string, string> = {
    POWERPLANT: "Powerplant",
    AIRFRAME: "Airframe",
    PROPELLER: "Propeller",
    INSPECTION_SERVICING: "Inspection Servicing",
  };
  let category: string | null = null;
  if (data.category) {
      const c = str(data.category);
      if (c) category = categoryMap[c.toUpperCase()] ?? c;
  }

  const payload: Record<string, string | number | null> = {
    part_number: str(data.partNo) ?? null,
    serial_number: str(data.serialNo) ?? null,
    description: str(data.description) ?? null,
    component_limit_years: num(data.limitYears) ?? null,
    component_limit_hours: num(data.limitHours) ?? null,
    component_method_of_compliance: str(data.methodOfCompliance) ?? null,
  };
  
  if (category) payload.category = category;
  if (data.lastDoneDate !== undefined)
    payload.last_done_date = str(data.lastDoneDate);
  const lastDoneTachVal = data.lastDoneTach ?? data.lastDoneYear;
  if (
    lastDoneTachVal !== undefined &&
    lastDoneTachVal !== null &&
    String(lastDoneTachVal).trim() !== ""
  )
    payload.last_done_tach = numOrZero(String(lastDoneTachVal));
  if (data.lastDoneAftt !== undefined)
    payload.last_done_aftt = numOrZero(data.lastDoneAftt);

  const atlIdNum =
    data.atlId != null && Number.isFinite(Number(data.atlId))
      ? Number(data.atlId)
      : NaN;
  if (Number.isFinite(atlIdNum) && atlIdNum > 0) {
    payload.atl_ref = atlIdNum;
  } else {
    const seqNum = str(data.sequenceNumber ?? data.reference);
    if (seqNum !== null) payload.sequence_number = seqNum;
  }

  if (data.lastDoneMethodOfCompliance !== undefined)
    payload.last_done_method_of_compliance = str(
      data.lastDoneMethodOfCompliance
    );
  const res = await apiClient.put(
    `${maintenanceTccPath(profileId)}/${id}`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  return normalizeItem({ id, ...payload });
};

/**
 * Delete TCC entry.
 * DELETE api/v1/profile/{id}/maintenance-tcc/{tccId}
 */
export const deleteAircraftTccMonitoring = async (
  profileId: number,
  id: number
): Promise<void> => {
  await apiClient.delete(`${maintenanceTccPath(profileId)}/${id}`);
};

/**
 * Persist TCC row arrangement for one aircraft.
 * PUT api/v1/maintenance-tcc/reorder
 * Body: { items: [{ id, display_order }, ...] } — complete active set, 1..N.
 */
export const reorderAircraftTccMonitoring = async (
  payload: TCCReorderRequest
): Promise<TCCReorderResponse> => {
  const res = await apiClient.put("maintenance-tcc/reorder", payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const data = res.data?.data ?? res.data;
  const rawItems = Array.isArray(data)
    ? data
    : data?.items ?? data?.results ?? [];
  const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeItem);
  return { items };
};

const TCC_PAGE_LIMIT = 100;

/**
 * Fetch every active TCC row for a profile in display_order (unpaginated collection).
 * Used for arrangement-mode drag-and-drop so global display_order stays unique.
 */
export const getAllAircraftTccMonitoring = async (
  profileId: number,
  search = "",
  category?: string
): Promise<PaginatedTCCResponse> => {
  const first = await getAircraftTccMonitoring(
    profileId,
    1,
    TCC_PAGE_LIMIT,
    search,
    category
  );
  let items = first.items.slice();
  const total = first.total;
  const pages = Math.max(
    first.pages,
    Math.ceil(total / TCC_PAGE_LIMIT) || 1
  );
  for (let page = 2; page <= pages; page++) {
    const next = await getAircraftTccMonitoring(
      profileId,
      page,
      TCC_PAGE_LIMIT,
      search,
      category
    );
    items = items.concat(next.items);
  }
  return { items, total, page: 1, pages: 1 };
};
