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

const TCC_IMPORT_HEADERS = [
  "SEQUENCE NO",
  "CATEGORY",
  "REMAINING YEARS",
  "REMAINING DAYS",
  "REMAINING TACH",
  "REMAINING AFTT",
  "PART NO.",
  "SERIAL NO.",
  "DESCRIPTION",
  "COMPONENT LIMIT YEARS",
  "COMPONENT LIMIT HOURS",
  "METHOD OF COMPLIANCE",
  "LAST DONE DATE",
  "LAST DONE TACH",
  "LAST DONE AFTT",
  "NEXT DUE DATE",
  "NEXT DUE TACH",
  "NEXT DUE AFTT",
] as const;

const CPCP_IMPORT_HEADERS = [
  "SEQUENCE NO",
  "REMAINING YEARS",
  "REMAINING DAYS",
  "REMAINING TACH",
  "REMAINING",
  "INSPECTION OPERATION",
  "DESCRIPTION",
  "INTERNAL HOURS",
  "INTERNAL MONTHS",
  "LAST DONE DATE",
  "LAST DONE TACH",
  "LAST DONE AFTT",
  "NEXT DUE DATE",
  "NEXT DUE TACH",
  "NEXT DUE AFTT",
] as const;

const REQUIRED_HEADERS_BY_KIND: Record<
  MaintenanceImportKind,
  readonly string[]
> = {
  "maintenance-ldnd": LDND_IMPORT_HEADERS,
  "maintenance-ad": AD_IMPORT_HEADERS,
  "maintenance-tcc": TCC_IMPORT_HEADERS,
  "maintenance-cpcp": CPCP_IMPORT_HEADERS,
};

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
  for (const header of REQUIRED_HEADERS_BY_KIND[kind]) {
    if (!normalized.has(normalizeFleetImportHeaderCell(header))) {
      missing.push(header);
    }
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

export async function readMaintenanceImportHeaderRow(
  file: File
): Promise<unknown[]> {
  return readExcelFirstRowCells(file);
}
