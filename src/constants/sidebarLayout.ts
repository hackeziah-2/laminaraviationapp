/** Matches Tailwind `w-64` / `lg:ml-64` used by Sidebar and main content. */
export const SIDEBAR_WIDTH_EXPANDED = "16rem";

/** Matches Tailwind `w-20` / `lg:ml-20` used when sidebar is collapsed. */
export const SIDEBAR_WIDTH_COLLAPSED = "5rem";

/** Tailwind `lg` breakpoint — sidebar is off-canvas below this width. */
export const SIDEBAR_LAYOUT_BREAKPOINT_PX = 1024;

export function getSidebarInsetStyle(collapsed: boolean, isLgUp: boolean) {
  if (!isLgUp) {
    return { left: "0px", width: "100vw" } as const;
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  return {
    left: sidebarWidth,
    width: `calc(100vw - ${sidebarWidth})`,
  } as const;
}
