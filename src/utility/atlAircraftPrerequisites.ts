import type { Aircraft } from "../types/Aircraft";

export const ATL_AIRCRAFT_DETAILS_REQUIRED_TITLE = "Aircraft Details Required";

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

/** Engine / propeller TSO required: finite number and not zero (0.00 blocks Add Record / ATL). TSN is not gated. */
export function isMissingComponentHoursForAtl(value: unknown): boolean {
  if (value == null || value === "") return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  return n === 0;
}

/** All prerequisites before creating/editing ATL from aircraft master data. */
export function getMissingAircraftFieldsForNewAtl(
  aircraft: Aircraft | null | undefined
): string[] {
  const a = (aircraft ?? {}) as Record<string, unknown>;
  const missing: string[] = [];
  const engineLimit =
    aircraft?.engineLifeTimeLimit ?? a.life_time_limit_engine;
  const propellerLimit =
    aircraft?.propellerLifeTimeLimit ?? a.life_time_limit_propeller;
  if (isMissingLifeLimitForAtl(engineLimit)) {
    missing.push("Engine Life Time Limit");
  }
  if (isMissingLifeLimitForAtl(propellerLimit)) {
    missing.push("Propeller Life Time Limit");
  }
  if (
    isMissingComponentHoursForAtl(
      resolveAircraftEnginePropHour(aircraft, "engineTso")
    )
  ) {
    missing.push("Engine TSO");
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
  const engineLimit =
    aircraft?.engineLifeTimeLimit ?? a.life_time_limit_engine;
  const propellerLimit =
    aircraft?.propellerLifeTimeLimit ?? a.life_time_limit_propeller;
  const engineTso = resolveAircraftEnginePropHour(aircraft, "engineTso");
  const propellerTso = resolveAircraftEnginePropHour(aircraft, "propellerTso");

  const rows: [string, string][] = [
    ["Engine Life Time Limit", formatAircraftDetailAlertValue(engineLimit)],
    [
      "Propeller Life Time Limit",
      formatAircraftDetailAlertValue(propellerLimit),
    ],
    ["Engine TSO", formatAircraftDetailAlertValue(engineTso)],
    ["Propeller TSO", formatAircraftDetailAlertValue(propellerTso)],
  ];

  const list = rows.map(([label, val]) => `${label}: ${val}`).join("<br/>");

  return (
    '<p style="margin:0 0 0.75em 0"><strong>Engine and Propeller Details Must Be Completed</strong></p>' +
    '<p style="margin:0 0 1em 0">ATL entry cannot be created until all required values are provided. Life time limits cannot be 0 or empty. <strong>Engine TSO</strong> and <strong>Propeller TSO</strong> must each be a non-zero value (not 0.00). Engine TSN and Propeller TSN are optional.</p>' +
    '<div style="text-align:left;line-height:1.65">' +
    list +
    "</div>"
  );
}
