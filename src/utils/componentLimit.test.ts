import { describe, expect, it } from "vitest";
import {
  formatComponentLimitDisplay,
  isConfiguredComponentLimit,
} from "./componentLimit";

describe("isConfiguredComponentLimit", () => {
  it("treats 0 and missing values as no limit", () => {
    expect(isConfiguredComponentLimit(0)).toBe(false);
    expect(isConfiguredComponentLimit(null)).toBe(false);
    expect(isConfiguredComponentLimit(undefined)).toBe(false);
    expect(isConfiguredComponentLimit(NaN)).toBe(false);
  });

  it("treats values greater than 0 as a configured limit", () => {
    expect(isConfiguredComponentLimit(6)).toBe(true);
    expect(isConfiguredComponentLimit(1500)).toBe(true);
  });
});

describe("formatComponentLimitDisplay", () => {
  it("displays 0 and missing limits as a dash", () => {
    expect(formatComponentLimitDisplay(0)).toBe("-");
    expect(formatComponentLimitDisplay(null)).toBe("-");
    expect(formatComponentLimitDisplay(NaN)).toBe("-");
  });

  it("displays configured limits as numbers", () => {
    expect(formatComponentLimitDisplay(6)).toBe("6");
    expect(formatComponentLimitDisplay(1500)).toBe("1500");
  });
});
