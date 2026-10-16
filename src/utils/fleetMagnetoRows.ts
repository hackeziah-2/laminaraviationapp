/** Fleet dashboard page size: aircraft, not magneto rows. */
export const FLEET_DASHBOARD_PAGE_SIZE = 20;

export interface MagnetoComponentInput {
  description: string;
  methodOfCompliance?: string;
  partNo?: string;
  serialNo?: string;
  nextDueTach?: number | null;
  remainingTach?: number | null;
  limitHours?: number | null;
}

export interface FleetMagnetoRow {
  key: string;
  /** Magneto name taken from the TCC description. */
  label: string;
  dueForOh: number | null;
  dueForReplacement: number | null;
  partNumber: string;
  serialNumber: string;
  /** Hours limit on the replacement (or only) component, for remaining color. */
  limitHours: number | null;
  /** Server remaining tach when end-of-day tach is unavailable. */
  remainingTach: number | null;
}

export interface FleetDashboardAircraftInput {
  id: number;
  registration: string;
  displayOrder?: number;
}

export interface FleetDailyStatusInput {
  aircraftId?: number;
  registration?: string;
  ident?: string;
  status?: string;
  tachEod?: number | null;
}

export interface FleetDashboardAircraft {
  id: number;
  registration: string;
  displayOrder: number;
  status: string;
  tachEod: number | null;
}

type MagnetoSide = "LH" | "RH" | "OTHER";
type ComplianceKind = "oh" | "replacement" | "unspecified";

