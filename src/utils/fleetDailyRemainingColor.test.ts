import { describe, expect, it } from "vitest";
import {
  REMAINING_NEXT_INSP_LEGEND,
  parseInspectionIntervalHours,
  remainingNextInspCellClass,
  remainingNextInspTone,
} from "./fleetDailyRemainingColor";

describe("remaining next inspection color", () => {
  it("uses red at 1.0 hour or less, including negatives, before percentage", () => {
    expect(remainingNextInspTone(0.9, 50)).toBe("red");
    expect(remainingNextInspTone(1, 50)).toBe("red");
    expect(remainingNextInspTone(1.0, "50-Hour Inspection")).toBe("red");
    expect(remainingNextInspTone(-2.4, 50)).toBe("red");
    expect(remainingNextInspTone(0.9, null)).toBe("red");
    expect(remainingNextInspTone(0.5, 0)).toBe("red");
  });

  it("colors by remaining percentage of the inspection interval", () => {
    expect(remainingNextInspTone(8.1, 50)).toBe("yellow");
    expect(remainingNextInspTone(4, 50)).toBe("orange");
    expect(remainingNextInspTone(20.6, 50)).toBe("default");
    expect(remainingNextInspTone(8.1, "50-Hour Inspection")).toBe("yellow");
    expect(remainingNextInspTone(4, "50 HRS")).toBe("orange");
  });

  it("includes the 10% and 20% boundaries and leaves 1% and below default", () => {
    expect(remainingNextInspTone(5, 50)).toBe("orange");
    expect(remainingNextInspTone(10, 50)).toBe("yellow");
    expect(remainingNextInspTone(2, 200)).toBe("default");
    expect(remainingNextInspTone(1.5, 200)).toBe("default");
  });

  it("keeps the default style for a missing or zero interval without dividing", () => {
    expect(parseInspectionIntervalHours("LDND IS NOT YET SET-UP")).toBeNull();
    expect(parseInspectionIntervalHours("Annual Inspection")).toBeNull();
    expect(parseInspectionIntervalHours(0)).toBe(0);
    expect(parseInspectionIntervalHours("0 HRS")).toBe(0);
    expect(remainingNextInspTone(15, undefined)).toBe("default");
    expect(remainingNextInspTone(15, 0)).toBe("default");
    expect(remainingNextInspTone(15, "0")).toBe("default");
    expect(remainingNextInspTone(15, "LDND IS NOT YET SET-UP")).toBe("default");
    expect(remainingNextInspTone(null, 50)).toBe("default");
  });

  it("paints only the remaining-time cell classes used by the legend", () => {
    expect(remainingNextInspCellClass("red")).toBe("bg-red-500 text-white");
    expect(remainingNextInspCellClass("orange")).toBe(
      "bg-orange-600 text-white"
    );
    expect(remainingNextInspCellClass("yellow")).toBe(
      "bg-yellow-400 text-gray-900"
    );
    expect(remainingNextInspCellClass("default")).toBe("text-gray-900");
    expect(
      REMAINING_NEXT_INSP_LEGEND.find((item) => item.tone === "red")?.label
    ).toBe("Due (≤1 hr remaining)");
  });
});
