import { describe, expect, it } from "vitest";
import {
  AUTO_RESIZE_TEXTAREA_MAX_PX,
  autoResizeTextarea,
} from "./autoResizeTextarea";

describe("autoResizeTextarea", () => {
  it("uses the shared 300px cap by default", () => {
    const element = document.createElement("textarea");
    Object.defineProperty(element, "scrollHeight", {
      configurable: true,
      get: () => 900,
    });
    autoResizeTextarea(element);
    expect(element.style.height).toBe(`${AUTO_RESIZE_TEXTAREA_MAX_PX}px`);
  });
});
