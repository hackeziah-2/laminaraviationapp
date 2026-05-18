import * as XLSX from "xlsx";

/** Normalize a spreadsheet header for comparison (trim, case, spacing, underscores). */
export function normalizeFleetImportHeaderCell(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Required import concepts: each entry is satisfied if any alias matches a normalized header cell.
 * Keeps fleet imports aligned with export / backend expectations (registration, model, MSN, base).
 */
export const AIRCRAFT_FLEET_IMPORT_REQUIRED_HEADER_GROUPS: ReadonlyArray<{
  label: string;
  aliases: readonly string[];
}> = [
  {
    label: "Registration",
    aliases: ["registration", "ac reg", "aircraft registration", "reg"],
  },
  { label: "Model", aliases: ["model"] },
  { label: "MSN", aliases: ["msn", "manufacturer serial number"] },
  {
    label: "Base",
    aliases: ["base", "base location", "base_location", "home base"],
  },
];

export function validateAircraftFleetImportHeaderRow(
  rowCells: unknown[]
): { ok: true } | { ok: false; missing: string[] } {
  const normalized = new Set(
    rowCells
      .map((c) => normalizeFleetImportHeaderCell(c))
      .filter((s) => s.length > 0)
  );
  const missing: string[] = [];
  for (const group of AIRCRAFT_FLEET_IMPORT_REQUIRED_HEADER_GROUPS) {
    const found = group.aliases.some((a) => normalized.has(a));
    if (!found) missing.push(group.label);
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/** First sheet, first row as raw cell values (including empty strings for gaps). */
export async function readExcelFirstRowCells(file: File): Promise<unknown[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  const first = rows[0];
  return Array.isArray(first) ? first : [];
}
