import { describe, expect, it } from "vitest";
import {
  atlBatchQueryParam,
  resetAtlManageListOnAircraftChange,
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
