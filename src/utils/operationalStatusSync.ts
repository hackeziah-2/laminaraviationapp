export const OPERATIONAL_STATUS_OPTIONS = [
  "Operational",
  "Ongoing Maintenance",
  "AOG",
] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUS_OPTIONS)[number];

const OPERATIONAL_STATUS_SET = new Set<string>(OPERATIONAL_STATUS_OPTIONS);

export const OPERATIONAL_STATUS_REQUIRES_DAILY_UPDATE =
  "Create a Fleet Daily Update before changing operational status.";

export function fleetDailyUpdateMatchesAircraft(
  item: { id?: number; aircraftId?: number; aircraft?: { id?: number } } | null,
  aircraftId: number
): boolean {
  if (item?.id == null || !Number.isFinite(aircraftId)) return false;
  const owner = item.aircraftId ?? item.aircraft?.id;
  if (owner == null) return true;
  return Number(owner) === aircraftId;
}

/**
 * Decide whether an Aircraft Details save should write operational status.
 * A matching Fleet Daily Update is required. An unchanged value is not written.
 */
export function operationalStatusToSave(options: {
  hasDailyUpdate: boolean;
  savedStatus: string | null;
  draftStatus: string;
}): { status: OperationalStatus | null; error: string | null } {
  const draft = options.draftStatus.trim();
  const saved = (options.savedStatus ?? "").trim();
  if (!options.hasDailyUpdate) {
    if (draft && draft !== saved) {
      return { status: null, error: OPERATIONAL_STATUS_REQUIRES_DAILY_UPDATE };
    }
    return { status: null, error: null };
  }
  if (!draft || draft === saved) return { status: null, error: null };
  if (!OPERATIONAL_STATUS_SET.has(draft)) {
    return {
      status: null,
      error: "Operational status must be Operational, Ongoing Maintenance, or AOG.",
    };
  }
  return { status: draft as OperationalStatus, error: null };
}
