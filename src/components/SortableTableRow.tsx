import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RowDragHandle } from "./RowDragHandle";

type SortableTableRowProps = {
  id: number | string;
  disabled?: boolean;
  dragLabel: string;
  disabledReason?: string;
  className?: string;
  /** Used by usePreserveListView to re-anchor scroll after soft refresh. */
  "data-list-entry-id"?: number | string | null;
  children: (ctx: {
    dragHandle: React.ReactNode;
    isDragging: boolean;
  }) => React.ReactNode;
};

/**
 * Sortable <tr> with a dedicated drag handle. Listeners attach only to the handle.
 */
export function SortableTableRow({
  id,
  disabled = false,
  dragLabel,
  disabledReason,
  className = "",
  "data-list-entry-id": dataListEntryId,
  children,
}: SortableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : undefined,
    position: "relative",
    zIndex: isDragging ? 20 : undefined,
    boxShadow: isDragging
      ? "0 8px 24px rgba(15, 23, 42, 0.18)"
      : undefined,
    backgroundColor: isDragging ? "rgb(239 246 255)" : undefined,
  };

  const dragHandle = (
    <RowDragHandle
      label={dragLabel}
      disabled={disabled}
      disabledReason={disabledReason}
      isDragging={isDragging}
      activatorRef={setActivatorNodeRef}
      attributes={attributes}
      listeners={listeners}
    />
  );

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? "bg-blue-50" : ""}`.trim()}
      data-dragging={isDragging ? "true" : undefined}
      data-list-entry-id={
        dataListEntryId == null ? undefined : dataListEntryId
      }
    >
      {children({ dragHandle, isDragging })}
    </tr>
  );
}
