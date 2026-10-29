/**
 * Color for REMAINING TIME BEFORE NEXT INSP (HRS).
 *
 * remaining % = (remaining hours / next inspection interval) * 100
 * Red is applied first when remaining time is 1.0 hour or less.
 * A missing or non-positive interval keeps the default cell style.
 */

export type RemainingNextInspTone = "red" | "orange" | "yellow" | "default";

export const REMAINING_NEXT_INSP_LEGEND: ReadonlyArray<{
  tone: Exclude<RemainingNextInspTone, "default">;
  label: string;
}> = [
  { tone: "yellow", label: "> 10% to ≤ 20% remaining" },
  { tone: "orange", label: "> 1% to ≤ 10% remaining" },
  { tone: "red", label: "Due (≤1 hr remaining)" },
];

const CELL_CLASS: Record<RemainingNextInspTone, string> = {
  red: "bg-red-500 text-white",
  orange: "bg-orange-600 text-white",
  yellow: "bg-yellow-400 text-gray-900",
  default: "text-gray-900",
};

function finiteNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value == null) return null;
  const text = String(value).trim().replace(/,/g, "");
  if (!text || text === "-" || text === "—") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Inspection interval in hours from next_insp_due.
 * Accepts a number, a numeric string, or an inspection name such as "50-Hour Inspection".
 */
export function parseInspectionIntervalHours(
  nextInspDue: number | string | null | undefined
): number | null {
  if (typeof nextInspDue === "number") {
    return Number.isFinite(nextInspDue) ? nextInspDue : null;
  }
  if (nextInspDue == null) return null;
  const text = String(nextInspDue).trim().replace(/,/g, "");
  if (!text || text === "-" || text === "—") return null;

  const hourMatch = text.match(
    /(\d+(?:\.\d+)?)\s*[- ]?\s*(?:hours?|hrs?)\b/i
  );
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    return Number.isFinite(hours) ? hours : null;
  }

  const bare = text.match(/^(-?\d+(?:\.\d+)?)(?:\s+[A-Za-z]+)?$/);
  if (!bare) return null;
  const hours = Number(bare[1]);
  return Number.isFinite(hours) ? hours : null;
}

export function remainingNextInspTone(
  remaining: number | string | null | undefined,
  nextInspDue: number | string | null | undefined
): RemainingNextInspTone {
  const remainingHours = finiteNumber(remaining);
  if (remainingHours != null && remainingHours <= 1) return "red";

  const interval = parseInspectionIntervalHours(nextInspDue);
  if (
    remainingHours == null ||
    interval == null ||
    !(interval > 0)
  ) {
    return "default";
  }

  const remainingPercentage = (remainingHours / interval) * 100;
  if (!Number.isFinite(remainingPercentage)) return "default";
  if (remainingPercentage > 1 && remainingPercentage <= 10) return "orange";
  if (remainingPercentage > 10 && remainingPercentage <= 20) return "yellow";
  return "default";
}

export function remainingNextInspCellClass(
  tone: RemainingNextInspTone
): string {
  return CELL_CLASS[tone];
}
