import { useLayoutEffect, type RefObject } from "react";

/** Keep grouped ATL header rows stacked under one another while the body scrolls. */
export function useAtlStickyHeaderOffsets(
  containerRef: RefObject<HTMLElement | null>,
  observeKey?: unknown
): void {
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;

    const apply = () => {
      const rows = root.querySelectorAll(":scope > table > thead > tr");
      const first = rows[0] as HTMLElement | undefined;
      if (!first) return;
      const second = rows[1] as HTMLElement | undefined;
      const row1 = Math.round(first.getBoundingClientRect().height);
      const row2 = second
        ? Math.round(second.getBoundingClientRect().height)
        : 0;
      root.style.setProperty("--atl-th-row1-h", `${row1}px`);
      root.style.setProperty("--atl-th-rows-12-h", `${row1 + row2}px`);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    root
      .querySelectorAll(":scope > table > thead > tr")
      .forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [containerRef, observeKey]);
}
