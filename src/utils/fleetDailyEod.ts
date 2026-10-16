/** Numeric tach suitable for the Daily Update EOD field. Blank when the value is missing. */
export function formatTachReadingForEod(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  const raw = String(value).trim();
  if (raw === "") return "";
  const parsed = Number(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) ? String(parsed) : "";
}

/** Latest Operation ATL used to decide whether EOD should move. */
export type OperationAtlEodSource = {
  id: number;
  tachEnd: unknown;
};

export type FleetDailyEodDecision = {
  value: string;
  /**
   * Operation entry already reflected by the current EOD.
   * Stays on the previous id while a newer entry is only being shown.
   */
  appliedAtlId: number | null;
};

const APPLIED_ATL_STORAGE_KEY = "fleet-daily-eod-applied-atl";

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function isZeroTach(value: string): boolean {
  return value !== "" && Number(value) === 0;
}

/**
 * Keep the current EOD until a newer Operation ATL exists.
 * A newer entry replaces EOD with that entry's Tach End.
 * An empty or zero EOD takes the latest Tach End. The result stays editable.
 */
export function resolveFleetDailyTachEod(input: {
  storedTachEod: unknown;
  latestEntry: OperationAtlEodSource | null;
  appliedAtlId?: number | null;
}): FleetDailyEodDecision {
  const stored = formatTachReadingForEod(input.storedTachEod);
  const latestId = positiveId(input.latestEntry?.id);
  const latestTach =
    latestId != null ? formatTachReadingForEod(input.latestEntry?.tachEnd) : "";
  const applied = positiveId(input.appliedAtlId);

  if (latestId == null || latestTach === "") {
    return { value: stored, appliedAtlId: applied };
  }

  if (stored === "" || isZeroTach(stored)) {
    return { value: latestTach, appliedAtlId: latestId };
  }

  // The entry already on file is not a new Operation entry.
  if (applied == null) {
    return { value: stored, appliedAtlId: latestId };
  }

  if (latestId > applied) {
    if (latestTach === stored) {
      return { value: stored, appliedAtlId: latestId };
    }
    return { value: latestTach, appliedAtlId: applied };
  }

  return { value: stored, appliedAtlId: applied };
}

function readAppliedAtlMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(APPLIED_ATL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

export function readAppliedOperationAtlId(aircraftId: number): number | null {
  if (positiveId(aircraftId) == null) return null;
  return positiveId(readAppliedAtlMap()[String(aircraftId)]);
}

export function writeAppliedOperationAtlId(
  aircraftId: number,
  atlId: number
): void {
  if (positiveId(aircraftId) == null || positiveId(atlId) == null) return;
  try {
    const map = readAppliedAtlMap();
    map[String(aircraftId)] = atlId;
    localStorage.setItem(APPLIED_ATL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Private-mode storage failures leave the current EOD unchanged.
  }
}
