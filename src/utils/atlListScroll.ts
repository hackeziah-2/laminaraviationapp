/** Room under the last row so the horizontal scrollbar does not cover it. */
export const ATL_LIST_SCROLLBAR_ALLOWANCE = 16;

/** Used when a body row has not been laid out yet. Matches the padded list cells. */
export const ATL_LIST_MIN_ROW_HEIGHT = 48;

/** A real header row stays under this. Taller values are a stretched sticky cell. */
export const ATL_HEADER_ROW_MAX_HEIGHT = 220;

/**
 * Tallest sticky header row we will trust. A sticky `tr` rect can grow to the
 * whole list once `top` is too large, which then pushes the next header row
 * over the body and hides every record after the first.
 */
export const ATL_STICKY_HEADER_ROW_MAX_HEIGHT = 160;

/**
 * Height used for the next sticky header row's `top`.
 * Prefer the layout height when the visual rect has been stretched by sticky.
 */
export function atlStickyHeaderRowHeight(
  layoutHeight: number,
  visualHeight: number
): number {
  const layout = Number.isFinite(layoutHeight) ? Math.ceil(layoutHeight) : 0;
  const visual = Number.isFinite(visualHeight) ? Math.ceil(visualHeight) : 0;
  const height = layout > 0 && visual > layout ? layout : Math.max(layout, visual);
  if (height <= 0 || height > ATL_STICKY_HEADER_ROW_MAX_HEIGHT) return 0;
  return height;
}

/**
 * How many body rows the current page should show.
 * Never pads up to the page size when fewer records remain.
 */
export function atlListDisplayedRowCount(
  pageSize: number,
  recordsOnPage: number
): number {
  const page = Number.isFinite(pageSize) ? Math.max(0, Math.floor(pageSize)) : 0;
  const records = Number.isFinite(recordsOnPage)
    ? Math.max(0, Math.floor(recordsOnPage))
    : 0;
  return Math.min(page, records);
}

/** Sum of the rendered body-row heights. An empty page adds no blank rows. */
export function atlListBodyHeight(rowHeights: number[]): number {
  if (!Array.isArray(rowHeights) || rowHeights.length === 0) return 0;
  return rowHeights.reduce((sum, height) => {
    if (!Number.isFinite(height) || height <= 0) return sum;
    return sum + height;
  }, 0);
}

/**
 * Scroller height for the header plus the rows on this page.
 * Does not reserve space for rows that are not rendered.
 */
export function atlListScrollHeight(
  headerHeight: number,
  rowHeights: number[]
): number {
  const header =
    Number.isFinite(headerHeight) && headerHeight > 0 ? headerHeight : 0;
  const body = atlListBodyHeight(rowHeights);
  if (header <= 0 && body <= 0) return 0;
  return Math.ceil(header + body) + ATL_LIST_SCROLLBAR_ALLOWANCE;
}

/**
 * Keep a real measured row. A missing or collapsed measurement uses `fallback`.
 * Values above `max` are a stretched sticky cell, not content.
 */
export function atlListMeasuredRowHeight(
  measured: number,
  fallback: number,
  max: number
): number {
  if (!Number.isFinite(measured) || measured < 20) return fallback;
  return Math.min(Math.ceil(measured), max);
}

/**
 * Height of the list scroller for this page.
 * Header rows plus the records pagination actually rendered — not a full page of blanks.
 */
export function atlListFrameHeight(
  headerRowHeights: readonly number[],
  bodyRowHeights: readonly number[],
  pageSize: number
): number {
  const header = atlListBodyHeight(
    headerRowHeights.map((height) =>
      atlListMeasuredRowHeight(height, 0, ATL_HEADER_ROW_MAX_HEIGHT)
    )
  );
  const displayed = atlListDisplayedRowCount(pageSize, bodyRowHeights.length);
  const rows = bodyRowHeights
    .slice(0, displayed)
    .map((height) =>
      atlListMeasuredRowHeight(height, ATL_LIST_MIN_ROW_HEIGHT, 2000)
    );
  return atlListScrollHeight(header, rows);
}

function elementHeight(element: HTMLElement): number {
  const rect = element.getBoundingClientRect().height;
  if (rect > 0) return rect;
  if (element instanceof HTMLTableRowElement && element.cells[0]) {
    const cellHeight = element.cells[0].getBoundingClientRect().height;
    if (cellHeight > 0) return cellHeight;
    if (element.cells[0].offsetHeight > 0) return element.cells[0].offsetHeight;
  }
  return element.offsetHeight;
}

/** Text height of a header row, ignoring a sticky cell that has stretched. */
function headerRowContentHeight(row: HTMLTableRowElement): number {
  let max = 0;
  for (const cell of Array.from(row.cells)) {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const content = range.getBoundingClientRect().height;
    const style = window.getComputedStyle(cell);
    const extra =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0) +
      (Number.parseFloat(style.borderTopWidth) || 0) +
      (Number.parseFloat(style.borderBottomWidth) || 0);
    max = Math.max(max, content + extra);
  }
  return max > 0 ? max : elementHeight(row);
}

/**
 * Header and body row heights for the list scroller.
 * Header height follows the label text so a stretched sticky cell cannot
 * cover the records. Body height checks the cell box as well as the row,
 * because some browsers report `tr.offsetHeight` as 0.
 */
export function readAtlListFrame(scroller: HTMLElement): {
  headerRowHeights: number[];
  bodyRowHeights: number[];
} | null {
  const table = scroller.querySelector("table");
  const thead = table?.tHead;
  if (!table || !thead) return null;

  const dataRows = Array.from(
    table.querySelectorAll<HTMLTableRowElement>("tbody > tr[data-list-entry-id]")
  );
  const bodyRows =
    dataRows.length > 0
      ? dataRows
      : Array.from(
          table.querySelectorAll<HTMLTableRowElement>("tbody > tr")
        ).slice(0, 1);

  return {
    headerRowHeights: Array.from(thead.rows).map((row) =>
      headerRowContentHeight(row)
    ),
    bodyRowHeights: bodyRows.map((row) => elementHeight(row)),
  };
}
