import apiClient from "./index";
import type { MaintenanceImportKind } from "../constants/maintenanceImportKinds";
import { throwIfMaintenanceImportResponseFailed } from "../utility/utils";

export type ImportMaintenanceExcelOptions = {
  /** When true, validates the file without persisting (server dry-run). */
  dryRun?: boolean;
};

/** Kinds that POST to excel-data/{kind}/import with aircraft_id + dry_run. */
const AIRCRAFT_FORM_IMPORT_KINDS = new Set<MaintenanceImportKind>([
  "maintenance-ldnd",
  "maintenance-ad",
]);

/**
 * Import AD work orders from Excel.
 * POST api/v1/excel-data/maintenance-ad-work-orders/import
 * multipart: ad_monitoring_id, file
 */
export async function importAdWorkOrdersExcel(
  adMonitoringId: number,
  file: File
): Promise<unknown> {
  if (!Number.isFinite(adMonitoringId) || adMonitoringId <= 0) {
    throw new Error("ad_monitoring_id is required for AD work order import.");
  }
  const formData = new FormData();
  formData.append("ad_monitoring_id", String(adMonitoringId));
  formData.append("file", file);
  const response = await apiClient.post(
    "excel-data/maintenance-ad-work-orders/import",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  const data = response.data ?? response;
  throwIfMaintenanceImportResponseFailed(data);
  return data;
}

/**
 * Import maintenance forecasting data from Excel.
 *
 * LDND / AD: POST api/v1/excel-data/{kind}/import?dry_run=…
 *   multipart: aircraft_id, file
 *
 * TCC / CPCP: POST api/v1/excel-data/aircraft/{aircraftId}/{kind}/import
 *   multipart: file
 */
export async function importMaintenanceExcel(
  kind: MaintenanceImportKind,
  aircraftId: number,
  file: File,
  options?: ImportMaintenanceExcelOptions
): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);

  if (AIRCRAFT_FORM_IMPORT_KINDS.has(kind)) {
    formData.append("aircraft_id", String(aircraftId));
    const response = await apiClient.post(
      `excel-data/${kind}/import`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        params: { dry_run: options?.dryRun ?? false },
      }
    );
    const data = response.data ?? response;
    throwIfMaintenanceImportResponseFailed(data);
    return data;
  }

  const response = await apiClient.post(
    `excel-data/aircraft/${aircraftId}/${kind}/import`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  const data = response.data ?? response;
  throwIfMaintenanceImportResponseFailed(data);
  return data;
}
