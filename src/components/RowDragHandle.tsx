import React from "react";
import { GripVertical } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { ARRANGEMENT_DISABLED_TOOLTIP } from "../utils/displayOrderReorder";

type RowDragHandleProps = {
  /** Accessible label, e.g. "Move Maintenance TCC row" */
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  isDragging?: boolean;
  activatorRef?: (element: HTMLElement | null) => void;
  attributes?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  listeners?: Record<string, unknown>;
};

/**
 * Drag handle for table rows. Drag starts only from this control so row
 * actions (edit/delete/links) keep working.
 */
export function RowDragHandle({
  label,
  disabled = false,
  disabledReason = ARRANGEMENT_DISABLED_TOOLTIP,
  isDragging = false,
  activatorRef,
  attributes,
  listeners,
}: RowDragHandleProps) {
  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      ref={disabled ? undefined : activatorRef}
      {...(disabled ? {} : (attributes as object))}
      {...(disabled ? {} : (listeners as object))}
      className={
        disabled
          ? "inline-flex items-center justify-center p-1 rounded text-gray-300 cursor-not-allowed"
          : `inline-flex items-center justify-center p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`
      }
    >
      <GripVertical className="w-4 h-4" aria-hidden />
    </button>
  );

  if (!disabled) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[240px]">
        {disabledReason}
      </TooltipContent>
    </Tooltip>
  );
}
