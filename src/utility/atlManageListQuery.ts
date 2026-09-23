/** Sentinel sent as `atl_batch` / `atl_batch_fk` when every batch should be included. */
export const ATL_BATCH_FILTER_ALL = "all";

/**
 * Query value for GET /aircraft-technical-log/manage/paged.
 * Blank or "all" includes assigned batches and rows with atl_batch_fk IS NULL.
 * A positive id filters to that batch only.
 */
export function atlBatchQueryParam(selectedAtlBatchId: string): number | "all" {
  const trimmed = selectedAtlBatchId.trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === ATL_BATCH_FILTER_ALL
  ) {
    return ATL_BATCH_FILTER_ALL;
  }
  const batchId = Number(trimmed);
  if (Number.isFinite(batchId) && batchId > 0) return batchId;
  return ATL_BATCH_FILTER_ALL;
}

/**
 * Aircraft changes must not keep the previous aircraft's batch filter or page.
 * Returns the reset list state, or null when the aircraft did not change.
 */
export function resetAtlManageListOnAircraftChange(args: {
  currentAircraftId: string;
  nextAircraftId: string;
}): { batchId: string; page: number } | null {
  if (args.nextAircraftId === args.currentAircraftId) return null;
  return { batchId: "", page: 1 };
}
