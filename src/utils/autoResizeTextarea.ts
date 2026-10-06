export const AUTO_RESIZE_TEXTAREA_MIN_PX = 80;
export const AUTO_RESIZE_TEXTAREA_MAX_PX = 300;

/**
 * Grow a textarea to fit its content, capping at `maxHeightPx`.
 * Setting height to "auto" clears the caret in some browsers, so the selection
 * and scroll position are restored when this field is the one being edited.
 */
export function autoResizeTextarea(
  element: HTMLTextAreaElement | null,
  maxHeightPx = AUTO_RESIZE_TEXTAREA_MAX_PX
): void {
  if (!element) return;
  const focused =
    typeof document !== "undefined" && document.activeElement === element;
  const selectionStart = focused ? element.selectionStart : null;
  const selectionEnd = focused ? element.selectionEnd : null;
  const scrollTop = element.scrollTop;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, maxHeightPx)}px`;
  if (focused && selectionStart != null && selectionEnd != null) {
    const max = element.value.length;
    element.setSelectionRange(
      Math.min(selectionStart, max),
      Math.min(selectionEnd, max)
    );
  }
  if (element.scrollTop !== scrollTop) {
    element.scrollTop = scrollTop;
  }
}
