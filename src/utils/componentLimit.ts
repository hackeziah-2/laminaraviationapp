/** A component/interval limit of 0 means that unit has no limit. */
export function isConfiguredComponentLimit(
  value: number | null | undefined
): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function formatComponentLimitDisplay(
  value: number | null | undefined
): string {
  if (!isConfiguredComponentLimit(value)) return "-";
  return parseFloat(value.toFixed(2)).toString();
}
