import apiClient from "./index";

/**
 * Nested aircraft resource (OpenAPI):
 * GET    /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/paged
 * GET    /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/{nature_of_flight}
 * POST   /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/
 * PUT    /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/{entry_id}
 * DELETE /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/{entry_id}
 *
 * GET by numeric id is not aircraft-scoped — `{nature_of_flight}` is TypeEnum,
 * so GET .../nature-of-flight-descriptions/2 returns 422. Use:
 * GET    /api/v1/nature-of-flight-descriptions/{entry_id}
 *
 * Schema keys (snake_case): nature_of_flight, remarks, action_taken.
 * Aircraft-scoped create uses NatureOfFlightDescriptionAircraftCreate
 * (aircraft_fk comes from the path).
 */
const DESCRIPTIONS_PATH = (aircraftId: number) =>
  `aircraft/${aircraftId}/nature-of-flight-descriptions`;

const COLLECTION_PATH = "nature-of-flight-descriptions";

/** TypeEnum from nature-of-flight-description schema. */
export const NATURE_OF_FLIGHT_OPTIONS = [
  { value: "TR", label: "TR - Training Flight" },
  { value: "PSF", label: "PSF - Post Flight Inspection" },
  { value: "PRF", label: "PRF - Pre Flight Inspection" },
  { value: "EGR", label: "EGR - Engine Run-up" },
  { value: "ME", label: "ME - Maintenance Entry" },
  {
    value: "TR_WITH_PIREM",
    label: "TR W/ PIREM - Training Flight with Pilot Remarks",
  },
  { value: "VOID", label: "VOID - Void" },
  { value: "ATL_REPL", label: "ATL REPL" },
  { value: "CANCELLED_FLT", label: "CANCELLED FLT - Cancelled Flight" },
] as const;

export type NatureOfFlightType = (typeof NATURE_OF_FLIGHT_OPTIONS)[number]["value"];

const NATURE_OF_FLIGHT_ALIASES: Record<string, NatureOfFlightType> = {
  TR: "TR",
  PSF: "PSF",
  PRF: "PRF",
  EGR: "EGR",
  ME: "ME",
  TR_WITH_PIREM: "TR_WITH_PIREM",
  "TR W/ PIREM": "TR_WITH_PIREM",
  "TR WITH PIREM": "TR_WITH_PIREM",
  VOID: "VOID",
  ATL_REPL: "ATL_REPL",
  "ATL REPL": "ATL_REPL",
  CANCELLED_FLT: "CANCELLED_FLT",
  "CANCELLED FLT": "CANCELLED_FLT",
  "CANCELLED FLIGHT": "CANCELLED_FLT",
};

/** Normalize UI/API aliases to TypeEnum, or null when the value is not valid. */
export function toNatureOfFlightType(
  value: string | null | undefined
): NatureOfFlightType | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const underscored = upper.replace(/ /g, "_");
  return (
    NATURE_OF_FLIGHT_ALIASES[upper] ??
    NATURE_OF_FLIGHT_ALIASES[underscored] ??
    NATURE_OF_FLIGHT_OPTIONS.find((opt) => opt.value === raw)?.value ??
    null
  );
}

export type NatureOfFlightDescription = {
  id: number;
  aircraftId?: number;
  natureOfFlight: string;
  remarks: string;
  actionTaken: string;
};

export type NatureOfFlightDescriptionWrite = {
  natureOfFlight: string;
  remarks: string;
  actionTaken: string;
};

export type PaginatedNatureOfFlightDescriptionResponse = {
  items: NatureOfFlightDescription[];
  total: number;
  page: number;
  pages: number;
};

