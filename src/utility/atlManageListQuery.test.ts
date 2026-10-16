import { describe, expect, it } from "vitest";
import {
  atlBatchQueryParam,
  resetAtlManageListOnAircraftChange,
  resolveAtlBatchFilterAfterOptionsLoad,
} from "./atlManageListQuery";

describe("atlBatchQueryParam", () => {
  it("sends all for a blank or all selection", () => {
    expect(atlBatchQueryParam("")).toBe("all");
    expect(atlBatchQueryParam("  ")).toBe("all");
    expect(atlBatchQueryParam("all")).toBe("all");
    expect(atlBatchQueryParam("ALL")).toBe("all");
  });

  it("sends a specific batch id unchanged", () => {
    expect(atlBatchQueryParam("12")).toBe(12);
    expect(atlBatchQueryParam(" 4 ")).toBe(4);
  });
});

describe("resetAtlManageListOnAircraftChange", () => {
  it("clears the previous batch filter and returns to page 1", () => {
    expect(
      resetAtlManageListOnAircraftChange({
        currentAircraftId: "7",
        nextAircraftId: "9",
      })
    ).toEqual({ batchId: "", page: 1 });
  });

  it("leaves the current filter alone when the aircraft is unchanged", () => {
    expect(
      resetAtlManageListOnAircraftChange({
        currentAircraftId: "7",
        nextAircraftId: "7",
      })
    ).toBeNull();
  });
});

describe("resolveAtlBatchFilterAfterOptionsLoad", () => {
  const batches = [{ id: 3 }, { id: 9 }];

  it("keeps all batches selected when nothing specific is chosen", () => {
    expect(resolveAtlBatchFilterAfterOptionsLoad("", batches)).toBe("");
    expect(resolveAtlBatchFilterAfterOptionsLoad("all", batches)).toBe("");
    expect(resolveAtlBatchFilterAfterOptionsLoad("ALL", batches)).toBe("");
  });

  it("keeps a batch id that is still in the loaded list", () => {
    expect(resolveAtlBatchFilterAfterOptionsLoad("9", batches)).toBe("9");
  });

  it("clears a batch id that is not in the loaded list", () => {
    expect(resolveAtlBatchFilterAfterOptionsLoad("4", batches)).toBe("");
    expect(resolveAtlBatchFilterAfterOptionsLoad("4", [])).toBe("");
  });
});
