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
}

const ATL_PATH = "atl/";

/**
 * Get list of ATL for select/search dropdown. Search uses sequence number.
 * GET api/v1/atl/?sequence_number=&search=  or  api/v1/aircraft/{id}/atl/?...
 * With aircraft id and empty search, sends limit=50 for recent rows (backend may ignore unknown params).
 */
export const getAtlList = async (
  sequenceNumber = "",
  aircraftId?: number
): Promise<AtlItem[]> => {
  const params = new URLSearchParams();
  const q = sequenceNumber.trim();
  if (q) {
    params.append("sequence_number", q);
    params.append("search", q);
  } else if (aircraftId != null && aircraftId > 0) {
    params.append("limit", "50");
  }
  const url = aircraftId != null && aircraftId > 0
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
              r.aircraft_registration ??
                r.ac_reg ??
                r.registration ??
                ""
            ).trim();
      const natureRaw = String(
        r.nature_of_flight ?? r.natureOfFlight ?? ""
      ).trim();
      const natureOfFlightDisplay = formatNatureOfFlightForDisplay(
        natureRaw || undefined
      );
      const seqPart = seqNo || [code, ref].filter(Boolean).join(" - ") || String(id);
      const label = `${seqPart} · ${natureOfFlightDisplay} · ${reg || "—"}`;
      return {
        id,
        sequenceNo: seqNo,
        code,
        reference: ref,
        label,
        natureOfFlight: natureRaw || undefined,
        natureOfFlightDisplay,
        aircraftRegistration: reg || undefined,
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
  aircraftId?: number
): Promise<AtlItem[]> => {
  const q = sequenceOrSearch.trim();
  const aid =
    aircraftId != null &&
    Number.isFinite(Number(aircraftId)) &&
    Number(aircraftId) > 0
      ? Number(aircraftId)
      : undefined;

  const primary = await getAtlList(q, aid);
  if (primary.length > 0) return primary;

  if (!q || !aid) return [];

  try {
    const tech = await searchAircraftTechnicalLogBySequence(q);
    const filtered = tech.filter(
      (t) => t.id > 0 && t.aircraft?.id === aid
    );
    return filtered.map((t) => {
      const seq = String(t.sequenceNo ?? "").trim() || String(t.id);
      const natureDisplay = formatNatureOfFlightForDisplay(
        t.natureOfFlight
      );
      const reg = (t.aircraft?.registration ?? "").trim() || "—";
      return {
        id: t.id,
        sequenceNo: String(t.sequenceNo ?? "").trim(),
        label: `${seq} · ${natureDisplay} · ${reg}`,
        natureOfFlight: t.natureOfFlight,
        natureOfFlightDisplay: natureDisplay,
        aircraftRegistration: reg !== "—" ? reg : undefined,
      };
    });
  } catch {
    return [];
  }
};
