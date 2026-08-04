import { useCallback, useLayoutEffect, useRef } from "react";
import { getRememberedWindowScroll } from "../utils/windowScrollMemory";

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
/** Covers soft refresh reflow + SweetAlert confirm/success close (~1.5s toast). */
const SETTLE_MS = [0, 50, 150, 300, 600, 1000, 1600, 2200, 2800] as const;

function isSwalLikelyOpen(): boolean {
  return Boolean(document.querySelector(".swal2-container"));
}

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
  const settleTimersRef = useRef<number[]>([]);

  const getListScrollEl = useCallback((): HTMLDivElement | null => {
    if (listScrollRef.current) return listScrollRef.current;
    return document.querySelector(scrollSelector) as HTMLDivElement | null;
  }, [scrollSelector]);

  const clearSettleTimers = useCallback(() => {
    settleTimersRef.current.forEach((id) => window.clearTimeout(id));
    settleTimersRef.current = [];
  }, []);

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

    // Prefer anchoring to the edited row when present (survives minor layout shifts).
    if (pending.entryId != null) {
      const row = document.querySelector(
        `[data-list-entry-id="${pending.entryId}"]`
      ) as HTMLElement | null;
      if (row) {
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
        if (tableEl) {
          tableEl.scrollLeft = pending.tableLeft;
        }
        window.scrollTo({
          left: pending.windowX,
          top: pending.windowY,
          behavior: "auto",
        });
      }
    }
  }, [getListScrollEl]);

  const captureViewForRestore = useCallback(
    (entryId?: number | null, page?: number) => {
      const tableEl = getListScrollEl();
      // While Swal is open, window.scrollY is often 0 — use pre-dialog memory.
      const remembered = getRememberedWindowScroll();
      const useRemembered = isSwalLikelyOpen();
      pendingViewRestoreRef.current = {
        windowX: useRemembered ? remembered.x : window.scrollX,
        windowY: useRemembered ? remembered.y : window.scrollY,
        tableLeft: tableEl?.scrollLeft ?? 0,
        tableTop: tableEl?.scrollTop ?? 0,
        entryId: entryId ?? null,
        page: page ?? 1,
      };
    },
    [getListScrollEl]
  );

  const beginPreserveViewSettle = useCallback(() => {
    clearSettleTimers();
    applyPendingViewRestore();
    const lastMs = SETTLE_MS[SETTLE_MS.length - 1];
    SETTLE_MS.forEach((ms) => {
      const id = window.setTimeout(() => {
        applyPendingViewRestore();
        if (ms === lastMs) {
          pendingViewRestoreRef.current = null;
          clearSettleTimers();
        }
      }, ms);
      settleTimersRef.current.push(id);
    });
  }, [applyPendingViewRestore, clearSettleTimers]);

  const getPendingPage = useCallback(
    (fallbackPage: number) =>
      pendingViewRestoreRef.current?.page ?? fallbackPage,
    []
  );

  const clearPendingViewRestore = useCallback(() => {
    clearSettleTimers();
    pendingViewRestoreRef.current = null;
  }, [clearSettleTimers]);

  // Re-apply while pending exists, edit UI is closed, and hard loading is off.
  useLayoutEffect(() => {
    if (!pendingViewRestoreRef.current || isEditOpen || loading) return;
    applyPendingViewRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listDeps is intentional trigger list
  }, [isEditOpen, loading, applyPendingViewRestore, ...listDeps]);

  useLayoutEffect(() => () => clearSettleTimers(), [clearSettleTimers]);

  return {
    listScrollRef,
    pendingViewRestoreRef,
    captureViewForRestore,
    applyPendingViewRestore,
    beginPreserveViewSettle,
    getPendingPage,
    clearPendingViewRestore,
  };
}
