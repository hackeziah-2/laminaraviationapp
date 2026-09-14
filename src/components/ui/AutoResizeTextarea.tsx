import {
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./utils";
import {
  AUTO_RESIZE_TEXTAREA_MAX_PX,
  AUTO_RESIZE_TEXTAREA_MIN_PX,
  autoResizeTextarea,
} from "../../utils/autoResizeTextarea";

type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minHeightPx?: number;
  maxHeightPx?: number;
};

/**
 * Textarea that grows with typed, pasted, or loaded content up to a max height,
 * then scrolls vertically. Manual resize (including horizontal) is disabled.
 */
export function AutoResizeTextarea({
  value,
  onChange,
  onInput,
  className,
  minHeightPx = AUTO_RESIZE_TEXTAREA_MIN_PX,
  maxHeightPx = AUTO_RESIZE_TEXTAREA_MAX_PX,
  style,
  ...props
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    autoResizeTextarea(ref.current, maxHeightPx);
  }, [value, maxHeightPx]);

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      onChange={(event) => {
        onChange?.(event);
        autoResizeTextarea(event.target, maxHeightPx);
      }}
      onInput={(event) => {
        onInput?.(event);
        autoResizeTextarea(event.currentTarget, maxHeightPx);
      }}
      className={cn(
        "min-h-[80px] max-h-[300px] resize-none overflow-x-hidden overflow-y-auto",
        className
      )}
      style={{
        minHeight: minHeightPx,
        maxHeight: maxHeightPx,
        ...style,
      }}
    />
  );
}
