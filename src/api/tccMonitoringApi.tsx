import apiClient from "./index";

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
  lastDoneYear: string;
  lastDoneAftt: string;
  lastDoneMethodOfCompliance?: string;
  nextDueDate: string;
  nextDueYear: string;
  nextDueAftt: string;
  reference: string;
  category?: string;
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

const TCC_PATH = (aircraftId: number) =>
  `aircraft/${aircraftId}/tcc-maintenance/`;

/**
 * TCC Maintenance CRUD field mapping (backend ↔ UI):
 *   aircraft_fk     ← Aircraft ID from route (useParams)
 *   category        ← Form category (POWERPLANT → "Powerplant", etc.)
 *   part_number     ← Form "Part Number" → partNo
 *   serial_number   ← Form "Serial Number" → serialNo
 *   description     ← Form "Description"
 *   component_limit_years  ← Form "Time/Distance (Years)" → limitYears
 *   component_limit_hours   ← Form "Component Limit (Hours)" → limitHours
 *   component_method_of_compliance ← Form "Method of Compliance"
 */
function normalizeItem(raw: any): TCCMonitoring {
  const r = raw ?? {};
  const numStr = (v: any) => (v != null && v !== "" ? String(v) : "");
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
    lastDoneAftt: numStr(r.last_done_aftt ?? r.lastDoneAftt),
    lastDoneMethodOfCompliance:
      numStr(
        r.last_done_method_of_compliance ?? r.lastDoneMethodOfCompliance
      ) || undefined,
    nextDueDate: numStr(r.next_due_date ?? r.nextDueDate),
    nextDueYear: numStr(r.next_due_tach ?? r.next_due_year ?? r.nextDueYear),
    nextDueAftt: numStr(r.next_due_aftt ?? r.nextDueAftt),
    reference: numStr(r.atl?.sequence_no ?? r.atl_ref),
    category: r.category ?? undefined,
  };
}

/**
 * List TCC Monitoring for an aircraft (paged), optional category filter.
 * GET api/v1/aircraft/{aircraft_id}/tcc-maintenance/paged?limit=&page=&search=&category=
 */
export const getAircraftTccMonitoring = async (
  aircraftId: number,
  page = 1,
  limit = 10,
  search = "",
  category?: string
): Promise<PaginatedTCCResponse> => {
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("limit", String(limit));
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

  const endpoint = `${TCC_PATH(aircraftId)}paged?${params.toString()}`;
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
    const limitUsed = data.limit ?? limit;
    const pages = data.pages ?? Math.max(1, Math.ceil(total / limitUsed));
    return { items, total, page: pageNum, pages };
  }

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, page, pages };
};

/**
 * Create TCC entry (tcc_maintenance).
 * POST api/v1/aircraft/{aircraft_id}/tcc-maintenance/
 * Payload: aircraft_fk, category, part_number, serial_number, description, component_limit_years, component_limit_hours, component_method_of_compliance
 */
export const createAircraftTccMonitoring = async (
  aircraftId: number,
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
    aircraft_fk: aircraftId,
    category,
    part_number: str(data.partNo) ?? null,
    serial_number: str(data.serialNo) ?? null,
    description: str(data.description) ?? null,
    component_limit_years: num(data.limitYears) ?? null,
    component_limit_hours: num(data.limitHours) ?? null,
    component_method_of_compliance: str(data.methodOfCompliance) ?? null,
  };

  if (data.lastDoneDate) payload.last_done_date = str(data.lastDoneDate);
  if (data.lastDoneYear) payload.last_done_tach = numOrZero(data.lastDoneYear);
  if (data.lastDoneAftt) payload.last_done_aftt = numOrZero(data.lastDoneAftt);
  if (data.lastDoneMethodOfCompliance) 
    payload.last_done_method_of_compliance = str(data.lastDoneMethodOfCompliance);

  if (data.atlId !== undefined) {
    payload.atl_ref = data.atlId;
  } else {
     const seqNum = str(data.sequenceNumber ?? data.reference);
     if (seqNum !== null) {
       payload.sequence_number = seqNum;
     }
  }
   const seqNum = str(data.sequenceNumber ?? data.reference);
   if (seqNum !== null) payload.sequence_number = seqNum;

  const res = await apiClient.post(TCC_PATH(aircraftId), payload, {
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
 * Update TCC entry. PUT api/v1/aircraft/{aircraft_id}/tcc-maintenance/{id}/
 * Payload includes: atl_ref, last_done_date, last_done_tach, last_done_aftt, last_done_method_of_compliance (Edit fields).
 */
export const updateAircraftTccMonitoring = async (
  aircraftId: number,
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
    payload.last_done_date = str(data.lastDoneDate) ?? "";
  if (data.lastDoneYear !== undefined)
    payload.last_done_tach = numOrZero(data.lastDoneYear);
  if (data.lastDoneAftt !== undefined)
    payload.last_done_aftt = numOrZero(data.lastDoneAftt);

  if (data.atlId !== undefined) {
    // If atlId provided, use it for atl_ref (Foreign Key)
    payload.atl_ref = data.atlId;
  } else {
      const seqNum = str(data.sequenceNumber ?? data.reference);
      if (seqNum !== null) {
        payload.sequence_number = seqNum;
        // If no ID, maybe we still send sequence string? Or user wants ID mostly.
        // Let's keep sequence_number as string for display/search, but atl_ref should be ID if possible.
        // If atlId is missing, we don't force atl_ref to be string if it expects ID.
        // But let's follow the previous logic as fallback:
        // payload.atl_ref = seqNum; // CAREFUL: strict typing might fail if backend expects Int.
        // User said: "apply value to be a id of atl_ref".
        // Use atlId if available. If not, maybe avoid sending atl_ref as string if it expects ID.
        // I will assume if atlId is not provided, we don't update atl_ref via ID.
      }
  }
  // Also send sequence_number string if available (for display fallback?)
  const seqNum = str(data.sequenceNumber ?? data.reference);
  if (seqNum !== null) payload.sequence_number = seqNum;

  if (data.lastDoneMethodOfCompliance !== undefined)
    payload.last_done_method_of_compliance =
      str(data.lastDoneMethodOfCompliance) ?? "";
  const res = await apiClient.put(`${TCC_PATH(aircraftId)}${id}/`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = res.data?.data ?? res.data;
  if (raw != null) return normalizeItem(raw);
  return normalizeItem({ id, ...payload });
};

/**
 * Delete TCC entry.
 * DELETE api/v1/aircraft/{aircraft_id}/tcc-maintenance/{id}/
 */
export const deleteAircraftTccMonitoring = async (
  aircraftId: number,
  id: number
): Promise<void> => {
  await apiClient.delete(`${TCC_PATH(aircraftId)}${id}/`);
};
