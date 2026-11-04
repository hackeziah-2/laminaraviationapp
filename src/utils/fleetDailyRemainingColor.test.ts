import { describe, expect, it } from "vitest";
import {
  REMAINING_NEXT_INSP_COLORS,
  REMAINING_NEXT_INSP_LEGEND,
  parseInspectionIntervalHours,
  remainingNextInspCellClass,
  remainingNextInspCellStyle,
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

  it("is yellow only when remaining / next_insp_due * 100 is > 10 and <= 20", () => {
    const remainingPercentage = (remaining: number, nextInspDue: number) =>
      (remaining / nextInspDue) * 100;

    expect(remainingPercentage(8.1, 50)).toBeCloseTo(16.2);
    expect(
      remainingPercentage(8.1, 50) > 10 && remainingPercentage(8.1, 50) <= 20
    ).toBe(true);
    expect(remainingNextInspTone(8.1, 50)).toBe("yellow");

    expect(remainingPercentage(10, 100) > 10).toBe(false);
    expect(remainingNextInspTone(10, 100)).toBe("orange");

    expect(remainingPercentage(20, 100) <= 20).toBe(true);
    expect(remainingNextInspTone(20, 100)).toBe("yellow");

    expect(remainingPercentage(10.1, 100) > 10).toBe(true);
    expect(remainingNextInspTone(10.1, 100)).toBe("yellow");

    expect(remainingPercentage(20.1, 100) <= 20).toBe(false);
    expect(remainingNextInspTone(20.1, 100)).toBe("default");

    expect(remainingPercentage(20.6, 50) > 20).toBe(true);
    expect(remainingNextInspTone(20.6, 50)).not.toBe("yellow");
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

  it("paints the remaining-time cell with the specified status colors", () => {
    expect(remainingNextInspCellStyle("yellow")?.backgroundColor).toBe(
      REMAINING_NEXT_INSP_COLORS.yellow
    );
    expect(remainingNextInspCellStyle("orange")?.backgroundColor).toBe(
      "#FF9900"
    );
    expect(remainingNextInspCellStyle("red")).toMatchObject({
      backgroundColor: "#FF0000",
      color: "#ffffff",
    });
    expect(remainingNextInspCellStyle("default")).toBeUndefined();
    expect(remainingNextInspCellClass("default")).toBe("text-gray-900");
    expect(remainingNextInspCellClass("yellow")).toBe("");
    expect(
      REMAINING_NEXT_INSP_LEGEND.find((item) => item.tone === "yellow")?.label
    ).toBe("> 10% to ≤ 20% remaining");
    expect(
      REMAINING_NEXT_INSP_LEGEND.find((item) => item.tone === "orange")?.label
    ).toBe("Up to 10% remaining");
    expect(
      REMAINING_NEXT_INSP_LEGEND.find((item) => item.tone === "red")?.label
    ).toBe("Due (≤1 hr remaining)");
  });
});
