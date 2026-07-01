import type { Aircraft } from "../types/Aircraft";

export const ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE = "Aircraft Details Required";

/** Flat or nested aircraft payload (after toCamel / toCamelDeep). */
export function resolveAircraftAirframeAftt(
  aircraft: Aircraft | null | undefined
): unknown {
  const a = (aircraft ?? {}) as Record<string, unknown>;
  const nestedAirframe =
    a.airframe && typeof a.airframe === "object"
      ? (a.airframe as Record<string, unknown>)
      : null;
  const nestedAircraftInfo =
    a.aircraftInformation && typeof a.aircraftInformation === "object"
      ? (a.aircraftInformation as Record<string, unknown>)
      : null;
  return (
    aircraft?.airframeAftt ??
    a.airframeAftt ??
    a.airframe_aftt ??
    a.aftt ??
    nestedAirframe?.aftt ??
    nestedAirframe?.airframeAftt ??
    nestedAirframe?.airframe_aftt ??
    nestedAircraftInfo?.airframeAftt ??
    nestedAircraftInfo?.airframe_aftt
  );
}

/** Flat or nested aircraft payload (after toCamel / toCamelDeep). */
export function resolveAircraftEnginePropHour(
  aircraft: Aircraft | null | undefined,
  field: "engineTso" | "engineTsn" | "propellerTso" | "propellerTsn"
): unknown {
  const a = (aircraft ?? {}) as Record<string, unknown>;
  const nestedEngine =
    a.engine && typeof a.engine === "object"
      ? (a.engine as Record<string, unknown>)
      : null;
  const nestedPropeller =
    a.propeller && typeof a.propeller === "object"
      ? (a.propeller as Record<string, unknown>)
      : null;

  switch (field) {
    case "engineTso":
      return (
        a.engineTso ??
        a.engine_tso ??
        nestedEngine?.tso ??
        nestedEngine?.engineTso ??
        nestedEngine?.engine_tso
      );
    case "engineTsn":
      return (
        a.engineTsn ??
        a.engine_tsn ??
        nestedEngine?.tsn ??
        nestedEngine?.engineTsn ??
        nestedEngine?.engine_tsn
      );
    case "propellerTso":
      return (
        a.propellerTso ??
        a.propeller_tso ??
        nestedPropeller?.tso ??
        nestedPropeller?.propellerTso ??
        nestedPropeller?.propeller_tso
      );
    case "propellerTsn":
      return (
        a.propellerTsn ??
        a.propeller_tsn ??
        nestedPropeller?.tsn ??
        nestedPropeller?.propellerTsn ??
        nestedPropeller?.propeller_tsn
      );
    default:
      return undefined;
  }
}

export function isMissingLifeLimitForAtl(value: unknown): boolean {
  return value == null || value === "" || Number(value) === 0;
}

/** Required hours fields: finite number ≥ 0 (0 is valid; blank/null is not). */
export function isMissingRequiredHoursAllowZero(value: unknown): boolean {
  if (value == null || value === "") return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  return n < 0;
}

/** All prerequisites before creating/editing ATL from aircraft master data. */
export function getMissingAircraftFieldsForNewAtl(
  aircraft: Aircraft | null | undefined
): string[] {
  const a = (aircraft ?? {}) as Record<string, unknown>;
  const missing: string[] = [];
  const engineLimit = aircraft?.engineLifeTimeLimit ?? a.life_time_limit_engine;
  const propellerLimit =
    aircraft?.propellerLifeTimeLimit ?? a.life_time_limit_propeller;
  if (isMissingLifeLimitForAtl(engineLimit)) {
    missing.push("Engine Life Time Limit");
  }
  if (isMissingLifeLimitForAtl(propellerLimit)) {
    missing.push("Propeller Life Time Limit");
  }
  if (isMissingRequiredHoursAllowZero(resolveAircraftAirframeAftt(aircraft))) {
    missing.push("Airframe AFTT");
  }
  if (
    isMissingRequiredHoursAllowZero(
      resolveAircraftEnginePropHour(aircraft, "engineTsn")
    )
  ) {
    missing.push("Engine TSN");
  }
  if (
    isMissingRequiredHoursAllowZero(
      resolveAircraftEnginePropHour(aircraft, "engineTso")
    )
  ) {
    missing.push("Engine TSO");
  }
  if (
    isMissingRequiredHoursAllowZero(
      resolveAircraftEnginePropHour(aircraft, "propellerTsn")
    )
  ) {
    missing.push("Propeller TSN");
  }
  if (
    isMissingRequiredHoursAllowZero(
      resolveAircraftEnginePropHour(aircraft, "propellerTso")
    )
  ) {
    missing.push("Propeller TSO");
  }
  return missing;
}

function formatAircraftDetailAlertValue(value: unknown): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export function buildAircraftDetailsRequiredForAtlHtml(
  aircraft: Aircraft | null | undefined
): string {
  const a = (aircraft ?? {}) as Record<string, unknown>;
  const engineLimit = aircraft?.engineLifeTimeLimit ?? a.life_time_limit_engine;
  const propellerLimit =
    aircraft?.propellerLifeTimeLimit ?? a.life_time_limit_propeller;
  const airframeAftt = resolveAircraftAirframeAftt(aircraft);
  const engineTsn = resolveAircraftEnginePropHour(aircraft, "engineTsn");
  const engineTso = resolveAircraftEnginePropHour(aircraft, "engineTso");
  const propellerTsn = resolveAircraftEnginePropHour(aircraft, "propellerTsn");
  const propellerTso = resolveAircraftEnginePropHour(aircraft, "propellerTso");

  const rows: [string, string][] = [
    ["Engine Life Time Limit", formatAircraftDetailAlertValue(engineLimit)],
    [
      "Propeller Life Time Limit",
      formatAircraftDetailAlertValue(propellerLimit),
    ],
    ["Airframe AFTT", formatAircraftDetailAlertValue(airframeAftt)],
    ["Engine TSN", formatAircraftDetailAlertValue(engineTsn)],
    ["Engine TSO", formatAircraftDetailAlertValue(engineTso)],
    ["Propeller TSN", formatAircraftDetailAlertValue(propellerTsn)],
    ["Propeller TSO", formatAircraftDetailAlertValue(propellerTso)],
  ];

  const list = rows.map(([label, val]) => `${label}: ${val}`).join("<br/>");

  return (
    '<p style="margin:0 0 0.75em 0"><strong>Complete Engine & Propeller Details</strong></p>' +
    '<p style="margin:0 0 1em 0"><strong>Complete required fields:</strong> Lifetime Limits must be valid. Airframe AFTT, Engine TSN/TSO, and Propeller TSN/TSO cannot be blank (0 is allowed).</p>' +
    '<div style="text-align:left;line-height:1.65">' +
    list +
    "</div>"
  );
}
