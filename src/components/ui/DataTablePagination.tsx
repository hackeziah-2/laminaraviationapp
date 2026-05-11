import * as React from "react";
import { cn } from "./utils";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const SELECT_CHEVRON_STYLE = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
};

/** Page indices with ellipsis for gaps (e.g. 1 … 5 6 7 … 20). */
export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingDelta = 1
): Array<number | "ellipsis"> {
  if (totalPages <= 0) return [];
  const delta = Math.max(0, siblingDelta);
  const range: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      range.push(i);
    }
  }
  const out: Array<number | "ellipsis"> = [];
  let prev: number | undefined;
  for (const i of range) {
    if (prev !== undefined) {
      if (i - prev === 2) {
        out.push(prev + 1);
      } else if (i - prev > 2) {
        out.push("ellipsis");
      }
    }
    out.push(i);
    prev = i;
  }
  return out;
}

export type DataTablePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  totalLabel?: string;
  itemsPerPage?: number;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
  /** Shown as “{label}:” before the page-size select (no trailing colon in prop). */
  rowsPerPageLabel?: string;
  disabled?: boolean;
  showRangeText?: boolean;
  siblingDelta?: number;
  className?: string;
};

const prevNextBtn =
  "px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm";

const pageBtnBase =
  "min-w-[2rem] px-3 py-1.5 rounded transition-colors text-sm";

const pageSizeSelectClass =
  "bg-no-repeat px-2 py-1 pr-6 text-sm text-gray-900 bg-white border border-gray-300 rounded appearance-none bg-[length:12px] bg-[right_0.25rem_center] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed";

export function DataTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = 0,
  totalLabel = "entries",
  itemsPerPage: itemsPerPageProp,
  onItemsPerPageChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  rowsPerPageLabel = "Items per page",
  disabled = false,
  showRangeText = true,
  siblingDelta = 1,
  className,
}: DataTablePaginationProps) {
  const pageSizeId = React.useId();
  const hasItemsPerPage =
    itemsPerPageProp != null && onItemsPerPageChange != null;
  const itemsPerPage = itemsPerPageProp ?? 10;

  const labelBase = rowsPerPageLabel.replace(/:\s*$/, "").trim();

  const startItem =
    totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageItems = React.useMemo(
    () => getPaginationItems(currentPage, totalPages, siblingDelta),
    [currentPage, totalPages, siblingDelta]
  );

  const canPrev = !disabled && totalPages > 1 && currentPage > 1;
  const canNext = !disabled && totalPages > 1 && currentPage < totalPages;

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-x-4 gap-y-3 border-t border-gray-200 bg-white py-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-x-4 gap-y-2">
        {showRangeText && totalItems >= 0 ? (
          <p className="text-sm text-gray-700">
            <span className="text-gray-700">Showing </span>
            <span className="tabular-nums font-medium text-gray-900">
              {startItem}–{endItem}
            </span>
            <span className="text-gray-700"> of </span>
            <span className="tabular-nums font-medium text-gray-900">
              {totalItems}
            </span>
            <span className="text-gray-700"> {totalLabel}</span>
          </p>
        ) : null}

        {hasItemsPerPage ? (
          <div className="flex items-center gap-2">
            <label
              htmlFor={pageSizeId}
              className="whitespace-nowrap text-sm text-gray-700"
            >
              {labelBase}:
            </label>
            <select
              id={pageSizeId}
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              disabled={disabled}
              className={pageSizeSelectClass}
              style={SELECT_CHEVRON_STYLE}
              aria-label={`${labelBase}, current value ${itemsPerPage}`}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {totalPages > 0 ? (
        <div className="ms-auto flex shrink-0 items-center justify-end">
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={!canPrev}
              className={prevNextBtn}
            >
              Previous
            </button>

            {pageItems.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  className="min-w-[2rem] px-1 text-center text-sm text-gray-400 select-none"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  disabled={disabled}
                  aria-current={currentPage === item ? "page" : undefined}
                  className={cn(
                    pageBtnBase,
                    currentPage === item
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={!canNext}
              className={cn(prevNextBtn, "flex items-center gap-1")}
            >
              <span>Next</span>
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
