export type LdndUnitValue = "" | "HRS" | "CYCLES";

/** Annual inspections do not use HRS or CYCLES. Semi-annual and bi-annual still can. */
export function isAnnualInspection(inspectionType: string): boolean {
  return inspectionType
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .some((line) => {
      const text = line.trim();
      if (!text) return false;
      if (/\b(?:semi[-\s]?annual|bi[-\s]?annual)\b/i.test(text)) return false;
      return /\bannual\b/i.test(text);
    });
}

/**
 * Blank stays blank once chosen. Annual inspections start blank instead of HRS.
 * Other new records keep HRS until the user picks a unit.
 */
export function resolveLdndUnit(options: {
  inspectionType: string;
  unit: LdndUnitValue;
  unitTouched: boolean;
}): LdndUnitValue {
  if (options.unitTouched) return options.unit;
  if (isAnnualInspection(options.inspectionType)) return "";
  return options.unit === "" ? "HRS" : options.unit;
}

export function ldndUnitForSave(
  unit: string | null | undefined
): "HRS" | "CYCLES" | null {
  if (unit === "HRS" || unit === "CYCLES") return unit;
  return null;
}
