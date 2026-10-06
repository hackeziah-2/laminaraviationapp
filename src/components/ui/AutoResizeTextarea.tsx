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
  const caretRef = useRef<{ start: number; end: number } | null>(null);

  const rememberCaret = (element: HTMLTextAreaElement) => {
    if (element.selectionStart == null || element.selectionEnd == null) return;
    caretRef.current = {
      start: element.selectionStart,
      end: element.selectionEnd,
    };
  };

  const restoreCaret = (element: HTMLTextAreaElement | null) => {
    const caret = caretRef.current;
    if (!element || !caret || document.activeElement !== element) return;
    const max = element.value.length;
    const start = Math.min(caret.start, max);
    const end = Math.min(caret.end, max);
    if (element.selectionStart === start && element.selectionEnd === end) return;
    element.setSelectionRange(start, end);
  };

  useLayoutEffect(() => {
    autoResizeTextarea(ref.current, maxHeightPx);
    restoreCaret(ref.current);
  }, [value, maxHeightPx]);

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      onChange={(event) => {
        rememberCaret(event.currentTarget);
        onChange?.(event);
        autoResizeTextarea(event.currentTarget, maxHeightPx);
        restoreCaret(event.currentTarget);
      }}
      onInput={(event) => {
        rememberCaret(event.currentTarget);
        onInput?.(event);
        autoResizeTextarea(event.currentTarget, maxHeightPx);
        restoreCaret(event.currentTarget);
      }}
      className={cn(
        "min-h-[80px] max-h-[300px] resize-none overflow-x-hidden overflow-y-auto",
        className
      )}
      style={{
        minHeight: minHeightPx,
        maxHeight: maxHeightPx,
        whiteSpace: "pre-wrap",
        ...style,
      }}
    />
  );
}
