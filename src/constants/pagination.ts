export const API_PAGE_SIZE_OPTIONS = [50, 100, 500] as const;
export const DEFAULT_API_PAGE_SIZE = 50;
/** Cap list requests; 1000 is excluded to avoid slow API and render issues. */
export const MAX_API_PAGE_SIZE = 500;

export type ApiPageSize = (typeof API_PAGE_SIZE_OPTIONS)[number];

/** Snap any page size to the allowed 50 / 100 / 500 set. */
export function resolveApiPageSize(value: unknown): ApiPageSize {
  const n = Math.trunc(Number(value));
  if (n >= 500) return 500;
  if (n >= 100) return 100;
  return DEFAULT_API_PAGE_SIZE;
}
