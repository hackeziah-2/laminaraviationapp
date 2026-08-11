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
  /** Comma-separated calendar years for YoY flying hours (e.g. "2023,2024,2025,2026"). */
  years?: string;
  /** Single month slicer YYYY-MM for per-aircraft breakdown. */
  monthYear?: string;
};

export type FuelReportRange = {
  start: string | null;
  end: string | null;
};

export type FuelReportMeta = {
  source: string;
  range: FuelReportRange;
  generatedAt: string;
  /** ATL fuel is unitless; product convention comes from API (e.g. "gallons"). */
  fuelUnit: string;
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

export type YoyFlyingHoursMonth = {
  month: string;
  values: Record<string, number>;
  flag: string | null;
};

export type YoyFlyingHours = {
  years: number[];
  months: YoyFlyingHoursMonth[];
  averageFh: Record<string, number>;
  grandTotal: Record<string, number>;
};

export type AircraftMonthBreakdownRow = {
  tailNumber: string;
  hours: number;
  fuel: number;
  fuelBurnPerHour: number | null;
  flag: string | null;
};

export type AircraftMonthBreakdown = {
  /** Display label from API (e.g. "Apr-25"), or null when slicer omitted. */
  monthYear: string | null;
  aircraft: AircraftMonthBreakdownRow[];
};

export type AircraftFuelReportResponse = {
  meta: FuelReportMeta;
  summary: FuelReportSummary;
  monthly: MonthlyFuelRow[];
  dataQualityFlags: DataQualityFlag[];
  yoyFlyingHours: YoyFlyingHours;
  aircraftMonthBreakdown: AircraftMonthBreakdown;
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
  large_yoy_variance: {
    category: "YoY Flying Hours",
    severity: "Warning",
  },
  fuel_burn_outlier: {
    category: "Fuel Burn",
    severity: "Warning",
  },
};

/** Parse calendar year from a YYYY-MM month string. */
export function parseYearFromMonthYear(monthYear: string): number | null {
  const match = monthYear.trim().match(/^(\d{4})-\d{2}$/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

/**
 * Default YoY years when no month filter is set: trailing calendar span
 * ending at the current year (default last 4 years, e.g. 2023–2026 in 2026).
 */
export function defaultYoyYears(today = new Date(), span = 4): number[] {
  const end = today.getFullYear();
  const safeSpan = Math.max(1, Math.floor(span));
  const start = end - (safeSpan - 1);
  return Array.from({ length: safeSpan }, (_, i) => start + i);
}

/**
 * Inclusive calendar years for YoY flying hours from filter (or meta) month bounds.
 * Empty start/end → {@link defaultYoyYears}. One bound alone expands to that year only
 * until the other is known; both bounds use the inclusive year range.
 */
export function yoyYearsFromMonthRange(
  startMonth: string,
  endMonth: string,
  today = new Date()
): number[] {
  const startY = parseYearFromMonthYear(startMonth);
  const endY = parseYearFromMonthYear(endMonth);
  if (startY == null && endY == null) {
    return defaultYoyYears(today);
  }
  const from = startY ?? endY!;
  const to = endY ?? startY!;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const years: number[] = [];
  for (let y = lo; y <= hi; y += 1) years.push(y);
  return years;
}

/** Current calendar month as YYYY-MM. */
export function currentMonthYear(today = new Date()): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Display fuel unit from API (fallback gallons). */
export function resolveFuelUnit(unit: string | null | undefined): string {
  const trimmed = (unit ?? "").trim();
  return trimmed || "gallons";
}

export function fuelQuantityLabel(unit: string | null | undefined): string {
  return `Fuel (${resolveFuelUnit(unit)})`;
}

export function fuelBurnLabel(unit: string | null | undefined): string {
  const u = resolveFuelUnit(unit);
  // Shorten common plurals for axis/legend density.
  const short =
    u === "gallons" ? "gal" : u === "liters" || u === "litres" ? "liter" : u;
  return `Fuel Burn/Hour (${short}/hr)`;
}

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
  filters: FuelReportFilterState,
  extras?: { years?: number[]; monthYear?: string }
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
  if (extras?.years?.length) {
    params.years = extras.years.join(",");
  }
  if (extras?.monthYear?.trim()) {
    params.monthYear = extras.monthYear.trim();
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
    obj.summary == null &&
    obj.yoy_flying_hours == null &&
    obj.yoyFlyingHours == null
  ) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
}

function normalizeStringNumberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[String(k)] = num(v);
  }
  return out;
}

function normalizeYoyFlyingHours(raw: unknown): YoyFlyingHours {
  const root = (raw ?? {}) as Record<string, unknown>;
  const yearsRaw = Array.isArray(root.years) ? root.years : [];
  const years = yearsRaw
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .map((y) => Math.trunc(y));
  const monthsRaw = Array.isArray(root.months) ? root.months : [];
  const months: YoyFlyingHoursMonth[] = monthsRaw.map((item: unknown) => {
    const m = (item ?? {}) as Record<string, unknown>;
    return {
      month: str(m.month),
      values: normalizeStringNumberMap(m.values),
      flag:
        m.flag != null && String(m.flag).trim() !== ""
          ? String(m.flag).trim()
          : null,
    };
  });
  return {
    years,
    months,
    averageFh: normalizeStringNumberMap(root.average_fh ?? root.averageFh),
    grandTotal: normalizeStringNumberMap(root.grand_total ?? root.grandTotal),
  };
}

function normalizeAircraftMonthBreakdown(raw: unknown): AircraftMonthBreakdown {
  const root = (raw ?? {}) as Record<string, unknown>;
  const aircraftRaw = Array.isArray(root.aircraft) ? root.aircraft : [];
  return {
    monthYear:
      root.month_year != null || root.monthYear != null
        ? str(root.month_year ?? root.monthYear) || null
        : null,
    aircraft: aircraftRaw.map((item: unknown) => {
      const ac = (item ?? {}) as Record<string, unknown>;
      return {
        tailNumber: str(ac.tail_number ?? ac.tailNumber),
        hours: num(ac.hours),
        fuel: num(ac.fuel),
        fuelBurnPerHour: numOrNull(
          ac.fuel_burn_per_hour ?? ac.fuelBurnPerHour
        ),
        flag:
          ac.flag != null && String(ac.flag).trim() !== ""
            ? String(ac.flag).trim()
            : null,
      };
    }),
  };
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
      fuelUnit: resolveFuelUnit(
        str(metaRaw.fuel_unit ?? metaRaw.fuelUnit, "gallons")
      ),
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
    yoyFlyingHours: normalizeYoyFlyingHours(
      root.yoy_flying_hours ?? root.yoyFlyingHours
    ),
    aircraftMonthBreakdown: normalizeAircraftMonthBreakdown(
      root.aircraft_month_breakdown ?? root.aircraftMonthBreakdown
    ),
  };
}
