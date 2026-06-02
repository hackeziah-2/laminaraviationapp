import apiClient from "./index";
import { searchAircraftTechnicalLogBySequence } from "./aircraftTechnicalLogApi";

/** Human-readable nature of flight for dropdowns (matches technical log vocabulary). */
export function formatNatureOfFlightForDisplay(
  nature: string | undefined | null
): string {
  if (nature == null || String(nature).trim() === "") return "—";
  const n = String(nature).trim();
  if (n === "VOID") return "VOID";
  const mapping: Record<string, string> = {
    TR: "TR - Training Flight",
    PSF: "PSF - Post Flight Inspection",
    PRF: "PRF - Pre Flight Inspection",
    EGR: "EGR - Engine Run-up",
    ME: "ME - Maintenance Entry",
    TR_WITH_PIREM: "TR W/ PIREM - Training Flight with Pilot Remarks",
    ATL_REPL: "ATL REPL",
    VE: "VE - Vehicle",
    EOR: "EOR - End of Run",
    OTHER: "OTHER",
  };
  return mapping[n] ?? n;
}

/** Options for ATL list/search row formatting */
export interface AtlListOptions {
  /**
   * CPCP / TCC ATL picker: show each result as
   * `Seq No.: {sequence}: TACH: …  AFTT: …  DATE: …`
   * Default keeps `Sequence · Nature · Registration` for other screens.
   */
  resultLineStyle?: "standard" | "cpcp";
}

function displayAtlField(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  if (s === "" || s === "-" || s === "—") return "—";
  return s;
}

/** Numeric TACH/AFTT for CPCP Last Done autofill (undefined when absent). */
function cpcpNumericForForm(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim().replace(/,/g, "");
  if (s === "" || s === "—" || s === "-") return undefined;
  const n = Number(s);
  if (Number.isFinite(n)) return String(n);
  return s || undefined;
}

/** `origin_date` → `YYYY-MM-DD` for DateInput / API. */
function cpcpDateForLastDoneField(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  const str = String(v).trim();
  if (!str || str === "—" || str === "-") return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return str;
}

function cpcpAutofillFromRaw(
  lineStyle: "standard" | "cpcp",
  tachRaw: unknown,
  afttRaw: unknown,
  originDateRaw: unknown
): Partial<
  Pick<AtlItem, "cpcpLastDoneTach" | "cpcpLastDoneAftt" | "cpcpLastDoneDate">
> {
  if (lineStyle !== "cpcp") return {};
  const out: Partial<
    Pick<AtlItem, "cpcpLastDoneTach" | "cpcpLastDoneAftt" | "cpcpLastDoneDate">
  > = {};
  const t = cpcpNumericForForm(tachRaw);
  if (t != null) out.cpcpLastDoneTach = t;
  const a = cpcpNumericForForm(afttRaw);
  if (a != null) out.cpcpLastDoneAftt = a;
  const d = cpcpDateForLastDoneField(originDateRaw);
  if (d) out.cpcpLastDoneDate = d;
  return out;
}

/**
 * CPCP / TCC ATL picker search result line.
 * `Seq No.: {sequence}: TACH: tachometer_end  AFTT: auto_airframe_aftt  DATE: origin_date`
 */
export function buildAtlCpcpSearchLabel(
  sequenceNo: string,
  tachometerEnd: unknown,
  autoAirframeAftt: unknown,
  originDate: unknown
): string {
  const seq = String(sequenceNo ?? "").trim() || "—";
  return `SEQ NO.: ${seq}: TACH: ${displayAtlField(
    tachometerEnd
  )}  AFTT: ${displayAtlField(autoAirframeAftt)}  DATE: ${displayAtlField(
    originDate
  )}`;
}

export interface AtlItem {
  id: number;
  sequenceNo?: string;
  code?: string;
  reference?: string;
  /** Single-line summary: Sequence · Nature of Flight · A/C Registration (when known) */
  label: string;
  /** Raw API value for nature of flight */
  natureOfFlight?: string;
  /** Same as formatNatureOfFlightForDisplay(natureOfFlight) when present */
  natureOfFlightDisplay?: string;
  /** Aircraft registration when returned on the ATL row */
  aircraftRegistration?: string;
  /** CPCP picker: autofill Last Done from selected ATL row (only when `resultLineStyle: "cpcp"`). */
  cpcpLastDoneTach?: string;
  cpcpLastDoneAftt?: string;
  cpcpLastDoneDate?: string;
}

const ATL_PATH = "atl/";

/**
 * Get list of ATL for select/search dropdown. Search uses sequence number.
 * GET api/v1/atl/?sequence_number=&search=  or  api/v1/aircraft/{id}/atl/?...
 * With aircraft id and empty search, sends limit=50 for recent rows (backend may ignore unknown params).
 */
