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

/** Required ATL numeric prerequisites: finite number and not zero (0.00 blocks Add Record / ATL). */
export function isMissingComponentHoursForAtl(value: unknown): boolean {
  if (value == null || value === "") return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  return n === 0;
}

/** Engine/Prop TSN: required on aircraft; must be a finite number ≥ 0 (0.00 is valid). */
export function isMissingTsnForAtlPrerequisite(value: unknown): boolean {
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
  if (isMissingComponentHoursForAtl(resolveAircraftAirframeAftt(aircraft))) {
    missing.push("Airframe AFTT");
  }
  if (
    isMissingTsnForAtlPrerequisite(
      resolveAircraftEnginePropHour(aircraft, "engineTsn")
    )
  ) {
    missing.push("Engine TSN");
  }
  if (
    isMissingComponentHoursForAtl(
      resolveAircraftEnginePropHour(aircraft, "engineTso")
    )
  ) {
    missing.push("Engine TSO");
  }
  if (
    isMissingTsnForAtlPrerequisite(
      resolveAircraftEnginePropHour(aircraft, "propellerTsn")
    )
  ) {
    missing.push("Propeller TSN");
  }
  if (
    isMissingComponentHoursForAtl(
      resolveAircraftEnginePropHour(aircraft, "propellerTso")
    )
  ) {
    missing.push("Propeller TSO");
  }
  return missing;
}

function formatAircraftDetailAlertValue(value: unknown): string {
  if (value == null || value === "") return "0.00";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
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
    '<p style="margin:0 0 1em 0"><strong>Complete required fields:</strong> Lifetime Limits & Airframe AFTT must be valid. Engine/Propeller TSN cannot be empty (0 allowed). Engine/Propeller TSO must be greater than 0.</p>' +
    '<div style="text-align:left;line-height:1.65">' +
    list +
    "</div>"
  );
}
