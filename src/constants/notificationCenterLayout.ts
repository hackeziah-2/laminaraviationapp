import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "./sidebarLayout";

/** Fixed width for compact notification drawer (desktop). */
export const NOTIFICATION_DRAWER_WIDTH_PX = 400;

/** Horizontal padding inside drawer sections (24px). */
export const NOTIFICATION_DRAWER_PADDING_CLASS = "px-6";

/** Vertical padding for scrollable notification list (16px vertical, 24px horizontal). */
export const NOTIFICATION_CONTENT_PADDING_CLASS = "px-6 py-4";

/**
 * Backdrop covers only the main content area (right of sidebar).
 * Mobile: full viewport. Desktop: starts after sidebar.
 */
export function getNotificationOverlayStyle(collapsed: boolean, isLgUp: boolean) {
  if (!isLgUp) {
    return { left: "0px", right: "0px", width: "100vw" } as const;
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  return {
    left: sidebarWidth,
    right: "0px",
    width: `calc(100vw - ${sidebarWidth})`,
  } as const;
}

/**
 * Compact right drawer: fixed 400px, capped by remaining viewport beside sidebar.
 */
export function getNotificationDrawerStyle(collapsed: boolean, isLgUp: boolean) {
  if (!isLgUp) {
    return {
      right: "0px",
      width: "100vw",
      maxWidth: "100vw",
    } as const;
  }

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  return {
    right: "0px",
    width: `${NOTIFICATION_DRAWER_WIDTH_PX}px`,
    maxWidth: `calc(100vw - ${sidebarWidth})`,
  } as const;
}
