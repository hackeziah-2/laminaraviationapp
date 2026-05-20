import type { MaintenanceImportKind } from "../constants/maintenanceImportKinds";
import {
  normalizeFleetImportHeaderCell,
  readExcelFirstRowCells,
} from "./aircraftFleetImportExcelHeaders";

const LDND_IMPORT_HEADERS = [
  "INSPECTION TYPE",
  "UNIT",
  "LAST DONE TACH DUE",
  "LAST DONE TACH DONE",
  "NEXT DUE TACH HOURS",
] as const;

const AD_IMPORT_HEADERS = [
  "AD NUMBER",
  "SUBJECT",
  "INSPECTION INTERVAL",
  "DATE OF EFFECTIVITY",
] as const;

const AD_WORK_ORDERS_IMPORT_HEADERS = [
  "WO NUMBER",
  "LAST DONE ACTT",
  "LAST DONE TACH",
  "LAST DONE DATE",
  "NEXT DONE ACTT",
  "TACH",
  "ATL REF",
] as const;

const TCC_IMPORT_REQUIRED_HEADERS = [
  "CATEGORY",
  "PART NUMBER",
  "SERIAL NUMBER",
  "DESCRIPTION",
  "COMPONENT METHOD OF COMPLIANCE",
  "LAST DONE DATE",
  "LAST DONE TACH",
  "LAST DONE AFTT",
  "LAST DONE METHOD OF COMPLIANCE",
  "COMPONENT LIMIT YEARS",
  "COMPONENT LIMIT HOURS",
] as const;

/**
 * First-row header: user supplies ATL sequence number under either column name.
 * Server import should map that value → ATL row → `atl_ref` / `atl_fk` on TCC.
 */
const TCC_SEQUENCE_HEADER_GROUP = {
  label: "Sequence No. or ATL Ref",
  aliases: ["sequence no.", "sequence no", "atl ref"],
} as const;

const CPCP_IMPORT_HEADERS = [
  "INSPECTION OPERATION",
  "DESCRIPTION",
  "INTERVAL HOURS",
  "INTERVAL MONTHS",
  "LAST DONE TACH",
  "LAST DONE AFTT",
  "LAST DONE DATE",
  "SEQUENCE NO.",
] as const;

const REQUIRED_HEADERS_BY_KIND: Record<
  MaintenanceImportKind,
  readonly string[]
> = {
  "maintenance-ldnd": LDND_IMPORT_HEADERS,
  "maintenance-ad": AD_IMPORT_HEADERS,
  "maintenance-ad-work-orders": AD_WORK_ORDERS_IMPORT_HEADERS,
  "maintenance-tcc": [...TCC_IMPORT_REQUIRED_HEADERS],
  "maintenance-cpcp": CPCP_IMPORT_HEADERS,
};

function validateRequiredHeaders(
  normalized: Set<string>,
  headers: readonly string[],
  missing: string[]
): void {
  for (const header of headers) {
    if (!normalized.has(normalizeFleetImportHeaderCell(header))) {
      missing.push(header);
    }
  }
}

export function validateMaintenanceImportHeaderRow(
  kind: MaintenanceImportKind,
  rowCells: unknown[]
): { ok: true } | { ok: false; missing: string[] } {
  const normalized = new Set(
    rowCells
      .map((c) => normalizeFleetImportHeaderCell(c))
      .filter((s) => s.length > 0)
  );
  const missing: string[] = [];
  validateRequiredHeaders(normalized, REQUIRED_HEADERS_BY_KIND[kind], missing);

  if (kind === "maintenance-tcc") {
    const hasSequenceOrAtl = TCC_SEQUENCE_HEADER_GROUP.aliases.some((alias) =>
      normalized.has(alias)
    );
    if (!hasSequenceOrAtl) {
      missing.push(TCC_SEQUENCE_HEADER_GROUP.label);
    }
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

export async function readMaintenanceImportHeaderRow(
  file: File
): Promise<unknown[]> {
  return readExcelFirstRowCells(file);
}