export const getAtlList = async (
  sequenceNumber = "",
  aircraftId?: number,
  listOptions?: AtlListOptions
): Promise<AtlItem[]> => {
  const lineStyle = listOptions?.resultLineStyle ?? "standard";
  const params = new URLSearchParams();
  const q = sequenceNumber.trim();
  if (q) {
    params.append("sequence_number", q);
    params.append("search", q);
  } else if (aircraftId != null && aircraftId > 0) {
    params.append("limit", "50");
  }
  const url =
    aircraftId != null && aircraftId > 0
      ? `aircraft/${aircraftId}/atl/?${params.toString()}`
      : `${ATL_PATH}?${params.toString()}`;
  try {
    const res = await apiClient.get(url, {
      headers: { Accept: "application/json" },
    });
    const data = res.data?.data ?? res.data;
    const raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map((r: any) => {
      const id = r.id ?? r.pk ?? 0;
      const seqNo = r.sequence_no ?? r.sequence_number ?? r.sequenceNo ?? "";
      const code = r.code ?? r.atl_code ?? "";
      const ref = r.reference ?? r.atl_ref ?? r.atl_reference ?? "";
      const aircraftRaw = r.aircraft ?? r.aircraft_fk;
      const reg =
        typeof aircraftRaw === "object" && aircraftRaw != null
          ? String(
              aircraftRaw.registration ??
                aircraftRaw.registration_mark ??
                aircraftRaw.ident ??
                ""
            ).trim()
          : String(
              r.aircraft_registration ?? r.ac_reg ?? r.registration ?? ""
            ).trim();
      const natureRaw = String(
        r.nature_of_flight ?? r.natureOfFlight ?? ""
      ).trim();
      const natureOfFlightDisplay = formatNatureOfFlightForDisplay(
        natureRaw || undefined
      );
      const seqPart =
        seqNo || [code, ref].filter(Boolean).join(" - ") || String(id);
      const tachRaw =
        r.tachometer_end ?? r.tachometerEnd ?? r.tach_end ?? r.tachEnd;
      const afttRaw =
        r.auto_airframe_aftt ??
        r.autoAirframeAftt ??
        r.airframe_aftt ??
        r.airframeAftt;
      const originDateRaw =
        r.origin_date ?? r.originDate ?? r.date_of_origin ?? r.dateOfOrigin;
      const label =
        lineStyle === "cpcp"
          ? buildAtlCpcpSearchLabel(seqPart, tachRaw, afttRaw, originDateRaw)
          : `${seqPart} · ${natureOfFlightDisplay} · ${reg || "—"}`;
      return {
        id,
        sequenceNo: seqNo,
        code,
        reference: ref,
        label,
        natureOfFlight: natureRaw || undefined,
        natureOfFlightDisplay,
        aircraftRegistration: reg || undefined,
        ...cpcpAutofillFromRaw(lineStyle, tachRaw, afttRaw, originDateRaw),
      };
    });
  } catch {
    return [];
  }
};

/**
 * ATL picker for TCC (and similar): aircraft-scoped ATL list, then fallback to
 * aircraft-technical-log search when the ATL endpoint returns no rows.
 */
export const searchAtlOptionsForTcc = async (
  sequenceOrSearch: string,
  aircraftId?: number,
  listOptions?: AtlListOptions
): Promise<AtlItem[]> => {
  const q = sequenceOrSearch.trim();
  const aid =
    aircraftId != null &&
    Number.isFinite(Number(aircraftId)) &&
    Number(aircraftId) > 0
      ? Number(aircraftId)
      : undefined;

  const primary = await getAtlList(q, aid, listOptions);
  if (primary.length > 0) return primary;

  if (!q || !aid) return [];

  try {
    const tech = await searchAircraftTechnicalLogBySequence(q);
    const filtered = tech.filter((t) => t.id > 0 && t.aircraft?.id === aid);
    const lineStyle = listOptions?.resultLineStyle ?? "standard";
    return filtered.map((t) => {
      const seq = String(t.sequenceNo ?? "").trim() || String(t.id);
      const natureDisplay = formatNatureOfFlightForDisplay(t.natureOfFlight);
      const reg = (t.aircraft?.registration ?? "").trim() || "—";
      const label =
        lineStyle === "cpcp"
          ? buildAtlCpcpSearchLabel(
              seq,
              t.tachometerEnd,
              t.autoAirframeAftt,
              t.originDate
            )
          : `${seq} · ${natureDisplay} · ${reg}`;
      return {
        id: t.id,
        sequenceNo: String(t.sequenceNo ?? "").trim(),
        label,
        natureOfFlight: t.natureOfFlight,
        natureOfFlightDisplay: natureDisplay,
        aircraftRegistration: reg !== "—" ? reg : undefined,
        ...cpcpAutofillFromRaw(
          lineStyle,
          t.tachometerEnd,
          t.autoAirframeAftt,
          t.originDate
        ),
      };
    });
  } catch {
    return [];
  }
};
