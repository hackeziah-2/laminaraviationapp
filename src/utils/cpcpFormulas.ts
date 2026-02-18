/**
 * CPCP auto-compute formulas (Excel-like).
 * - Next due Tach = Last Done Tach + interval hours
 * - Next due AFTT = Last Done AFTT + interval hours
 * - Next due Date = Last Done Date + interval months (EDATE-style)
 * - Remaining months = YEARFRAC(TODAY(), Next due date) * 12
 * - Remaining days = ABS(DAYS(TODAY(), Next due date))
 * - Remaining tach = Next due Tach - aircraft current Tach (from ATL)
 * - Remaining aftt = Next due AFTT - aircraft current AFTT (from ATL)
 */

function parseNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/** Parse date string (YYYY-MM-DD or other) to Date; return null if invalid */
function parseDate(s: any): Date | null {
  if (s == null || String(s).trim() === "") return null;
  const d = new Date(String(s).trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Add months to a date (Excel EDATE-style). */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** YEARFRAC: fraction of year between start and end (basis 0: 30/360-ish, we use actual days/365). */
function yearFrac(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const days = ms / (24 * 60 * 60 * 1000);
  return days / 365;
}

/** Days between two dates (end - start). */
function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return String(Math.round(n * 100) / 100);
}

function formatDate(d: Date | null): string {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Status from remaining %: Due → red, <10% → orange, <20% → yellow, <40% → green, else white */
export type CPCPRemainingStatus = "red" | "orange" | "yellow" | "green" | "white";

export interface CPCPComputed {
  nextDue: {
    date: string;
    tach: string;
    aftf: string;
  };
  remaining: {
    months: string;
    days: string;
    tach: string;
    aftf: string;
  };
  /** Status for row color: from remaining % vs interval (Due / <10% / <20% / <40% / else white) */
  status: CPCPRemainingStatus;
}

/**
 * Compute Next Due and Remaining from last done + interval, and aircraft current Tach/AFTT.
 * Returns display strings; uses "-" when value cannot be computed.
 */
export function computeCpcpRow(
  item: {
    lastDone?: { date?: any; tach?: any; tech?: any; aftf?: any };
    interval?: { hours?: any; months?: any };
  },
  aircraftTach: number | string | undefined,
  aircraftAftt: number | string | undefined
): CPCPComputed {
  const lastTach = parseNum(item.lastDone?.tach ?? item.lastDone?.tech);
  const lastAftt = parseNum(item.lastDone?.aftf);
  const lastDate = parseDate(item.lastDone?.date);
  const intHours = parseNum(item.interval?.hours);
  const intMonths = parseNum(item.interval?.months);

  const aTach = parseNum(aircraftTach);
  const aAftt = parseNum(aircraftAftt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Next due Tach = Last Done Tach + interval hours
  const nextDueTach = lastTach != null && intHours != null ? lastTach + intHours : null;
  // Next due AFTT = Last Done AFTT + interval hours
  const nextDueAftt = lastAftt != null && intHours != null ? lastAftt + intHours : null;
  // Next due Date = Last Done Date + interval months (EDATE-style)
  const nextDueDate =
    lastDate != null && intMonths != null ? addMonths(lastDate, intMonths) : null;

  // Remaining months = YEARFRAC(TODAY(), Next due date) * 12
  let remainingMonths: number | null = null;
  let remainingDays: number | null = null;
  if (nextDueDate) {
    remainingMonths = yearFrac(today, nextDueDate) * 12;
    remainingDays = Math.abs(daysBetween(today, nextDueDate));
  }

  // Remaining tach = Next due Tach - aircraft current Tach
  const remainingTach =
    nextDueTach != null && aTach != null ? nextDueTach - aTach : null;
  // Remaining aftt = Next due AFTT - aircraft current AFTT
  const remainingAftt =
    nextDueAftt != null && aAftt != null ? nextDueAftt - aAftt : null;

  // Remaining % vs interval for status (legend: Due → red, <10% → orange, <20% → yellow, <40% → green)
  const percentages: number[] = [];
  if (intMonths != null && intMonths > 0 && remainingMonths != null) {
    percentages.push((remainingMonths / intMonths) * 100);
  }
  if (intHours != null && intHours > 0 && remainingTach != null) {
    percentages.push((remainingTach / intHours) * 100);
  }
  if (intHours != null && intHours > 0 && remainingAftt != null) {
    percentages.push((remainingAftt / intHours) * 100);
  }
  const anyDue =
    (remainingMonths != null && remainingMonths <= 0) ||
    (remainingTach != null && remainingTach <= 0) ||
    (remainingAftt != null && remainingAftt <= 0);
  let status: CPCPRemainingStatus = "white";
  if (anyDue) {
    status = "red";
  } else if (percentages.length > 0) {
    const minPct = Math.min(...percentages);
    if (minPct < 10) status = "orange";
    else if (minPct < 20) status = "yellow";
    else if (minPct < 40) status = "green";
  }

  return {
    nextDue: {
      date: nextDueDate ? formatDate(nextDueDate) : "-",
      tach: formatNum(nextDueTach),
      aftf: formatNum(nextDueAftt),
    },
    remaining: {
      months: remainingMonths != null ? formatNum(remainingMonths) : "-",
      days: remainingDays != null ? String(remainingDays) : "-",
      tach: formatNum(remainingTach),
      aftf: formatNum(remainingAftt),
    },
    status,
  };
}
