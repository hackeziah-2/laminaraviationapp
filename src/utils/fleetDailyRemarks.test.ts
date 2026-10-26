import { describe, expect, it } from "vitest";
import {
  fleetDailyRemarksDisplay,
  fleetDailyRemarksValue,
} from "./fleetDailyRemarks";

describe("fleetDailyRemarks", () => {
  it("keeps each Enter as its own line", () => {
    expect(fleetDailyRemarksValue("Oil leak\r\nCheck filter\rLine 3")).toBe(
      "Oil leak\nCheck filter\nLine 3"
    );
    expect(fleetDailyRemarksDisplay("Oil leak\n\nCheck filter")).toBe(
      "Oil leak\n\nCheck filter"
    );
  });

  it("treats an empty remark as nothing to show", () => {
    expect(fleetDailyRemarksDisplay("")).toBeNull();
    expect(fleetDailyRemarksDisplay(null)).toBeNull();
  });
});
