import { useCallback, useRef, useState } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  applyPageLocalReorder,
  buildDisplayOrderReorderPayload,
  moveItemAtIndex,
  withRecalculatedDisplayOrder,
  type DisplayOrderReorderPayload,
} from "../utils/displayOrderReorder";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";

type UseTableDisplayOrderReorderOptions<
  T extends { id?: number; displayOrder?: number }
> = {
  /** Visible page rows (optimistic UI). */
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  canReorder: boolean;
  /** Global index offset for the visible page: (page - 1) * pageSize */
  pageOffset?: number;
  /**
   * Resolve the sortable / persist identity for a row.
   * Defaults to `item.id`. Fleet Daily Update should pass aircraft_id.
   */
  getItemId?: (item: T) => number;
  /**
   * Load the complete ordered collection for the aircraft.
   * Used so reorder payloads stay globally unique across pages.
   */
  loadFullOrdered: () => Promise<T[]>;
  persistReorder: (payload: DisplayOrderReorderPayload) => Promise<void>;
  onSuccess?: () => void | Promise<void>;
  onError?: (message: string) => void | Promise<void>;
  tableName?: string;
};

/**
 * Optimistic page-local UI update + full-collection persist for display_order.
 */
export function useTableDisplayOrderReorder<
  T extends { id?: number; displayOrder?: number }
>({
  items,
  setItems,
  canReorder,
  pageOffset = 0,
  getItemId = (item: T) => Number((item as { id: number }).id),
  loadFullOrdered,
  persistReorder,
  onSuccess,
  onError,
}: UseTableDisplayOrderReorderOptions<T>) {
  const [isReordering, setIsReordering] = useState(false);
  const inFlightRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!canReorder || inFlightRef.current) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex(
        (item) => getItemId(item) === Number(active.id)
      );
      const newIndex = items.findIndex(
        (item) => getItemId(item) === Number(over.id)
      );
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return;
      }

      const previous = items;
      const optimisticPage = moveItemAtIndex(items, oldIndex, newIndex).map(
        (item, i) => ({
          ...item,
          displayOrder: pageOffset + i + 1,
        })
      );

      inFlightRef.current = true;
      setIsReordering(true);
      setItems(optimisticPage);

      try {
        const full = await loadFullOrdered();
        const nextFull = withRecalculatedDisplayOrder(
          applyPageLocalReorder(full, oldIndex, newIndex, pageOffset).map(
            (item) => ({
              ...item,
              id: getItemId(item),
            })
          )
        );
        const payload = buildDisplayOrderReorderPayload(nextFull);
        await persistReorder(payload);
        await onSuccess?.();
      } catch (err: unknown) {
        setItems(previous);
        const message = formatApiErrorMessage(err, "Failed to save row order.");
        await onError?.(message);
      } finally {
        inFlightRef.current = false;
        setIsReordering(false);
      }
    },
    [
      canReorder,
      items,
      pageOffset,
      getItemId,
      loadFullOrdered,
      persistReorder,
      setItems,
      onSuccess,
      onError,
    ]
  );

  return {
    sensors,
    handleDragEnd,
    isReordering,
    dndDisabled: !canReorder || isReordering,
  };
}
