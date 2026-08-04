import { useCallback, useLayoutEffect, useRef } from "react";

export type PreserveListViewSnapshot = {
  windowX: number;
  windowY: number;
  tableLeft: number;
  tableTop: number;
  entryId: number | null;
  page: number;
};

export type UsePreserveListViewOptions = {
  /** True while the edit modal/drawer is open. */
  isEditOpen: boolean;
  /** True during a hard/full-list loading state that unmounts the table. */
  loading: boolean;
  /** Re-apply restore when list data / layout deps change after soft refresh. */
  listDeps?: unknown[];
  /** Fallback selector when listScrollRef is not attached. */
  scrollSelector?: string;
};

const DEFAULT_SCROLL_SELECTOR = "[data-atl-list-scroll]";

/**
 * Captures and restores window + list scroll (and page) after a successful edit
 * so soft list refreshes do not jump to page 1 or scroll to the top.
 */
export function usePreserveListView({
  isEditOpen,
  loading,
  listDeps = [],
  scrollSelector = DEFAULT_SCROLL_SELECTOR,
}: UsePreserveListViewOptions) {
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingViewRestoreRef = useRef<PreserveListViewSnapshot | null>(null);

  const getListScrollEl = useCallback((): HTMLDivElement | null => {
    if (listScrollRef.current) return listScrollRef.current;
    return document.querySelector(scrollSelector) as HTMLDivElement | null;
  }, [scrollSelector]);

  const applyPendingViewRestore = useCallback(() => {
    const pending = pendingViewRestoreRef.current;
    if (!pending) return;
    window.scrollTo({
      left: pending.windowX,
      top: pending.windowY,
      behavior: "auto",
    });
    const tableEl = getListScrollEl();
    if (tableEl) {
      tableEl.scrollLeft = pending.tableLeft;
      tableEl.scrollTop = pending.tableTop;
    }
  }, [getListScrollEl]);

  const captureViewForRestore = useCallback(
    (entryId?: number | null, page?: number) => {
      const tableEl = getListScrollEl();
      pendingViewRestoreRef.current = {
        windowX: window.scrollX,
        windowY: window.scrollY,
        tableLeft: tableEl?.scrollLeft ?? 0,
        tableTop: tableEl?.scrollTop ?? 0,
        entryId: entryId ?? null,
        page: page ?? 1,
      };
    },
    [getListScrollEl]
  );

  const beginPreserveViewSettle = useCallback(() => {
    applyPendingViewRestore();
    [0, 50, 150, 300].forEach((ms) => {
      window.setTimeout(() => {
        applyPendingViewRestore();
        if (ms === 300) pendingViewRestoreRef.current = null;
      }, ms);
    });
  }, [applyPendingViewRestore]);

  const getPendingPage = useCallback(
    (fallbackPage: number) =>
      pendingViewRestoreRef.current?.page ?? fallbackPage,
    []
  );

  // Re-apply while pending exists, edit UI is closed, and hard loading is off.
  useLayoutEffect(() => {
    if (!pendingViewRestoreRef.current || isEditOpen || loading) return;
    applyPendingViewRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listDeps is intentional trigger list
  }, [isEditOpen, loading, applyPendingViewRestore, ...listDeps]);

  return {
    listScrollRef,
    pendingViewRestoreRef,
    captureViewForRestore,
    applyPendingViewRestore,
    beginPreserveViewSettle,
    getPendingPage,
  };
}
