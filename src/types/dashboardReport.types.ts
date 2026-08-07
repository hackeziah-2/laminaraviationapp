/** Aircraft Fuel Consumption Report — monthly ATL Logbook contract (camelCase after normalization). */

export type AircraftFuelReportQueryParams = {
  /** YYYY-MM */
  startMonth?: string;
  /** YYYY-MM */
  endMonth?: string;
  /** Comma-separated aircraft registrations (tails). */
  aircraft?: string;
  /** Comma-separated aircraft PKs — preferred filter. */
  aircraftId?: string;
};

export type FuelReportRange = {
  start: string | null;
  end: string | null;
};

export type FuelReportMeta = {
  source: string;
  range: FuelReportRange;
  generatedAt: string;
};

export type FuelReportSummary = {
  totalHours: number;
  totalFuelGal: number;
  avgFuelBurnPerHour: number | null;
  totalOilUsageQrts: number;
  totalLandings: number;
};

export type AircraftFuelBreakdown = {
  tailNumber: string;
  hours: number;
  fuelGal: number;
  fuelBurnPerHour: number | null;
  oilUsageQrts: number;
};

export type MonthlyFuelRow = {
  month: string;
  monthLabel: string;
  hours: number;
  fuelGal: number;
  fuelBurnPerHour: number | null;
  oilUsageQrts: number;
  landings: number;
  aircraftBreakdown: AircraftFuelBreakdown[];
};

export type DataQualityFlag = {
  code: string;
  message: string;
  sequenceNo: string | null;
  aircraftTail: string | null;
  originDate: string | null;
};

export type DataQualitySeverity = "Critical" | "Warning" | "Info";
export type DataQualityStatus = "Open" | "Resolved";

/** Enriched row for the Data Quality Flags modal table. */
export type DataQualityFlagRow = DataQualityFlag & {
  id: string;
  category: string;
  description: string;
  invalidValue: string;
  severity: DataQualitySeverity;
  status: DataQualityStatus;
  dateDetected: string;
};

export type AircraftFuelReportResponse = {
  meta: FuelReportMeta;
  summary: FuelReportSummary;
  monthly: MonthlyFuelRow[];
  dataQualityFlags: DataQualityFlag[];
};

/** Draft / applied filter form state (UI). */
export type FuelReportFilterState = {
  /** YYYY-MM or "" to let API use earliest available */
  startMonth: string;
  /** YYYY-MM or "" to let API use latest available */
  endMonth: string;
  /** Selected aircraft PKs (empty = all). */
  aircraftIds: number[];
  /** Parallel registrations for selected ids (same order). Sent as `aircraft`. */
  aircraftRegistrations: string[];
};

export const CHART_TITLE = "Monthly Fuel Consumption/ Hour";

export function formatReportNumber(
  value: number | null | undefined,
  maxDecimals = 2
): string {
  if (value == null || value === undefined) return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  // Round to maxDecimals first so float noise like 32.0000000000 → 32
  const factor = 10 ** Math.max(0, maxDecimals);
  const rounded = Math.round((n + Number.EPSILON) * factor) / factor;
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatReportInteger(value: number | null | undefined): string {
  if (value == null || value === undefined) return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Clean verbose Decimal strings inside data-quality messages
 * (e.g. "32.0000000000" → "32", "31.2500000000" → "31.25").
 */
export function cleanFlagMessage(message: string): string {
  if (!message) return "";
  return message.replace(/-?\d+\.\d+/g, (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return formatReportNumber(n, 6);
  });
}

const FLAG_META: Record<
  string,
  { category: string; severity: DataQualitySeverity }
> = {
  negative_fuel_consumed: {
    category: "Fuel Consumed",
    severity: "Critical",
  },
  fuel_chain_break: {
    category: "Fuel Chain",
    severity: "Warning",
  },
  missing_fuel_fields: {
    category: "Fuel Fields",
    severity: "Warning",
  },
};

function humanizeFlagCode(code: string): string {
  const raw = (code || "").trim();
  if (!raw) return "General";
  return raw
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Extract current/invalid value snippets from API messages when present. */
export function extractInvalidValueFromMessage(message: string): string {
  const cleaned = cleanFlagMessage(message || "");
  if (!cleaned) return "—";

  const fuelConsumed = cleaned.match(/fuel_consumed\s*=\s*([-\d.,]+)/i);
  if (fuelConsumed?.[1]) return fuelConsumed[1];

  const priorMatch = cleaned.match(
    /PRIOR DEP\.\s*\(([^)]+)\)\s*does not roughly match.*?AFTER ON-BLKS \+ uplift\s*\(([^)]+)\)/i
  );
  if (priorMatch?.[1] && priorMatch?.[2]) {
    return `PRIOR ${priorMatch[1]} vs expected ${priorMatch[2]}`;
  }

  const parenValues = [...cleaned.matchAll(/\(([^)]+)\)/g)].map((m) =>
    m[1].trim()
  );
  if (parenValues.length >= 2) {
    return `${parenValues[0]} / ${parenValues[1]}`;
  }
  if (parenValues.length === 1) return parenValues[0];

  return "—";
}

