import { describe, expect, it } from "vitest";
import {
  getSidebarInsetStyle,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "./sidebarLayout";

describe("getSidebarInsetStyle", () => {
  it("uses full viewport on mobile", () => {
    expect(getSidebarInsetStyle(false, false)).toEqual({
      left: "0px",
      width: "100vw",
    });
    expect(getSidebarInsetStyle(true, false)).toEqual({
      left: "0px",
      width: "100vw",
    });
  });

  it("offsets by expanded sidebar width on desktop", () => {
    expect(getSidebarInsetStyle(false, true)).toEqual({
      left: SIDEBAR_WIDTH_EXPANDED,
      width: `calc(100vw - ${SIDEBAR_WIDTH_EXPANDED})`,
    });
  });

  it("offsets by collapsed sidebar width on desktop", () => {
    expect(getSidebarInsetStyle(true, true)).toEqual({
      left: SIDEBAR_WIDTH_COLLAPSED,
      width: `calc(100vw - ${SIDEBAR_WIDTH_COLLAPSED})`,
    });
  });
});
