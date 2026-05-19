/** Excel import route keys for maintenance forecasting (match URL segments). */
export type MaintenanceImportKind =
  | "maintenance-ldnd"
  | "maintenance-ad"
  | "maintenance-tcc"
  | "maintenance-cpcp";

export const MAINTENANCE_IMPORT_KIND_LABELS: Record<
  MaintenanceImportKind,
  string
> = {
  "maintenance-ldnd": "LDND",
  "maintenance-ad": "AD",
  "maintenance-tcc": "TCC",
  "maintenance-cpcp": "CPCP",
};
