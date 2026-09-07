import { useCallback, useMemo, useRef, useState } from "react";

export type PagedRecordPage<T> = {
  items: T[];
  pages?: number;
  total?: number;
};

type UsePagedRecordNavigationOptions<T extends { id: number }> = {
  isOpen: boolean;
  records: T[];
  currentId: number | null | undefined;
  currentPage: number;
  totalPages: number;
  fetchPage: (page: number) => Promise<PagedRecordPage<T>>;
  applyPage: (page: number, result: PagedRecordPage<T>) => void;
  onSelect: (record: T) => void | Promise<void>;
  /**
   * When true, stay in the navigating/locked state after onSelect until
   * `release()` is called (use while a view modal finishes loading).
   */
  holdBusyUntilIdle?: boolean;
};

export function usePagedRecordNavigation<T extends { id: number }>(
  options: UsePagedRecordNavigationOptions<T>
) {
  const busyRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof window.setTimeout>>();
  const [navigating, setNavigating] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const index = useMemo(
    () => options.records.findIndex((record) => record.id === options.currentId),
    [options.records, options.currentId]
  );

  const hasPrevious = Boolean(
    options.isOpen &&
      options.currentId != null &&
      (index > 0 || options.currentPage > 1)
  );

  const hasNext = Boolean(
    options.isOpen &&
      options.currentId != null &&
      ((index >= 0 && index < options.records.length - 1) ||
        options.currentPage < options.totalPages)
  );

  const go = useCallback(async (direction: -1 | 1) => {
    const current = optionsRef.current;
    if (!current.isOpen || busyRef.current) return;

    const currentIndex = current.records.findIndex(
      (record) => record.id === current.currentId
    );
    const canPrevious = currentIndex > 0 || current.currentPage > 1;
    const canNext =
      (currentIndex >= 0 && currentIndex < current.records.length - 1) ||
      current.currentPage < current.totalPages;

    if (direction < 0 && !canPrevious) return;
    if (direction > 0 && !canNext) return;

    busyRef.current = true;
    setNavigating(true);
    const hold = current.holdBusyUntilIdle;
    try {
      if (direction < 0) {
        if (currentIndex > 0) {
          await current.onSelect(current.records[currentIndex - 1]);
        } else if (current.currentPage > 1) {
          const result = await current.fetchPage(current.currentPage - 1);
          const items = result.items ?? [];
          current.applyPage(current.currentPage - 1, result);
          if (items.length > 0) {
            await current.onSelect(items[items.length - 1]);
          }
        }
      } else if (currentIndex >= 0 && currentIndex < current.records.length - 1) {
        await current.onSelect(current.records[currentIndex + 1]);
      } else if (current.currentPage < current.totalPages) {
        const result = await current.fetchPage(current.currentPage + 1);
        const items = result.items ?? [];
        current.applyPage(current.currentPage + 1, result);
        if (items.length > 0) {
          await current.onSelect(items[0]);
        }
      }

      if (!hold) {
        busyRef.current = false;
        setNavigating(false);
      } else if (busyRef.current) {
        safetyTimerRef.current = window.setTimeout(() => {
          busyRef.current = false;
          setNavigating(false);
        }, 20000);
      }
    } catch {
      if (safetyTimerRef.current) {
        window.clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = undefined;
      }
      busyRef.current = false;
      setNavigating(false);
    }
  }, []);

  const release = useCallback(() => {
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = undefined;
    }
    busyRef.current = false;
    setNavigating(false);
  }, []);

  const goPrevious = useCallback(() => go(-1), [go]);
  const goNext = useCallback(() => go(1), [go]);

  return {
    hasPrevious,
    hasNext,
    navigating,
    goPrevious,
    goNext,
    release,
  };
}
