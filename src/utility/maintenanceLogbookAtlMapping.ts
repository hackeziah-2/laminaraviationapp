/** Display token for missing ATL engine_tsn / propeller_tsn. Never persist this string. */
export const ATL_TSN_UNKNOWN = "UNK";

/** ATL row fields used to populate Maintenance Logbook Create/Edit forms. */
export interface AtlLogbookSource {
  engineTsn?: string | number | null;
  engineTso?: string | number | null;
  engineTbo?: string | number | null;
  propellerTsn?: string | number | null;
  propellerTso?: string | number | null;
  propellerTbo?: string | number | null;
  airframeAftt?: string | number | null;
}

export interface MaintenanceLogbookAtlMappedFields {
  engineTsn: string;
  engineTso: string;
  engineTbo: string;
  propellerTsn: string;
  propellerTso: string;
  propellerTbo: string;
  airframeTime: string;
  airframeTsn: string;
}

export const EMPTY_MAINTENANCE_LOGBOOK_ATL_FIELDS: MaintenanceLogbookAtlMappedFields =
  {
    engineTsn: "",
    engineTso: "",
    engineTbo: "",
    propellerTsn: "",
    propellerTso: "",
    propellerTbo: "",
    airframeTime: "",
    airframeTsn: "",
  };

function isMissingAtlMappedValue(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  return s === "" || /^(null|undefined)$/i.test(s);
}

/** engine_tsn / propeller_tsn: null or empty → "UNK". 0 is kept. */
export function mapAtlTsnToLogbookField(value: unknown): string {
  if (isMissingAtlMappedValue(value)) return ATL_TSN_UNKNOWN;
  return String(value).trim();
}

/** TSO / TBO / airframe_aftt: missing → blank (do not substitute UNK). */
export function mapAtlOptionalMetricToLogbookField(value: unknown): string {
  if (isMissingAtlMappedValue(value)) return "";
  return String(value).trim();
}

export function mapAtlToMaintenanceLogbookFields(
  atl: AtlLogbookSource
): MaintenanceLogbookAtlMappedFields {
  return {
    engineTsn: mapAtlTsnToLogbookField(atl.engineTsn),
    engineTso: mapAtlOptionalMetricToLogbookField(atl.engineTso),
    engineTbo: mapAtlOptionalMetricToLogbookField(atl.engineTbo),
    propellerTsn: mapAtlTsnToLogbookField(atl.propellerTsn),
    propellerTso: mapAtlOptionalMetricToLogbookField(atl.propellerTso),
    propellerTbo: mapAtlOptionalMetricToLogbookField(atl.propellerTbo),
    // Airframe Time (AIRFRAME) and Airframe TSN (AVIONICS) both come from airframe_aftt.
    airframeTime: mapAtlOptionalMetricToLogbookField(atl.airframeAftt),
    airframeTsn: mapAtlOptionalMetricToLogbookField(atl.airframeAftt),
  };
}

/** Empty / "UNK" → undefined so the display token is never sent to the API. */
export function parseLogbookOptionalNumber(
  value: string | undefined | null
): number | undefined {
  if (value == null) return undefined;
  const t = String(value).trim();
  if (!t || t.toUpperCase() === ATL_TSN_UNKNOWN) return undefined;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}
