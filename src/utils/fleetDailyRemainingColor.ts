/**
 * Color for REMAINING TIME BEFORE NEXT INSP (HRS).
 *
 * remaining_percentage = (remaining_time_before_next_insp / next_insp_due) * 100
 * Yellow when remaining_percentage > 10 and remaining_percentage <= 20.
 * Due (red) is applied first when remaining time is 1.0 hour or less.
 * A missing or non-positive next_insp_due keeps the default cell style.
 */

export type RemainingNextInspTone = "red" | "orange" | "yellow" | "default";

/** Specified fills for the remaining-time cell and its legend. */
export const REMAINING_NEXT_INSP_COLORS = {
  yellow: "#FFFF00",
  orange: "#FF9900",
  red: "#FF0000",
} as const;

export const REMAINING_NEXT_INSP_LEGEND: ReadonlyArray<{
  tone: Exclude<RemainingNextInspTone, "default">;
  label: string;
}> = [
  { tone: "yellow", label: "> 10% to ≤ 20% remaining" },
  { tone: "orange", label: "Up to 10% remaining" },
  { tone: "red", label: "Due (≤1 hr remaining)" },
];

const CELL_TEXT_COLOR: Record<Exclude<RemainingNextInspTone, "default">, string> =
  {
    yellow: "#111827",
    orange: "#111827",
    red: "#ffffff",
  };

export type RemainingNextInspCellStyle = {
  backgroundColor: string;
  color: string;
  printColorAdjust: "exact";
  WebkitPrintColorAdjust: "exact";
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

  // remaining_percentage = (remaining_time_before_next_insp / next_insp_due) * 100
  const remainingPercentage = (remainingHours / interval) * 100;
  if (!Number.isFinite(remainingPercentage)) return "default";
  if (remainingPercentage > 10 && remainingPercentage <= 20) return "yellow";
  if (remainingPercentage <= 10) return "orange";
  return "default";
}

/** Default text color. Colored bands use remainingNextInspCellStyle instead. */
export function remainingNextInspCellClass(
  tone: RemainingNextInspTone
): string {
  return tone === "default" ? "text-gray-900" : "";
}

export function remainingNextInspCellStyle(
  tone: RemainingNextInspTone
): RemainingNextInspCellStyle | undefined {
  if (tone === "default") return undefined;
  return {
    backgroundColor: REMAINING_NEXT_INSP_COLORS[tone],
    color: CELL_TEXT_COLOR[tone],
    printColorAdjust: "exact",
    WebkitPrintColorAdjust: "exact",
  };
}
