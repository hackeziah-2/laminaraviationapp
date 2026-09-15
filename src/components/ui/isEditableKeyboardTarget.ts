/** True when Left/Right should type into the focused control instead of changing records. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (
    target.closest(
      [
        '[data-slot="date-input"]',
        '[data-slot="calendar"]',
        '[data-slot="popover-content"]',
        "[data-radix-popper-content-wrapper]",
        ".date-picker-field",
        '[role="combobox"]',
        '[role="listbox"]',
        '[role="option"]',
        '[role="menu"]',
        '[aria-haspopup="listbox"]',
        '[aria-haspopup="dialog"]',
        ".atl-dropdown-panel",
        ".atl-dropdown-field",
      ].join(",")
    )
  ) {
    return true;
  }
  return false;
}
