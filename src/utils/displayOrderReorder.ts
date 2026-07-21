/** Helpers for persistent display_order drag-and-drop reorder. */

export type DisplayOrderReorderItem = {
  id: number;
  display_order: number;
};

export type DisplayOrderReorderPayload = {
  items: DisplayOrderReorderItem[];
};

/**
 * Manual arrangement is allowed only when the table shows the full ordered set:
 * default display_order sort, no column sort, and no filters that hide rows.
 */
export function isManualArrangementMode(options: {
  search?: string | null;
  categoryFilter?: string | null;
  columnSortActive?: boolean;
}): boolean {
  const search = String(options.search ?? "").trim();
  const category = String(options.categoryFilter ?? "").trim();
  if (search) return false;
  if (category) return false;
  if (options.columnSortActive) return false;
  return true;
}

/** Move an item within an array (immutable). */
export function moveItemAtIndex<T>(
  items: T[],
  oldIndex: number,
  newIndex: number
): T[] {
  if (
    oldIndex === newIndex ||
    oldIndex < 0 ||
    newIndex < 0 ||
    oldIndex >= items.length ||
    newIndex >= items.length
  ) {
    return items;
  }
  const next = items.slice();
  const [removed] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, removed);
  return next;
}

/** Assign displayOrder 1..N in current array order. */
export function withRecalculatedDisplayOrder<
  T extends { id: number; displayOrder?: number }
>(items: T[]): T[] {
  return items.map((item, index) => ({
    ...item,
    displayOrder: index + 1,
  }));
}

/** Build FastAPI reorder body: only id + display_order, sequential from 1. */
export function buildDisplayOrderReorderPayload(
  orderedIds: Array<number | { id: number }>
): DisplayOrderReorderPayload {
  const items: DisplayOrderReorderItem[] = orderedIds.map((entry, index) => {
    const id = typeof entry === "number" ? entry : entry.id;
    return { id, display_order: index + 1 };
  });
  return { items };
}

/**
 * Apply a page-local drag to a full ordered collection.
 * Prefer operating on the complete unpaginated list so global display_order stays unique.
 */
export function applyPageLocalReorder<T>(
  fullOrderedItems: T[],
  pageOldIndex: number,
  pageNewIndex: number,
  pageOffset = 0
): T[] {
  const oldIndex = pageOffset + pageOldIndex;
  const newIndex = pageOffset + pageNewIndex;
  return moveItemAtIndex(fullOrderedItems, oldIndex, newIndex);
}

export const ARRANGEMENT_DISABLED_TOOLTIP =
  "Return to the default arrangement (no search or filters) before reordering rows.";
