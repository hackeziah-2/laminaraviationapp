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
  "maintenance-tcc",
  "maintenance-cpcp",
]);

export interface MaintenanceImportProgress {
  jobId: string;
  progress?: number;
  status: string;
  message?: string;
  totalRows?: number;
  processedRows?: number;
  failedRows?: number;
  errors?: unknown;
}

function firstFiniteNumber(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseMaintenanceImportProgress(raw: unknown): MaintenanceImportProgress {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const jobId = String(o.job_id ?? o.jobId ?? "").trim();
  return {
    jobId,
    progress: firstFiniteNumber(
      o.progress,
      o.progress_percent,
      o.progressPercent,
      o.percent,
      o.percent_complete,
      o.percentComplete
    ),
    status: String(o.status ?? "").trim(),
    message:
      o.message != null && String(o.message).trim() !== ""
        ? String(o.message)
        : undefined,
    totalRows: firstFiniteNumber(
      o.total_rows,
      o.totalRows,
      o.total,
      o.row_count,
      o.rowCount
    ),
    processedRows: firstFiniteNumber(
      o.processed_rows,
      o.processedRows,
      o.processed,
      o.success_rows,
      o.successRows
    ),
    failedRows: firstFiniteNumber(
      o.failed_rows,
      o.failedRows,
      o.failed,
      o.error_rows,
      o.errorRows
    ),
    errors: o.errors,
  };
}

function isTerminalImportStatus(st: string): boolean {
  const u = st.toUpperCase().replace(/\s+/g, "_");
  return (
    u === "COMPLETED" ||
    u === "COMPLETE" ||
    u === "SUCCESS" ||
    u === "FAILED" ||
    u === "ERROR" ||
    u === "CANCELLED"
  );
}

function importRowsDoneCount(data: MaintenanceImportProgress): number | undefined {
  const total = data.totalRows ?? 0;
  if (total <= 0) return undefined;
  const processed = Math.max(0, data.processedRows ?? 0);
  const failed = Math.max(0, data.failedRows ?? 0);
  const sum = Math.min(total, processed + failed);
  return sum;
}

function normalizeProgressField(
  p: number | undefined
): number | undefined {
  if (p == null || !Number.isFinite(p)) return undefined;
  if (p > 0 && p <= 1) return Math.min(100, Math.round(p * 100));
  return Math.min(100, Math.max(0, Math.round(p)));
}

export function getMaintenanceImportProgressPercent(
  data: MaintenanceImportProgress
): number {
  const st = data.status.toUpperCase().replace(/\s+/g, "_");
  if (st === "COMPLETED" || st === "COMPLETE" || st === "SUCCESS") return 100;
  const fromProg = normalizeProgressField(data.progress);
  if (fromProg != null) {
    if (fromProg >= 100 && !isTerminalImportStatus(data.status)) return 99;
    return fromProg;
  }
  const done = importRowsDoneCount(data);
  if (done != null && (data.totalRows ?? 0) > 0) {
    const pct = Math.round((done / (data.totalRows ?? 1)) * 100);
    if (pct >= 100 && !isTerminalImportStatus(data.status)) return 99;
    return Math.min(100, Math.max(0, pct));
  }
  if (st.includes("PEND") || st === "QUEUED" || st === "WAITING") return 2;
  if (st.includes("RUN") || st.includes("PROCESS") || st.includes("IMPORT")) return 8;
  return 0;
}

export function formatMaintenanceImportProgressLabel(
  data: MaintenanceImportProgress
): string {
  const msg = data.message?.trim();
  const total = data.totalRows ?? 0;
  const done = importRowsDoneCount(data);
  if (msg && done != null && total > 0) return `${msg} · ${done} of ${total} rows`;
  if (done != null && total > 0) return `${done} of ${total} rows`;
  if (msg) return msg;
  return "Processing…";
}

export async function getMaintenanceImportProgress(
  jobId: string
): Promise<MaintenanceImportProgress> {
  const res = await apiClient.get(`import-progress/${encodeURIComponent(jobId)}`, {
    headers: { Accept: "application/json" },
    timeout: 25_000,
  });
  const raw = res.data?.data ?? res.data;
  return parseMaintenanceImportProgress(raw);
}

export async function pollMaintenanceImportUntilDone(
  jobId: string,
  options?: {
    intervalMs?: number;
    onUpdate?: (data: MaintenanceImportProgress) => void;
  }
): Promise<MaintenanceImportProgress> {
  const intervalMs = options?.intervalMs ?? 500;
  let last: MaintenanceImportProgress;
  for (;;) {
    last = await getMaintenanceImportProgress(jobId);
    options?.onUpdate?.(last);
    if (isTerminalImportStatus(last.status)) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

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
 * Import TCC maintenance data from Excel.
 * POST api/v1/excel-data/maintenance-tcc/import
 * multipart: aircraft_id, file
 *
 * Backend contract (Sequence No. / ATL Ref column): the sheet may contain the ATL
 * **sequence number** (display value). The import service should resolve it for the
 * given `aircraft_id` (lookup ATL row by sequence_no / sequence_number), obtain the
 * ATL primary key, and persist `atl_ref` / `atl_fk` on the TCC row — same as manual
 * create/update via `reference` and `atlId` in `tccMonitoringApi.tsx`.
 */
export async function importTccMaintenanceExcel(
  aircraftId: number,
  file: File
): Promise<unknown> {
  if (!Number.isFinite(aircraftId) || aircraftId <= 0) {
    throw new Error("aircraft_id is required for TCC maintenance import.");
  }
  const formData = new FormData();
  formData.append("aircraft_id", String(aircraftId));
  formData.append("file", file);
  const response = await apiClient.post(
    "excel-data/maintenance-tcc/import",
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
 * LDND / AD / TCC / CPCP: POST api/v1/excel-data/{kind}/import?dry_run=…
 *   multipart: aircraft_id, file
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

  throw new Error(`Unsupported maintenance import kind: ${kind}`);
}
