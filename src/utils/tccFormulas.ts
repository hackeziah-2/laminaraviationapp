/**
 * TCC Maintenance — same next-due / remaining rules as the TCC table (TCCDetail).
 * Used for API create/update payloads (next_due_*, remaining_*).
 */

export interface TccSchedulingSnapshot {
  nextDueTach: number | null;
  nextDueAftt: number | null;
  nextDueDate: Date | null;
  remainingYear: number | null;
  remainingDays: number | null;
  remainingTach: number | null;
  remainingAftt: number | null;
}

export interface TccSchedulingInput {
  limitYears: string;
  limitHours: string;
  lastDoneDate: string;
  /** Aircraft tach at last compliance (same as last_done_tach). */
  lastDoneTach: string;
  lastDoneAftt: string;
  currentDate: Date;
  currentTach: number;
  currentAftt: number;
}

function parseNum(s: string | undefined): number {
  if (s == null || String(s).trim() === "") return NaN;
  const n = parseFloat(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function parseDate(s: string | undefined): Date | null {
  if (s == null || String(s).trim() === "") return null;
  const str = String(s).trim();
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;
  const match = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (match) {
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const mon = months[match[2]] ?? NaN;
    if (Number.isFinite(mon)) {
      const year =
        match[3].length === 2
          ? 2000 + parseInt(match[3], 10)
          : parseInt(match[3], 10);
      const day = parseInt(match[1], 10);
      const d2 = new Date(year, mon, day);
      if (!Number.isNaN(d2.getTime())) return d2;
    }
  }
  return null;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function toIsoDateOnly(d: Date): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Next due / remaining from limits, last done, and aircraft current times. */
export function computeTccSchedulingSnapshot(
  input: TccSchedulingInput
): TccSchedulingSnapshot {
  const limitYears = parseNum(input.limitYears);
  const limitHours = parseNum(input.limitHours);
  const lastDoneDate = parseDate(input.lastDoneDate);
  const lastDoneTach = parseNum(input.lastDoneTach);
  const lastDoneAftt = parseNum(input.lastDoneAftt);

  const hasLimitHours = Number.isFinite(limitHours);
  const hasLastDoneTach = Number.isFinite(lastDoneTach);
  const hasLastDoneAftt = Number.isFinite(lastDoneAftt);
  const currentTach = input.currentTach;
  const currentAftt = input.currentAftt;

  const nextDueTach =
    hasLimitHours && hasLastDoneTach ? lastDoneTach + limitHours : null;
  const nextDueAftt =
    hasLimitHours && hasLastDoneAftt ? lastDoneAftt + limitHours : null;

  let nextDueDate: Date | null = null;
  if (lastDoneDate != null && Number.isFinite(limitYears)) {
    const d = new Date(lastDoneDate);
    const wholeYears = Math.floor(limitYears);
    const fractionalYear = limitYears - wholeYears;
    d.setFullYear(d.getFullYear() + wholeYears);
    if (fractionalYear > 0) {
      d.setDate(d.getDate() + Math.ceil(fractionalYear * 365.25));
    }
    nextDueDate = d;
  }

  const remainingYear =
    nextDueDate != null
      ? daysBetween(input.currentDate, nextDueDate) / 365
      : null;
  const remainingDays =
    nextDueDate != null ? daysBetween(input.currentDate, nextDueDate) : null;
  const remainingTach =
    hasLimitHours &&
    hasLastDoneTach &&
    Number.isFinite(currentTach)
      ? limitHours - (currentTach - lastDoneTach)
      : null;
  const remainingAftt =
    hasLimitHours &&
    hasLastDoneAftt &&
    Number.isFinite(currentAftt)
      ? limitHours - (currentAftt - lastDoneAftt)
      : null;

  return {
    nextDueTach,
    nextDueAftt,
    nextDueDate,
    remainingYear:
      remainingYear != null && Number.isFinite(remainingYear)
        ? remainingYear
        : null,
    remainingDays,
    remainingTach,
    remainingAftt,
  };
}

/** Snake_case body fields for POST/PUT (omit unset / non-finite values). */
export function schedulingSnapshotToApiPayload(
  s: TccSchedulingSnapshot
): Record<string, number | string> {
  const p: Record<string, number | string> = {};
  if (s.nextDueTach != null && Number.isFinite(s.nextDueTach))
    p.next_due_tach = s.nextDueTach;
  if (s.nextDueAftt != null && Number.isFinite(s.nextDueAftt))
    p.next_due_aftt = s.nextDueAftt;
  const nd = s.nextDueDate != null ? toIsoDateOnly(s.nextDueDate) : null;
  if (nd) p.next_due_date = nd;
  if (s.remainingYear != null && Number.isFinite(s.remainingYear))
    p.remaining_year = s.remainingYear;
  if (s.remainingDays != null && Number.isFinite(s.remainingDays))
    p.remaining_days = s.remainingDays;
  if (s.remainingTach != null && Number.isFinite(s.remainingTach))
    p.remaining_tach = s.remainingTach;
  if (s.remainingAftt != null && Number.isFinite(s.remainingAftt))
    p.remaining_aftt = s.remainingAftt;
  return p;
}
