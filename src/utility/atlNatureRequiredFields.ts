import { toNatureOfFlightType } from "../api/natureOfFlightDescriptionsApi";

export const ATL_REQUIRED_FIELD_MESSAGE = "This field is required.";

export type AtlNatureRequiredFieldKey =
  | "tachometerEnd"
  | "hobbsMeterEnd"
  | "offBlocksDate"
  | "offBlocksTime"
  | "rtsSignedBy"
  | "rtsDate"
  | "rtsTime"
  | "pilotFk"
  | "pilotAcceptDate"
  | "pilotAcceptTime";

const TACH_HOBBS_NATURES = new Set(["TR", "TR_WITH_PIREM", "EGR"]);
const PRF_NATURES = new Set(["PRF"]);

const FIELD_ALIASES: Record<AtlNatureRequiredFieldKey, string[]> = {
  tachometerEnd: ["tachometerEnd", "tachometer_end", "tachEnd", "tach_end"],
  hobbsMeterEnd: ["hobbsMeterEnd", "hobbs_meter_end", "hobbsEnd", "hobbs_end"],
  offBlocksDate: ["offBlocksDate", "off_blocks_date", "originDate", "origin_date"],
  offBlocksTime: ["offBlocksTime", "off_blocks_time", "originTime", "origin_time"],
  rtsSignedBy: ["rtsSignedBy", "rts_signed_by"],
  rtsDate: ["rtsDate", "rts_date"],
  rtsTime: ["rtsTime", "rts_time"],
  pilotFk: [
    "pilotFk",
    "pilot_fk",
    "pilotAcceptedBy",
    "pilot_accepted_by",
  ],
  pilotAcceptDate: ["pilotAcceptDate", "pilot_accept_date"],
  pilotAcceptTime: ["pilotAcceptTime", "pilot_accept_time"],
};

export const ATL_NATURE_REQUIRED_API_LOC: Record<
  AtlNatureRequiredFieldKey,
  string
> = {
  tachometerEnd: "tachometer_end",
  hobbsMeterEnd: "hobbs_meter_end",
  offBlocksDate: "origin_date",
  offBlocksTime: "origin_time",
  rtsSignedBy: "rts_signed_by",
  rtsDate: "rts_date",
  rtsTime: "rts_time",
  pilotFk: "pilot_accepted_by",
  pilotAcceptDate: "pilot_accept_date",
  pilotAcceptTime: "pilot_accept_time",
};

export function isAtlRequiredFieldBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "boolean") return false;
  const s = String(value).trim();
  return s === "";
}

function isMissingAssignee(value: unknown): boolean {
  if (isAtlRequiredFieldBlank(value)) return true;
  const s = String(value).trim();
  if (/^(none|null|undefined|no selected name)$/i.test(s)) return true;
  const n = Number.parseInt(s, 10);
  if (String(n) === s || /^-?\d+$/.test(s)) {
    return !Number.isFinite(n) || n <= 0;
  }
  return false;
}

function pickField(
  payload: Record<string, unknown>,
  key: AtlNatureRequiredFieldKey
): unknown {
  for (const alias of FIELD_ALIASES[key]) {
    if (Object.prototype.hasOwnProperty.call(payload, alias)) {
      return payload[alias];
    }
  }
  return undefined;
}

function hasNatureKey(payload: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(payload, "natureOfFlight") ||
    Object.prototype.hasOwnProperty.call(payload, "nature_of_flight")
  );
}

export function resolveAtlNatureForRequiredFields(
  payload: Record<string, unknown>,
  mode: "create" | "update"
): string | null {
  const raw = payload.natureOfFlight ?? payload.nature_of_flight;
  const normalized = toNatureOfFlightType(
    raw == null ? "" : String(raw)
  );
  if (normalized) return normalized;
  if (mode === "create") return "TR";
  if (!hasNatureKey(payload)) return null;
  return "TR";
}

