import {
  DEFAULT_API_PAGE_SIZE,
  MAX_API_PAGE_SIZE,
  resolveApiPageSize,
} from "../constants/pagination";

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export function normalizePage(page: unknown, fallback = 1): number {
  const n = Math.trunc(Number(page));
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

export function normalizePageSize(
  pageSize: unknown,
  _fallback = DEFAULT_API_PAGE_SIZE
): number {
  return resolveApiPageSize(pageSize);
}

/** Always send `page` and `page_size`. Also send `limit` for APIs that still read it. */
export function appendPagedQueryParams(
  params: URLSearchParams,
  page: number,
  pageSize: number
): { page: number; pageSize: number } {
  const safePage = normalizePage(page);
  const safeSize = normalizePageSize(pageSize);
  params.set("page", String(safePage));
  params.set("page_size", String(safeSize));
  params.set("limit", String(safeSize));
  return { page: safePage, pageSize: safeSize };
}

export function pagedQueryRecord(
  page: number,
  pageSize: number
): { page: number; page_size: number; limit: number } {
  const safePage = normalizePage(page);
  const safeSize = normalizePageSize(pageSize);
  return {
    page: safePage,
    page_size: safeSize,
    limit: safeSize,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function extractPagedItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  const inner = asRecord(root.data);
  const sources = [root, inner].filter(Boolean) as Record<string, unknown>[];
  for (const src of sources) {
    for (const key of ["items", "results", "data"] as const) {
      const value = src[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

export function parsePagedMeta(
  payload: unknown,
  fallbackPage: number,
  fallbackPageSize: number
): { total: number; page: number; page_size: number; pages: number } {
  const root = asRecord(payload);
  const inner = root ? asRecord(root.data) : null;
  const meta = root ? asRecord(root.meta) : null;
  const sources = [root, inner, meta].filter(
    Boolean
  ) as Record<string, unknown>[];

  const readNum = (keys: string[]): number => {
    for (const src of sources) {
      for (const key of keys) {
        const n = Number(src[key]);
        if (Number.isFinite(n)) return n;
      }
    }
    return NaN;
  };

  const totalRaw = readNum(["total", "count", "totalCount", "total_count"]);
  const pageRaw = readNum(["page", "currentPage", "current_page"]);
  const pagesRaw = readNum(["pages", "totalPages", "total_pages"]);
  const sizeRaw = readNum(["page_size", "pageSize", "limit"]);

  const pageSize = resolveApiPageSize(
    Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : fallbackPageSize
  );
  const total = Number.isFinite(totalRaw) ? Math.max(0, totalRaw) : 0;
  const page = Number.isFinite(pageRaw)
    ? Math.max(1, pageRaw)
    : normalizePage(fallbackPage);
  const pages = Number.isFinite(pagesRaw)
    ? Math.max(0, pagesRaw)
    : pageSize > 0
      ? Math.ceil(total / pageSize)
      : 0;

  return { total, page, page_size: pageSize, pages };
}

export function parsePagedResponse<T>(
  payload: unknown,
  mapItem: (raw: unknown) => T,
  fallback: { page: number; pageSize: number }
): PagedResult<T> {
  const items = extractPagedItems(payload).map(mapItem);
  const meta = parsePagedMeta(payload, fallback.page, fallback.pageSize);
  return {
    items,
    total: meta.total || items.length,
    page: meta.page,
    page_size: meta.page_size,
    pages: meta.pages,
  };
}

/** Walk every page at the API maximum size (500) so exports still receive all matches. */
export async function collectAllPagedItems<T>(
  fetchPage: (
    page: number,
    pageSize: number
  ) => Promise<{ items: T[]; total?: number; pages?: number }>
): Promise<T[]> {
  const pageSize = MAX_API_PAGE_SIZE;
  const items: T[] = [];
  let page = 1;
  let pages = 1;
  do {
    const res = await fetchPage(page, pageSize);
    const batch = Array.isArray(res.items) ? res.items : [];
    items.push(...batch);
    const reportedPages = Number(res.pages);
    const total = Number(res.total);
    if (Number.isFinite(reportedPages) && reportedPages > 0) {
      pages = reportedPages;
    } else if (Number.isFinite(total) && total >= 0) {
      pages = Math.max(1, Math.ceil(total / pageSize) || 1);
    } else if (batch.length < pageSize) {
      pages = page;
    } else {
      pages = page + 1;
    }
    page += 1;
  } while (page <= pages);
  return items;
}
