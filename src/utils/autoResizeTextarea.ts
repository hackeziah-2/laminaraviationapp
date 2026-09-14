export const AUTO_RESIZE_TEXTAREA_MIN_PX = 80;
export const AUTO_RESIZE_TEXTAREA_MAX_PX = 300;

/** Grow a textarea to fit its content, capping at `maxHeightPx`. */
export function autoResizeTextarea(
  element: HTMLTextAreaElement | null,
  maxHeightPx = AUTO_RESIZE_TEXTAREA_MAX_PX
): void {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, maxHeightPx)}px`;
}