export function natureRequiresTachHobbsEnd(
  natureOfFlight: string | null | undefined
): boolean {
  const nature = toNatureOfFlightType(natureOfFlight) ?? "";
  return TACH_HOBBS_NATURES.has(nature);
}

export function natureRequiresPrfDetails(
  natureOfFlight: string | null | undefined
): boolean {
  const nature = toNatureOfFlightType(natureOfFlight) ?? "";
  return PRF_NATURES.has(nature);
}

function requireField(
  errors: Partial<Record<AtlNatureRequiredFieldKey, string>>,
  payload: Record<string, unknown>,
  key: AtlNatureRequiredFieldKey,
  isBlank: (value: unknown) => boolean
) {
  if (isBlank(pickField(payload, key))) {
    errors[key] = ATL_REQUIRED_FIELD_MESSAGE;
  }
}

/**
 * Required fields by Nature of Flight (data-entry type).
 * Empty / null / missing values produce {@link ATL_REQUIRED_FIELD_MESSAGE}.
 */
export function collectAtlNatureRequiredFieldErrors(
  payload: Record<string, unknown>,
  mode: "create" | "update" = "create"
): Partial<Record<AtlNatureRequiredFieldKey, string>> {
  const errors: Partial<Record<AtlNatureRequiredFieldKey, string>> = {};
  const nature = resolveAtlNatureForRequiredFields(payload, mode);
  if (!nature) return errors;

  if (TACH_HOBBS_NATURES.has(nature)) {
    requireField(errors, payload, "tachometerEnd", isAtlRequiredFieldBlank);
    requireField(errors, payload, "hobbsMeterEnd", isAtlRequiredFieldBlank);
  }

  if (PRF_NATURES.has(nature)) {
    requireField(errors, payload, "offBlocksDate", isAtlRequiredFieldBlank);
    requireField(errors, payload, "offBlocksTime", isAtlRequiredFieldBlank);
    requireField(errors, payload, "rtsSignedBy", isMissingAssignee);
    requireField(errors, payload, "rtsDate", isAtlRequiredFieldBlank);
    requireField(errors, payload, "rtsTime", isAtlRequiredFieldBlank);
    requireField(errors, payload, "pilotFk", isMissingAssignee);
    requireField(errors, payload, "pilotAcceptDate", isAtlRequiredFieldBlank);
    requireField(errors, payload, "pilotAcceptTime", isAtlRequiredFieldBlank);
  }

  return errors;
}

export class AtlNatureRequiredFieldsError extends Error {
  readonly statusCode = 422;
  readonly fieldErrors: Partial<Record<AtlNatureRequiredFieldKey, string>>;

  constructor(
    fieldErrors: Partial<Record<AtlNatureRequiredFieldKey, string>>
  ) {
    const first = Object.values(fieldErrors)[0] ?? ATL_REQUIRED_FIELD_MESSAGE;
    super(first);
    this.name = "AtlNatureRequiredFieldsError";
    this.fieldErrors = fieldErrors;
  }
}

/** FastAPI-style 422 so list/modals surface loc + msg. */
export function atlNatureRequiredFieldsHttpError(
  fieldErrors: Partial<Record<AtlNatureRequiredFieldKey, string>>
): AtlNatureRequiredFieldsError {
  const err = new AtlNatureRequiredFieldsError(fieldErrors);
  const detail = Object.entries(fieldErrors).map(([field, msg]) => ({
    loc: ["body", ATL_NATURE_REQUIRED_API_LOC[field as AtlNatureRequiredFieldKey]],
    msg,
  }));
  Object.assign(err, {
    response: {
      status: 422,
      data: { detail },
    },
  });
  return err;
}

export function assertAtlNatureRequiredFields(
  payload: Record<string, unknown>,
  mode: "create" | "update"
): void {
  const fieldErrors = collectAtlNatureRequiredFieldErrors(payload, mode);
  if (Object.keys(fieldErrors).length > 0) {
    throw atlNatureRequiredFieldsHttpError(fieldErrors);
  }
}
