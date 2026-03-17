import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./utils";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const SELECT_CHEVRON_STYLE = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
};

export type DataTablePaginationProps = {
  /** Current 1-based page */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Total number of items (for "Showing X to Y of Z") */
  totalItems?: number;
  /** Label for total (e.g. "entries", "records", "aircraft") */
  totalLabel?: string;
  /** Show "Items per page" selector; requires itemsPerPage and onItemsPerPageChange */
  itemsPerPage?: number;
  onItemsPerPageChange?: (size: number) => void;
  /** Options for items per page dropdown */
  pageSizeOptions?: number[];
  /** Disabled state (e.g. loading) */
  disabled?: boolean;
  /** Show "Showing X to Y of Z" text in the bar */
  showRangeText?: boolean;
  /** Max page number buttons to show before ellipsis */
  maxVisiblePages?: number;
  className?: string;
};

export function DataTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = 0,
  totalLabel = "entries",
  itemsPerPage: itemsPerPageProp,
  onItemsPerPageChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  disabled = false,
  showRangeText = true,
  maxVisiblePages = 5,
  className,
}: DataTablePaginationProps) {
  const hasItemsPerPage =
    itemsPerPageProp != null && onItemsPerPageChange != null;
  const itemsPerPage = itemsPerPageProp ?? 10;

  const startItem =
    totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 0) return [];
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return Array.from({ length: maxVisiblePages }, (_, i) => i + 1);
    }
    if (currentPage >= totalPages - 2) {
      return Array.from(
        { length: maxVisiblePages },
        (_, i) => totalPages - maxVisiblePages + 1 + i
      );
    }
    return Array.from(
      { length: maxVisiblePages },
      (_, i) => currentPage - 2 + i
    );
  }, [currentPage, totalPages, maxVisiblePages]);

  const showTrailingEllipsis =
    totalPages > maxVisiblePages && currentPage < totalPages - 2;
  const canPrev = currentPage > 1 && !disabled;
  const canNext = currentPage < totalPages && totalPages > 0 && !disabled;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        {hasItemsPerPage && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              disabled={disabled}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm appearance-none bg-no-repeat bg-[length:12px] bg-[right_0.25rem_center] pr-6 disabled:opacity-50 disabled:cursor-not-allowed"
              style={SELECT_CHEVRON_STYLE}
              aria-label="Items per page"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
        {showRangeText && totalItems >= 0 && (
          <div className="text-sm text-gray-700">
            Showing {startItem} to {endItem} of {totalItems} {totalLabel}
          </div>
        )}
      </div>

      {totalPages > 0 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={!canPrev}
            aria-label="Previous page"
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              disabled={disabled}
              aria-current={currentPage === page ? "page" : undefined}
              className={cn(
                "min-w-[2rem] px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                currentPage === page
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {page}
            </button>
          ))}
          {showTrailingEllipsis && (
            <>
              <span className="px-2 text-gray-500" aria-hidden>
                ...
              </span>
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={disabled}
                className="min-w-[2rem] px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={!canNext}
            aria-label="Next page"
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 flex items-center gap-1"
          >
            <span className="text-sm">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
