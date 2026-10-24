import { normalizeMultilineText } from "../utility/atlMultilineText";

/** Store remarks with LF line breaks so Enter round-trips through save and edit. */
export function fleetDailyRemarksValue(value: unknown): string {
  return normalizeMultilineText(value);
}

/** Null when there is nothing to show. Blank lines inside the text are kept. */
export function fleetDailyRemarksDisplay(value: unknown): string | null {
  if (value == null) return null;
  const text = fleetDailyRemarksValue(value);
  return text === "" ? null : text;
}