function finiteOrNull(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

/** Description text shown in the Magneto column, without compliance words. */
export function magnetoDisplayLabel(description: string): string {
  const cleaned = description
    .toUpperCase()
    .replace(/\b(OVERHAUL|REPLACEMENT|REPLACED|REPLACE)\b/g, " ")
    .replace(/\bOH\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "MAGNETO";
}

function isMagnetoDescription(description: string): boolean {
  return description.toUpperCase().includes("MAGNETO");
}

function sideOf(label: string): MagnetoSide {
  if (/(^| )LH( |$)/.test(label) || /(^| )LEFT( |$)/.test(label)) return "LH";
  if (/(^| )RH( |$)/.test(label) || /(^| )RIGHT( |$)/.test(label)) return "RH";
  return "OTHER";
}

function complianceKind(item: MagnetoComponentInput): ComplianceKind {
  const method = (item.methodOfCompliance ?? "").toUpperCase();
  const description = (item.description ?? "").toUpperCase();
  const methodOh = /\bOH\b/.test(method) || method.includes("OVERHAUL");
  const methodReplacement = method.includes("REPLAC");
  if (methodOh && !methodReplacement) return "oh";
  if (methodReplacement && !methodOh) return "replacement";
  if (!methodOh && !methodReplacement) {
    const descriptionOh =
      /\bOH\b/.test(description) || description.includes("OVERHAUL");
    const descriptionReplacement = description.includes("REPLAC");
    if (descriptionOh && !descriptionReplacement) return "oh";
    if (descriptionReplacement && !descriptionOh) return "replacement";
  }
  return "unspecified";
}

function preferredLabel(labels: string[], side: MagnetoSide): string {
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (side === "LH") {
    const exact = unique.find((label) => label === "LH MAGNETO");
    if (exact) return exact;
  }
  if (side === "RH") {
    const exact = unique.find((label) => label === "RH MAGNETO");
    if (exact) return exact;
  }
  unique.sort((a, b) => a.length - b.length || a.localeCompare(b));
  if (unique[0]) return unique[0];
  if (side === "LH") return "LH MAGNETO";
  if (side === "RH") return "RH MAGNETO";
  return "MAGNETO";
}

function soonestDue(current: number | null, next: number | null): number | null {
  if (next == null) return current;
  if (current == null) return next;
  return Math.min(current, next);
}

function firstNonEmpty(current: string, next: string | undefined): string {
  if (current.trim()) return current;
  return (next ?? "").trim();
}

/**
 * One row per magneto. LH and RH descriptions stay on separate rows.
 * Overhaul and replacement records for the same magneto fill the two tach-due columns.
 */
export function buildMagnetoRows(
  items: MagnetoComponentInput[]
): FleetMagnetoRow[] {
  const groups = new Map<
    string,
    { side: MagnetoSide; labels: string[]; items: MagnetoComponentInput[] }
  >();

  for (const item of items) {
    const description = item.description ?? "";
    if (!isMagnetoDescription(description)) continue;
    const label = magnetoDisplayLabel(description);
    const side = sideOf(label);
    const key = side === "OTHER" ? `OTHER:${label}` : side;
    const group = groups.get(key);
    if (group) {
      group.labels.push(label);
      group.items.push(item);
    } else {
      groups.set(key, { side, labels: [label], items: [item] });
    }
  }

  const sideOrder: Record<MagnetoSide, number> = { LH: 0, RH: 1, OTHER: 2 };
  return [...groups.entries()]
    .map(([key, group]) => {
      let dueForOh: number | null = null;
      let dueForReplacement: number | null = null;
      let partNumber = "";
      let serialNumber = "";
      let limitHours: number | null = null;
      let remainingTach: number | null = null;
      let replacementPart = "";
      let replacementSerial = "";
      let fallbackPart = "";
      let fallbackSerial = "";

      for (const item of group.items) {
        const due = finiteOrNull(item.nextDueTach);
        const kind = complianceKind(item);
        if (kind === "oh") {
          dueForOh = soonestDue(dueForOh, due);
        } else {
          dueForReplacement = soonestDue(dueForReplacement, due);
          if (kind === "replacement" || kind === "unspecified") {
            replacementPart = firstNonEmpty(replacementPart, item.partNo);
            replacementSerial = firstNonEmpty(replacementSerial, item.serialNo);
            if (limitHours == null) limitHours = finiteOrNull(item.limitHours);
            if (remainingTach == null) {
              remainingTach = finiteOrNull(item.remainingTach);
            }
          }
        }
        fallbackPart = firstNonEmpty(fallbackPart, item.partNo);
        fallbackSerial = firstNonEmpty(fallbackSerial, item.serialNo);
      }

      partNumber = replacementPart || fallbackPart;
      serialNumber = replacementSerial || fallbackSerial;

      return {
        key,
        label: preferredLabel(group.labels, group.side),
        dueForOh,
        dueForReplacement,
        partNumber,
        serialNumber,
        limitHours,
        remainingTach,
        sideOrder: sideOrder[group.side],
      };
    })
    .sort(
      (a, b) =>
        a.sideOrder - b.sideOrder || a.label.localeCompare(b.label)
    )
    .map(({ sideOrder: _sideOrder, ...row }) => row);
}

/** Remaining hours before replacement: due-for-replacement tach minus end-of-day tach. */
export function remainingBeforeReplacement(
  dueForReplacement: number | null,
  tachEod: number | null,
  fallbackRemaining: number | null
): number | null {
  if (
    dueForReplacement != null &&
    tachEod != null &&
    Number.isFinite(dueForReplacement) &&
    Number.isFinite(tachEod)
  ) {
    return Math.round((dueForReplacement - tachEod) * 10) / 10;
  }
  return finiteOrNull(fallbackRemaining);
}

export function formatTachHours(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Same remaining bands as TCC: red ≤0%, orange ≤10%, yellow ≤20%, green ≤40%. */
export function remainingHoursClass(
  remaining: number | null,
  limitHours: number | null
): string {
  if (remaining == null || !Number.isFinite(remaining)) return "";
  if (limitHours != null && limitHours > 0) {
    const pct = (remaining / limitHours) * 100;
    if (pct <= 0) return "bg-red-500 text-white";
    if (pct <= 10) return "bg-orange-400 text-gray-900";
    if (pct <= 20) return "bg-yellow-300 text-gray-900";
    if (pct <= 40) return "bg-green-200 text-gray-900";
    return "";
  }
  if (remaining <= 0) return "bg-red-500 text-white";
  if (remaining <= 10) return "bg-orange-400 text-gray-900";
  return "";
}

export function normalizeFleetStatus(status: string | undefined): string {
  const value = (status ?? "").trim();
  if (!value) return "";
  if (value.toLowerCase() === "running") return "Operational";
  return value;
}

/**
 * Aircraft records joined to fleet daily status and end-of-day tach.
 * Status filter uses the operational status shown in the table.
 */
export function joinFleetDashboardAircraft(
  aircraft: FleetDashboardAircraftInput[],
  dailyUpdates: FleetDailyStatusInput[],
  statusFilter: string
): FleetDashboardAircraft[] {
  const byId = new Map<number, FleetDailyStatusInput>();
  const byRegistration = new Map<string, FleetDailyStatusInput>();
  for (const item of dailyUpdates) {
    if (item.aircraftId != null && item.aircraftId > 0) {
      byId.set(item.aircraftId, item);
    }
    const registration = (item.registration || item.ident || "")
      .trim()
      .toUpperCase();
    if (registration) byRegistration.set(registration, item);
  }

  const filter = statusFilter.trim();
  const rows: FleetDashboardAircraft[] = [];
  for (const item of aircraft) {
    if (!Number.isFinite(item.id) || item.id <= 0) continue;
    const daily =
      byId.get(item.id) ??
      byRegistration.get(item.registration.trim().toUpperCase());
    const status = normalizeFleetStatus(daily?.status);
    if (
      filter &&
      filter.toLowerCase() !== "all" &&
      status.toLowerCase() !== filter.toLowerCase()
    ) {
      continue;
    }
    rows.push({
      id: item.id,
      registration: item.registration,
      displayOrder: item.displayOrder ?? Number.MAX_SAFE_INTEGER,
      status,
      tachEod: finiteOrNull(daily?.tachEod),
    });
  }

  rows.sort(
    (a, b) =>
      a.displayOrder - b.displayOrder ||
      a.registration.localeCompare(b.registration) ||
      a.id - b.id
  );
  return rows;
}

export function paginateFleetAircraft<T>(
  items: T[],
  page: number,
  pageSize = FLEET_DASHBOARD_PAGE_SIZE
): {
  pageItems: T[];
  total: number;
  totalPages: number;
  page: number;
} {
  const size = Math.max(1, Math.trunc(pageSize) || FLEET_DASHBOARD_PAGE_SIZE);
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / size);
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (safePage - 1) * size;
  return {
    pageItems: items.slice(start, start + size),
    total,
    totalPages,
    page: safePage,
  };
}
