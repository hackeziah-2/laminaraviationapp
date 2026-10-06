import { resolveAtlRemarksSectionVisibility } from "./utils";

/**
 * Keep user-entered line breaks. Browsers and pasted text may use CRLF or CR;
 * the form stores LF so each line round-trips through submit and edit.
 * Leading and trailing newlines are kept so Enter at the end of a line sticks.
 */
export function normalizeMultilineText(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** First non-empty multiline string. Blank lines inside a value are kept. */
export function firstMultilineText(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = normalizeMultilineText(value);
    if (text !== "") return text;
  }
  return "";
}

export type AtlRemarksFormFields = {
  pilotReport: string;
  maintenanceEntry: string;
};

/**
 * Put the stored remarks string into the field the user can see.
 * Pilot Report, Maintenance Entry, and the combined Remarks box each show the
 * full text, including every line. The other field stays empty so a later save
 * does not append a hidden copy.
 */
/**
 * Store exactly the string the textarea currently has.
 * Do not normalize or uppercase here — any rewrite moves the caret when the
 * user inserts or deletes in the middle of a sentence.
 */
export function assignAtlRemarksText(
  natureOfFlight: string | null | undefined,
  value: string
): AtlRemarksFormFields {
  if (resolveAtlRemarksSectionVisibility(natureOfFlight) === "maintenanceEntry") {
    return { pilotReport: "", maintenanceEntry: value };
  }
  return { pilotReport: value, maintenanceEntry: "" };
}

export function applyAtlRemarksText(
  natureOfFlight: string | null | undefined,
  value: unknown
): AtlRemarksFormFields {
  return assignAtlRemarksText(natureOfFlight, normalizeMultilineText(value));
}

/** Text currently shown in Pilot Report, Maintenance Entry, or Remarks. */
export function atlVisibleRemarksText(
  natureOfFlight: string | null | undefined,
  pilotReport: unknown,
  maintenanceEntry: unknown
): string {
  if (resolveAtlRemarksSectionVisibility(natureOfFlight) === "maintenanceEntry") {
    return normalizeMultilineText(maintenanceEntry);
  }
  return normalizeMultilineText(pilotReport);
}

/**
 * Actions Taken from an ATL row. Accepts either API spelling so a saved value
 * still fills the field after create or update.
 */
export function readAtlActionsTaken(entry: object | null | undefined): string {
  if (!entry) return "";
  const record = entry as Record<string, unknown>;
  return firstMultilineText(
    record.actionsTaken,
    record.actions_taken,
    record.actionTaken,
    record.action_taken
  );
}
