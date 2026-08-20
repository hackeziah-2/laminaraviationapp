export type MaintenanceLogbookCategory =
  | "AIRFRAME"
  | "AVIONICS"
  | "ENGINE"
  | "PROPELLER";

/** Create-modal prefixes for logbook_seq_no. */
export const LOGBOOK_SEQ_NO_PREFIX: Record<MaintenanceLogbookCategory, string> =
  {
    AIRFRAME: "LAI-A-",
    AVIONICS: "LAI-AV-",
    ENGINE: "LAI-E-",
    PROPELLER: "LAI-P-",
  };

export function getLogbookSeqNoPrefix(
  category: MaintenanceLogbookCategory
): string {
  return LOGBOOK_SEQ_NO_PREFIX[category];
}
