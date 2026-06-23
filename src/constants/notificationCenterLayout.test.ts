import { describe, expect, it } from "vitest";
import {
  getNotificationDrawerStyle,
  getNotificationOverlayStyle,
  NOTIFICATION_DRAWER_WIDTH_PX,
} from "./notificationCenterLayout";

describe("notification overlay layout", () => {
  it("offsets overlay from expanded sidebar on desktop", () => {
    expect(getNotificationOverlayStyle(false, true)).toEqual({
      left: "16rem",
      right: "0px",
      width: "calc(100vw - 16rem)",
    });
  });

  it("offsets overlay from collapsed sidebar on desktop", () => {
    expect(getNotificationOverlayStyle(true, true)).toEqual({
      left: "5rem",
      right: "0px",
      width: "calc(100vw - 5rem)",
    });
  });

  it("uses full viewport overlay on mobile", () => {
    expect(getNotificationOverlayStyle(false, false)).toEqual({
      left: "0px",
      right: "0px",
      width: "100vw",
    });
  });

  it("drawer is 400px wide on desktop and capped by remaining viewport", () => {
    expect(getNotificationDrawerStyle(false, true)).toEqual({
      right: "0px",
      width: `${NOTIFICATION_DRAWER_WIDTH_PX}px`,
      maxWidth: "calc(100vw - 16rem)",
    });
  });

  it("drawer is full width on mobile", () => {
    expect(getNotificationDrawerStyle(false, false)).toEqual({
      right: "0px",
      width: "100vw",
      maxWidth: "100vw",
    });
  });
});
