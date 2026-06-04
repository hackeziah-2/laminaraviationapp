import { describe, expect, it } from "vitest";
import {
  formatZuluTimeKeyboardInput,
  isValidZuluTimeHHmm,
  normalizeOptionalZuluTimeInput,
  validateOptionalZuluTime,
  ZULU_TIME_VALIDATION_ERROR,
  zuluTimeToTimeInputValue,
} from "./utils";

describe("isValidZuluTimeHHmm", () => {
  it("accepts 00:00 and 23:59", () => {
    expect(isValidZuluTimeHHmm("00:00")).toBe(true);
    expect(isValidZuluTimeHHmm("23:59")).toBe(true);
    expect(isValidZuluTimeHHmm("08:30")).toBe(true);
  });

  it("rejects 24:00, missing leading zeros, and invalid ranges", () => {
    expect(isValidZuluTimeHHmm("24:00")).toBe(false);
    expect(isValidZuluTimeHHmm("9:05")).toBe(false);
    expect(isValidZuluTimeHHmm("23:60")).toBe(false);
    expect(isValidZuluTimeHHmm("25:00")).toBe(false);
    expect(isValidZuluTimeHHmm("0830")).toBe(false);
    expect(isValidZuluTimeHHmm("")).toBe(false);
  });
});

describe("validateOptionalZuluTime", () => {
  it("allows empty values", () => {
    expect(validateOptionalZuluTime("")).toBeUndefined();
    expect(validateOptionalZuluTime("   ")).toBeUndefined();
    expect(validateOptionalZuluTime(null)).toBeUndefined();
  });

  it("returns standard error for invalid non-empty values", () => {
    expect(validateOptionalZuluTime("24:00")).toBe(ZULU_TIME_VALIDATION_ERROR);
    expect(validateOptionalZuluTime("9:00")).toBe(ZULU_TIME_VALIDATION_ERROR);
  });
});

describe("zuluTimeToTimeInputValue", () => {
  it("maps API HHMM and HH:mm to time input value", () => {
    expect(zuluTimeToTimeInputValue("0830")).toBe("08:30");
    expect(zuluTimeToTimeInputValue("08:30")).toBe("08:30");
    expect(zuluTimeToTimeInputValue("invalid")).toBe("");
  });
});

describe("formatZuluTimeKeyboardInput", () => {
  it("formats digits as HH:mm and strips AM/PM", () => {
    expect(formatZuluTimeKeyboardInput("0830")).toBe("08:30");
    expect(formatZuluTimeKeyboardInput("23:17")).toBe("23:17");
    expect(formatZuluTimeKeyboardInput("2:30 PM")).toBe("2:30");
  });
});

describe("normalizeOptionalZuluTimeInput", () => {
  it("pads partial valid times on blur", () => {
    expect(normalizeOptionalZuluTimeInput("8:30")).toBe("08:30");
    expect(normalizeOptionalZuluTimeInput("")).toBe("");
  });
});
