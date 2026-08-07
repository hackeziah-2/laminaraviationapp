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
/**
 * Covers soft refresh reflow + SweetAlert confirm/success close (~1.5s toast).
 * Keep applying past the success toast so viewport is not left at top.
 */
const SETTLE_MS = [
  0, 50, 150, 300, 600, 1000, 1600, 2000, 2500, 3200, 4000,
] as const;

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

    // Anchor the edited row inside the list scroller without letting the browser
    // drag the window to an unexpected position.
    if (pending.entryId != null) {
      const row = document.querySelector(
        `[data-list-entry-id="${pending.entryId}"]`
      ) as HTMLElement | null;
      if (row && tableEl && tableEl.contains(row)) {
        const rowTop = row.offsetTop;
        const rowBottom = rowTop + row.offsetHeight;
        const viewTop = tableEl.scrollTop;
        const viewBottom = viewTop + tableEl.clientHeight;
        if (rowTop < viewTop) {
          tableEl.scrollTop = rowTop;
        } else if (rowBottom > viewBottom) {
          tableEl.scrollTop = rowBottom - tableEl.clientHeight;
        }
        tableEl.scrollLeft = pending.tableLeft;
      } else if (row) {
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }

    window.scrollTo({
      left: pending.windowX,
      top: pending.windowY,
      behavior: "auto",
    });
  }, [getListScrollEl]);

  /**
   * Capture list/window position for later restore.
   * When a dialog is open (or a prior open-time snapshot exists), keep the
   * existing scroll coordinates — SweetAlert/modals often report scrollY=0.
   */
  const captureViewForRestore = useCallback(
    (entryId?: number | null, page?: number) => {
      const existing = pendingViewRestoreRef.current;
      const tableEl = getListScrollEl();
      const remembered = getRememberedWindowScroll();
      const dialogOpen = isSwalLikelyOpen();

      // Dialog/modal open: never overwrite a good open-time scroll snapshot with 0.
      if (existing && dialogOpen) {
        pendingViewRestoreRef.current = {
          ...existing,
          entryId: entryId ?? existing.entryId,
          page: page ?? existing.page,
        };
        return;
      }

      const windowX = dialogOpen ? remembered.x : window.scrollX;
      const windowY = dialogOpen ? remembered.y : window.scrollY;
      const tableLeft = tableEl?.scrollLeft ?? existing?.tableLeft ?? 0;
      const tableTop = tableEl?.scrollTop ?? existing?.tableTop ?? 0;

      // Prefer non-zero existing scroll if the live viewport was already reset.
      const preferExistingWindow =
        Boolean(existing) &&
        windowY === 0 &&
        (existing!.windowY > 0 || existing!.tableTop > 0);

      pendingViewRestoreRef.current = {
        windowX: preferExistingWindow ? existing!.windowX : windowX,
        windowY: preferExistingWindow ? existing!.windowY : windowY,
        tableLeft:
          dialogOpen && existing ? existing.tableLeft : tableLeft,
        tableTop: dialogOpen && existing ? existing.tableTop : tableTop,
        entryId: entryId ?? existing?.entryId ?? null,
        page: page ?? existing?.page ?? 1,
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