function pickStr(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  for (const key of keys) {
    const value = raw[key];
    if (value != null) return String(value);
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function normalizeNatureOfFlightDescription(
  raw: unknown
): NatureOfFlightDescription {
  const r = asRecord(raw);
  const aircraftObj = asRecord(r.aircraft);
  const aircraftIdRaw =
    r.aircraft_fk ??
    r.aircraftFk ??
    r.aircraft_id ??
    r.aircraftId ??
    aircraftObj.id;
  const aircraftIdNum = Number(aircraftIdRaw);

  return {
    id: Number(r.id ?? r.pk ?? 0) || 0,
    aircraftId: Number.isFinite(aircraftIdNum) ? aircraftIdNum : undefined,
    natureOfFlight:
      toNatureOfFlightType(pickStr(r, ["nature_of_flight", "natureOfFlight"])) ??
      pickStr(r, ["nature_of_flight", "natureOfFlight"]),
    remarks: pickStr(r, ["remarks"]),
    actionTaken: pickStr(r, ["action_taken", "actionTaken"]),
  };
}

const WRITE_FIELD_MAP: Record<string, keyof NatureOfFlightDescriptionWrite> = {
  nature_of_flight: "natureOfFlight",
  natureOfFlight: "natureOfFlight",
  remarks: "remarks",
  action_taken: "actionTaken",
  actionTaken: "actionTaken",
};

/** Map FastAPI 422 `detail` items onto form fields. */
export function natureOfFlightApiFieldErrors(
  err: unknown
): Partial<Record<keyof NatureOfFlightDescriptionWrite, string>> {
  const detail = (err as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  if (!Array.isArray(detail)) return {};

  const next: Partial<Record<keyof NatureOfFlightDescriptionWrite, string>> = {};
  for (const item of detail) {
    if (!item || typeof item !== "object") continue;
    const row = item as { loc?: unknown; msg?: unknown };
    const loc = Array.isArray(row.loc) ? row.loc.map(String) : [];
    const fieldKey = [...loc].reverse().find((part) => WRITE_FIELD_MAP[part]);
    const field = fieldKey ? WRITE_FIELD_MAP[fieldKey] : undefined;
    const msg = typeof row.msg === "string" ? row.msg.trim() : "";
    if (field && msg && !next[field]) next[field] = msg;
  }
  return next;
}

/** Aircraft-scoped body: nature_of_flight (TypeEnum), remarks, action_taken. */
function toApiPayload(
  data: NatureOfFlightDescriptionWrite
): Record<string, unknown> {
  const nature = toNatureOfFlightType(data.natureOfFlight);
  if (!nature) {
    throw Object.assign(new Error("Nature of Flight is required."), {
      response: {
        status: 422,
        data: {
          detail: [
            {
              loc: ["body", "nature_of_flight"],
              msg: "Nature of Flight must be a valid type (e.g. TR, PRF, PSF).",
            },
          ],
        },
      },
    });
  }
  return {
    nature_of_flight: nature,
    remarks: data.remarks.trim(),
    action_taken: data.actionTaken.trim(),
  };
}

function unwrapBody(data: unknown): unknown {
  if (data != null && typeof data === "object" && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    if (
      rec.data != null &&
      typeof rec.data === "object" &&
      !Array.isArray(rec.data)
    ) {
      return rec.data;
    }
  }
  return data;
}

/**
 * GET /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/paged
 */
export const getNatureOfFlightDescriptions = async (
  aircraftId: number,
  page = 1,
  limit = 10
): Promise<PaginatedNatureOfFlightDescriptionResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  const res = await apiClient.get(
    `${DESCRIPTIONS_PATH(aircraftId)}/paged?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );

  const data = unwrapBody(res.data);
  const rec = asRecord(data);
  const rawItems = Array.isArray(data)
    ? data
    : rec.items ?? rec.results ?? rec.data ?? [];
  const list = Array.isArray(rawItems) ? rawItems : [];
  const items = list
    .filter((item) => item != null)
    .map((item) => normalizeNatureOfFlightDescription(item));

  const isPaginated =
    !Array.isArray(data) &&
    (rec.total != null || rec.count != null || rec.pages != null);

  if (isPaginated) {
    const total = Number(rec.total ?? rec.count ?? items.length);
    const pageNum = Number(rec.page ?? page);
    const limitUsed = Number(rec.limit ?? limit);
    const pages = Number(
      rec.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1)))
    );
    return { items, total, page: pageNum, pages };
  }

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit) || 1);
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    pages,
  };
};

/**
 * GET /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/{nature_of_flight}
 * Example: GET /api/v1/aircraft/1/nature-of-flight-descriptions/PRF
 *
 * Returns null when no matching description exists (404 / empty body).
 */
export const getNatureOfFlightDescriptionByNature = async (
  aircraftId: number,
  natureOfFlight: string
): Promise<NatureOfFlightDescription | null> => {
  const nature = toNatureOfFlightType(natureOfFlight);
  if (!Number.isFinite(aircraftId) || aircraftId <= 0 || !nature) {
    return null;
  }

  const res = await apiClient.get(
    `${DESCRIPTIONS_PATH(aircraftId)}/${encodeURIComponent(nature)}`,
    {
      headers: { Accept: "application/json" },
      // Path param is TypeEnum: invalid codes are 422, missing rows are 404.
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 404 || status === 422,
    }
  );

  if (res.status === 404 || res.status === 422) return null;

  const raw = unwrapBody(res.data);
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const item = normalizeNatureOfFlightDescription(raw);
  if (!item.natureOfFlight) item.natureOfFlight = nature;
  return item;
};

/**
 * GET /api/v1/nature-of-flight-descriptions/{entry_id}
 *
 * Aircraft-scoped GET uses `{nature_of_flight}` (TypeEnum), not `{entry_id}`.
 */
export const getNatureOfFlightDescriptionById = async (
  _aircraftId: number,
  entryId: number
): Promise<NatureOfFlightDescription> => {
  const res = await apiClient.get(`${COLLECTION_PATH}/${entryId}`, {
    headers: { Accept: "application/json" },
  });
  const raw = unwrapBody(res.data);
  if (raw == null || typeof raw !== "object") {
    throw new Error("Description not found.");
  }
  return normalizeNatureOfFlightDescription(raw);
};

/**
 * POST /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/
 */
export const createNatureOfFlightDescription = async (
  aircraftId: number,
  data: NatureOfFlightDescriptionWrite
): Promise<NatureOfFlightDescription> => {
  const payload = toApiPayload(data);
  const res = await apiClient.post(`${DESCRIPTIONS_PATH(aircraftId)}/`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  const raw = unwrapBody(res.data);
  if (raw != null && typeof raw === "object") {
    return normalizeNatureOfFlightDescription(raw);
  }
  if (res.status === 201) {
    return normalizeNatureOfFlightDescription({
      id: asRecord(res.data).id ?? 0,
      ...payload,
    });
  }
  throw new Error("Invalid create response");
};

/**
 * PUT /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/{entry_id}
 */
export const updateNatureOfFlightDescription = async (
  aircraftId: number,
  entryId: number,
  data: NatureOfFlightDescriptionWrite
): Promise<NatureOfFlightDescription> => {
  const payload = toApiPayload(data);
  const res = await apiClient.put(
    `${DESCRIPTIONS_PATH(aircraftId)}/${entryId}`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  const raw = unwrapBody(res.data);
  if (raw != null && typeof raw === "object") {
    return normalizeNatureOfFlightDescription(raw);
  }
  return normalizeNatureOfFlightDescription({ id: entryId, ...payload });
};

/**
 * DELETE /api/v1/aircraft/{aircraft_id}/nature-of-flight-descriptions/{entry_id}
 */
export const deleteNatureOfFlightDescription = async (
  aircraftId: number,
  entryId: number
): Promise<void> => {
  await apiClient.delete(`${DESCRIPTIONS_PATH(aircraftId)}/${entryId}`);
};
