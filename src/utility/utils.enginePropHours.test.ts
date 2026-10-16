import { describe, expect, it } from "vitest";
import {
  atlEnginePropRunHoursFromTach,
  formatAtlEnginePropHours2dp,
} from "./utils";

describe("engine and propeller ATL hours", () => {
  it("keeps two decimal places and does not round to one", () => {
    expect(formatAtlEnginePropHours2dp(100.01)).toBe("100.01");
    expect(formatAtlEnginePropHours2dp(100)).toBe("100.00");
    expect(formatAtlEnginePropHours2dp(1.26)).toBe("1.26");
    expect(formatAtlEnginePropHours2dp("1.20")).toBe("1.20");
  });

  it("keeps a difference of 0.01 distinct", () => {
    expect(formatAtlEnginePropHours2dp(10.01)).not.toBe(
      formatAtlEnginePropHours2dp(10)
    );
    expect(formatAtlEnginePropHours2dp(10.01)).toBe("10.01");
    expect(formatAtlEnginePropHours2dp(10)).toBe("10.00");
  });

  it("derives engine/propeller run time from tach at two decimals", () => {
    expect(atlEnginePropRunHoursFromTach(100, 101.01)).toBe("1.01");
    expect(atlEnginePropRunHoursFromTach(10.12, 10.13)).toBe("0.01");
    expect(atlEnginePropRunHoursFromTach(100, 101.26)).toBe("1.26");
  });

  it("leaves empty values empty", () => {
    expect(formatAtlEnginePropHours2dp(null, "")).toBe("");
    expect(formatAtlEnginePropHours2dp("", "")).toBe("");
    expect(formatAtlEnginePropHours2dp(undefined)).toBe("");
  });
});
