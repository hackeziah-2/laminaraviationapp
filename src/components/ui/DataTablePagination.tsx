import * as React from "react";
import { cn } from "./utils";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const PAGE_SIZE_SELECT_CHEVRON = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`;

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

export type PageSizeSelectProps = {
  id?: string;
  value: number;
  options: number[];
  onChange: (size: number) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

const pageSizeSelectClass =
  "min-w-[3.75rem] cursor-pointer appearance-none rounded border border-gray-300 bg-white bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat py-1.5 pl-2.5 pr-8 text-left text-sm font-normal leading-normal text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-40";

/** Matches reference: “Items per page:” label + compact bordered dropdown. */
export function PageSizeSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  label = "Items per page",
  className,
}: PageSizeSelectProps) {
  const labelBase = label.replace(/:\s*$/, "").trim();

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <label
        htmlFor={id}
        className="whitespace-nowrap text-sm font-normal text-gray-900"
      >
        {labelBase}:
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={pageSizeSelectClass}
        style={{ backgroundImage: PAGE_SIZE_SELECT_CHEVRON }}
        aria-label={`${labelBase}, current value ${value}`}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
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

  const startItem =
    totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageItems = React.useMemo(
    () => getPaginationItems(currentPage, totalPages, siblingDelta),
    [currentPage, totalPages, siblingDelta]
  );

  const canPrev = !disabled && totalPages > 1 && currentPage > 1;
  const canNext = !disabled && totalPages > 1 && currentPage < totalPages;

  const showRange = showRangeText && totalItems >= 0;

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-end gap-x-4 gap-y-3 border-t border-gray-200 bg-white px-5 py-4",
        className
      )}
    >
      <div className="flex max-w-full flex-wrap items-center justify-end gap-3 sm:gap-4">
        {showRange ? (
          <p className="text-sm text-gray-700">
            <span>Showing </span>
            <span className="tabular-nums font-medium text-gray-900">
              {startItem}–{endItem}
            </span>
            <span> of </span>
            <span className="tabular-nums font-medium text-gray-900">
              {totalItems}
            </span>
            <span> {totalLabel}</span>
          </p>
        ) : null}

        {showRange && (hasItemsPerPage || totalPages > 0) ? (
          <span
            className="hidden h-5 w-px shrink-0 bg-gray-200 sm:block"
            aria-hidden
          />
        ) : null}

        {hasItemsPerPage ? (
          <PageSizeSelect
              id={pageSizeId}
              value={itemsPerPage}
              options={pageSizeOptions}
              onChange={(size) => {
                onItemsPerPageChange!(size);
                onPageChange(1);
              }}
              disabled={disabled}
              label={rowsPerPageLabel}
            />
        ) : null}

        {hasItemsPerPage && totalPages > 0 ? (
          <span
            className="hidden h-5 w-px shrink-0 bg-gray-200 sm:block"
            aria-hidden
          />
        ) : null}

        {totalPages > 0 ? (
          <nav
              className="flex max-w-full items-center gap-1 overflow-x-auto"
              aria-label="Pagination"
            >
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
                className={prevNextBtn}
              >
                Next
              </button>
            </nav>
        ) : null}
      </div>
    </div>
  );
}