export function enrichDataQualityFlag(
  flag: DataQualityFlag,
  index: number
): DataQualityFlagRow {
  const code = (flag.code || "").trim();
  const meta = FLAG_META[code];
  const description = cleanFlagMessage(flag.message || code || "—");
  return {
    ...flag,
    id: `${code || "flag"}-${flag.sequenceNo ?? "na"}-${flag.aircraftTail ?? "na"}-${flag.originDate ?? "na"}-${index}`,
    category: meta?.category ?? humanizeFlagCode(code),
    description,
    invalidValue: extractInvalidValueFromMessage(flag.message || ""),
    severity: meta?.severity ?? "Info",
    // Flags returned by the live report are unresolved issues for the selected range.
    status: "Open",
    dateDetected: flag.originDate?.trim() || "—",
  };
}

export function enrichDataQualityFlags(
  flags: DataQualityFlag[] | null | undefined
): DataQualityFlagRow[] {
  if (!flags?.length) return [];
  return flags.map((flag, index) => enrichDataQualityFlag(flag, index));
}

/** Whole-number bar labels with thousands separators. */
export function formatBarWholeNumber(value: number | null | undefined): string {
  if (value == null || value === undefined) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("en-US");
}

/** One-decimal fuel burn label. */
export function formatBurnLabel(value: number | null | undefined): string {
  if (value == null || value === undefined) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Default filters: no month bounds (API uses earliest→latest ATL months)
 * and all aircraft.
 */
export function createDefaultFuelReportFilters(): FuelReportFilterState {
  return {
    startMonth: "",
    endMonth: "",
    aircraftIds: [],
    aircraftRegistrations: [],
  };
}

/**
 * Build query params for GET aircraft-fuel-report.
 * Sends `aircraft` (tails) and `aircraft_id` (PKs) when a filter is set.
 */
export function buildFuelReportQueryParams(
  filters: FuelReportFilterState
): AircraftFuelReportQueryParams {
  const params: AircraftFuelReportQueryParams = {};
  if (filters.startMonth?.trim()) {
    params.startMonth = filters.startMonth.trim();
  }
  if (filters.endMonth?.trim()) {
    params.endMonth = filters.endMonth.trim();
  }
  const regs = filters.aircraftRegistrations
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
  const ids = filters.aircraftIds.filter((id) => Number.isFinite(id) && id > 0);
  if (regs.length > 0) {
    params.aircraft = regs.join(",");
  }
  if (ids.length > 0) {
    params.aircraftId = ids.join(",");
  }
  return params;
}

/** Breadcrumb label for selected aircraft registrations. */
export function aircraftBreadcrumbLabel(registrations: string[]): string {
  if (registrations.length === 0) return "All Aircraft";
  return registrations.join(", ");
}

/** Group top-level data_quality_flags onto months via origin_date (YYYY-MM). */
export function flagsByMonth(
  flags: DataQualityFlag[] | null | undefined
): Map<string, DataQualityFlag[]> {
  const map = new Map<string, DataQualityFlag[]>();
  if (!flags?.length) return map;
  for (const flag of flags) {
    const origin = flag.originDate?.trim();
    if (!origin) continue;
    const month = origin.length >= 7 ? origin.slice(0, 7) : origin;
    const list = map.get(month) ?? [];
    list.push(flag);
    map.set(month, list);
  }
  return map;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function unwrapFuelReportPayload(rawInput: unknown): Record<string, unknown> {
  if (!rawInput || typeof rawInput !== "object") return {};
  const obj = rawInput as Record<string, unknown>;
  if (
    obj.data != null &&
    typeof obj.data === "object" &&
    !Array.isArray(obj.data) &&
    obj.monthly == null &&
    obj.summary == null
  ) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
}

/**
 * Normalize raw API JSON (snake or camel, optionally wrapped in data)
 * into the frontend AircraftFuelReportResponse shape.
 */
export function normalizeAircraftFuelReport(
  rawInput: unknown
): AircraftFuelReportResponse {
  const root = unwrapFuelReportPayload(rawInput);

  const metaRaw = (root.meta ?? {}) as Record<string, unknown>;
  const rangeRaw = (metaRaw.range ?? {}) as Record<string, unknown>;
  const summaryRaw = (root.summary ?? {}) as Record<string, unknown>;
  const monthlyRaw = Array.isArray(root.monthly)
    ? root.monthly
    : Array.isArray((root as any).Monthly)
      ? (root as any).Monthly
      : [];
  const flagsRaw = Array.isArray(root.data_quality_flags)
    ? root.data_quality_flags
    : Array.isArray(root.dataQualityFlags)
      ? root.dataQualityFlags
      : [];

  const monthly: MonthlyFuelRow[] = monthlyRaw.map((item: unknown) => {
    const r = (item ?? {}) as Record<string, unknown>;
    const breakdownRaw = Array.isArray(r.aircraft_breakdown)
      ? r.aircraft_breakdown
      : Array.isArray(r.aircraftBreakdown)
        ? r.aircraftBreakdown
        : [];
    return {
      month: str(r.month),
      monthLabel: str(r.month_label ?? r.monthLabel),
      hours: num(r.hours),
      fuelGal: num(r.fuel_gal ?? r.fuelGal),
      fuelBurnPerHour: numOrNull(r.fuel_burn_per_hour ?? r.fuelBurnPerHour),
      oilUsageQrts: num(r.oil_usage_qrts ?? r.oilUsageQrts),
      landings: num(r.landings, 0),
      aircraftBreakdown: breakdownRaw.map((b: unknown) => {
        const ac = (b ?? {}) as Record<string, unknown>;
        return {
          tailNumber: str(ac.tail_number ?? ac.tailNumber),
          hours: num(ac.hours),
          fuelGal: num(ac.fuel_gal ?? ac.fuelGal),
          fuelBurnPerHour: numOrNull(
            ac.fuel_burn_per_hour ?? ac.fuelBurnPerHour
          ),
          oilUsageQrts: num(ac.oil_usage_qrts ?? ac.oilUsageQrts),
        };
      }),
    };
  });

  const dataQualityFlags: DataQualityFlag[] = flagsRaw.map((item: unknown) => {
    const f = (item ?? {}) as Record<string, unknown>;
    return {
      code: str(f.code),
      message: str(f.message),
      sequenceNo:
        f.sequence_no != null || f.sequenceNo != null
          ? str(f.sequence_no ?? f.sequenceNo)
          : null,
      aircraftTail:
        f.aircraft_tail != null || f.aircraftTail != null
          ? str(f.aircraft_tail ?? f.aircraftTail)
          : null,
      originDate:
        f.origin_date != null || f.originDate != null
          ? str(f.origin_date ?? f.originDate)
          : null,
    };
  });

  return {
    meta: {
      source: str(metaRaw.source, "ATL Logbook"),
      range: {
        start:
          rangeRaw.start != null && String(rangeRaw.start).trim() !== ""
            ? String(rangeRaw.start)
            : null,
        end:
          rangeRaw.end != null && String(rangeRaw.end).trim() !== ""
            ? String(rangeRaw.end)
            : null,
      },
      generatedAt: str(metaRaw.generated_at ?? metaRaw.generatedAt),
    },
    summary: {
      totalHours: num(summaryRaw.total_hours ?? summaryRaw.totalHours),
      totalFuelGal: num(summaryRaw.total_fuel_gal ?? summaryRaw.totalFuelGal),
      avgFuelBurnPerHour: numOrNull(
        summaryRaw.avg_fuel_burn_per_hour ?? summaryRaw.avgFuelBurnPerHour
      ),
      totalOilUsageQrts: num(
        summaryRaw.total_oil_usage_qrts ?? summaryRaw.totalOilUsageQrts
      ),
      totalLandings: num(
        summaryRaw.total_landings ?? summaryRaw.totalLandings,
        0
      ),
    },
    monthly,
    dataQualityFlags,
  };
}
