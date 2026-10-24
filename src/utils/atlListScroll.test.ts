import { describe, expect, it } from "vitest";
import {
  ATL_LIST_MIN_ROW_HEIGHT,
  ATL_LIST_SCROLLBAR_ALLOWANCE,
  atlListBodyHeight,
  atlListDisplayedRowCount,
  atlListFrameHeight,
  atlListScrollHeight,
  atlStickyHeaderRowHeight,
} from "./atlListScroll";

describe("atlListDisplayedRowCount", () => {
  it("shows a full page of 50", () => {
    expect(atlListDisplayedRowCount(50, 50)).toBe(50);
  });

  it("shows only the records left on the last page", () => {
    expect(atlListDisplayedRowCount(50, 20)).toBe(20);
  });

  it("shows all 91 records when the page size is 500", () => {
    expect(atlListDisplayedRowCount(500, 91)).toBe(91);
  });

  it("does not invent rows when the page is empty", () => {
    expect(atlListDisplayedRowCount(50, 0)).toBe(0);
    expect(atlListDisplayedRowCount(Number.NaN, 10)).toBe(0);
  });
});

describe("atlListBodyHeight", () => {
  it("sums the rendered row heights", () => {
    expect(atlListBodyHeight([40, 80, 36])).toBe(156);
  });

  it("does not pad a short page out to the page size", () => {
    const shortPage = atlListBodyHeight([40, 90]);
    expect(shortPage).toBe(130);
    expect(shortPage).not.toBe(50 * 40);
  });

  it("adds no height when there are no rows", () => {
    expect(atlListBodyHeight([])).toBe(0);
  });
});

describe("atlListScrollHeight", () => {
  it("is the header plus the body rows and the horizontal scrollbar", () => {
    expect(atlListScrollHeight(96, Array.from({ length: 50 }, () => 40))).toBe(
      96 + 50 * 40 + ATL_LIST_SCROLLBAR_ALLOWANCE
    );
  });

  it("is only as tall as the rows that exist", () => {
    expect(atlListScrollHeight(96, Array.from({ length: 91 }, () => 40))).toBe(
      96 + 91 * 40 + ATL_LIST_SCROLLBAR_ALLOWANCE
    );
  });
});

describe("atlListFrameHeight", () => {
  const header = [72, 36];

  it("grows with every row on a full page of 50", () => {
    const rows = Array.from({ length: 50 }, () => 64);
    expect(atlListFrameHeight(header, rows, 50)).toBe(
      72 + 36 + 50 * 64 + ATL_LIST_SCROLLBAR_ALLOWANCE
    );
  });

  it("grows when the page size goes from 50 to 100", () => {
    const rows = Array.from({ length: 100 }, () => 64);
    const page50 = atlListFrameHeight(header, rows.slice(0, 50), 50);
    const page100 = atlListFrameHeight(header, rows, 100);
    expect(page100).toBe(page50 + 50 * 64);
  });

  it("stays as tall as the records left on the last page", () => {
    const rows = Array.from({ length: 41 }, () => 64);
    expect(atlListFrameHeight(header, rows, 50)).toBe(
      72 + 36 + 41 * 64 + ATL_LIST_SCROLLBAR_ALLOWANCE
    );
  });

  it("uses a row height when the browser reports a collapsed row", () => {
    expect(atlListFrameHeight([80], [0, 0, 0], 50)).toBe(
      80 + 3 * ATL_LIST_MIN_ROW_HEIGHT + ATL_LIST_SCROLLBAR_ALLOWANCE
    );
  });
});

describe("atlStickyHeaderRowHeight", () => {
  it("uses the layout height when sticky positioning stretches the visual rect", () => {
    expect(atlStickyHeaderRowHeight(48, 900)).toBe(48);
  });

  it("uses the visual height when it is the real row", () => {
    expect(atlStickyHeaderRowHeight(0, 36)).toBe(36);
  });

  it("rejects a height large enough to cover the records", () => {
    expect(atlStickyHeaderRowHeight(800, 800)).toBe(0);
  });
});
