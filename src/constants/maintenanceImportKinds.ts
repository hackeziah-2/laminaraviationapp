/** Excel import route keys for maintenance forecasting (match URL segments). */
export type MaintenanceImportKind =
  | "maintenance-ldnd"
  | "maintenance-ad"
  | "maintenance-ad-work-orders"
  | "maintenance-tcc"
  | "maintenance-cpcp";

export const MAINTENANCE_IMPORT_KIND_LABELS: Record<
  MaintenanceImportKind,
  string
> = {
  "maintenance-ldnd": "LDND",
  "maintenance-ad": "AD",
  "maintenance-ad-work-orders": "AD Work Orders",
  "maintenance-tcc": "TCC",
  "maintenance-cpcp": "CPCP",
};
