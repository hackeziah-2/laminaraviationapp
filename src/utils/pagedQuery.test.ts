import { describe, expect, it } from "vitest";
import {
  DEFAULT_API_PAGE_SIZE,
  MAX_API_PAGE_SIZE,
  resolveApiPageSize,
} from "../constants/pagination";
import {
  appendPagedQueryParams,
  collectAllPagedItems,
  extractPagedItems,
  parsePagedMeta,
  parsePagedResponse,
  pagedQueryRecord,
} from "./pagedQuery";

describe("resolveApiPageSize", () => {
  it("keeps 50, 100, and 500 and snaps everything else", () => {
    expect(resolveApiPageSize(50)).toBe(50);
    expect(resolveApiPageSize(100)).toBe(100);
    expect(resolveApiPageSize(500)).toBe(500);
    expect(resolveApiPageSize(10)).toBe(50);
    expect(resolveApiPageSize(25)).toBe(50);
    expect(resolveApiPageSize(1000)).toBe(500);
  });
});

describe("appendPagedQueryParams", () => {
  it("sends page and page_size on every request", () => {
    const params = new URLSearchParams();
    appendPagedQueryParams(params, 2, 100);
    expect(params.get("page")).toBe("2");
    expect(params.get("page_size")).toBe("100");
    expect(params.get("limit")).toBe("100");
  });

  it("sends 50, 100, and 500 as both page_size and limit", () => {
    for (const size of [50, 100, 500] as const) {
      const params = new URLSearchParams();
      appendPagedQueryParams(params, 1, size);
      expect(params.get("page_size")).toBe(String(size));
      expect(params.get("limit")).toBe(String(size));
    }
  });

  it("clamps invalid values and never allows 1000", () => {
    const params = new URLSearchParams();
    appendPagedQueryParams(params, 0, 1000);
    expect(params.get("page")).toBe("1");
    expect(params.get("page_size")).toBe(String(MAX_API_PAGE_SIZE));
    expect(MAX_API_PAGE_SIZE).toBe(500);
  });

  it("snaps 10 and 25 up to the default of 50", () => {
    const params = new URLSearchParams();
    appendPagedQueryParams(params, 1, 10);
    expect(params.get("page_size")).toBe("50");
  });
});

describe("pagedQueryRecord", () => {
  it("defaults to page 1 and page size 50", () => {
    expect(pagedQueryRecord(Number.NaN, Number.NaN)).toEqual({
      page: 1,
      page_size: DEFAULT_API_PAGE_SIZE,
      limit: DEFAULT_API_PAGE_SIZE,
    });
    expect(pagedQueryRecord(1, 500)).toEqual({
      page: 1,
      page_size: 500,
      limit: 500,
    });
  });
});

describe("parsePagedMeta", () => {
  it("uses items, total, page, page_size, and pages from the backend envelope", () => {
    const meta = parsePagedMeta(
      { items: [{ id: 1 }], total: 2500, page: 1, page_size: 50, pages: 50 },
      3,
      50
    );
    expect(meta).toEqual({
      total: 2500,
      page: 1,
      page_size: 50,
      pages: 50,
    });
  });

  it("falls back to count/limit aliases when pages is omitted", () => {
    const meta = parsePagedMeta(
      { results: [], count: 100, page_size: 50 },
      1,
      50
    );
    expect(meta.total).toBe(100);
    expect(meta.page_size).toBe(50);
    expect(meta.pages).toBe(2);
  });
});

describe("extractPagedItems / parsePagedResponse", () => {
  it("reads items from the standard envelope", () => {
    const payload = {
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
      page: 1,
      page_size: 50,
      pages: 1,
    };
    expect(extractPagedItems(payload)).toHaveLength(2);
    const parsed = parsePagedResponse(
      payload,
      (raw) => (raw as { id: number }).id,
      { page: 1, pageSize: 50 }
    );
    expect(parsed).toEqual({
      items: [1, 2],
      total: 2,
      page: 1,
      page_size: 50,
      pages: 1,
    });
  });
});

describe("collectAllPagedItems", () => {
  it("walks every page at page_size 500", async () => {
    const items = await collectAllPagedItems(async (page, pageSize) => {
      expect(pageSize).toBe(500);
      if (page === 1) {
        return { items: [1, 2], total: 3, pages: 2 };
      }
      return { items: [3], total: 3, pages: 2 };
    });
    expect(items).toEqual([1, 2, 3]);
  });
});
