import { useLayoutEffect, type RefObject } from "react";

/** Keep `--maint-th-row1-h` in sync so a second header row sticks below the first. */
export function useStickyTableHeaderHeight(
  containerRef: RefObject<HTMLElement | null>,
  observeKey?: unknown
): void {
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;

    const apply = () => {
      const row = root.querySelector(
        "thead tr:first-child"
      ) as HTMLElement | null;
      if (!row) return;
      root.style.setProperty(
        "--maint-th-row1-h",
        `${Math.round(row.getBoundingClientRect().height)}px`
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    const firstRow = root.querySelector("thead tr:first-child");
    if (firstRow) observer.observe(firstRow);
    return () => observer.disconnect();
  }, [containerRef, observeKey]);
}
