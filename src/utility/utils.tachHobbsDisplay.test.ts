import { describe, expect, it } from "vitest";
import { formatAtlTachHobbsDisplay1dp } from "./utils";

describe("formatAtlTachHobbsDisplay1dp", () => {
  it("shows exactly one decimal place", () => {
    expect(formatAtlTachHobbsDisplay1dp(8829)).toBe("8829.0");
    expect(formatAtlTachHobbsDisplay1dp("8829")).toBe("8829.0");
    expect(formatAtlTachHobbsDisplay1dp(8829.56)).toBe("8829.6");
    expect(formatAtlTachHobbsDisplay1dp("8829.56")).toBe("8829.6");
    expect(formatAtlTachHobbsDisplay1dp(0)).toBe("0.0");
    expect(formatAtlTachHobbsDisplay1dp("0")).toBe("0.0");
    expect(formatAtlTachHobbsDisplay1dp("0.00")).toBe("0.0");
  });

  it("keeps empty values empty unless a fallback is provided", () => {
    expect(formatAtlTachHobbsDisplay1dp("")).toBe("");
    expect(formatAtlTachHobbsDisplay1dp(null)).toBe("");
    expect(formatAtlTachHobbsDisplay1dp(undefined)).toBe("");
    expect(formatAtlTachHobbsDisplay1dp("", "0.0")).toBe("0.0");
  });

  it("formats a trailing decimal as a complete number for blur display", () => {
    expect(formatAtlTachHobbsDisplay1dp("12.")).toBe("12.0");
    expect(formatAtlTachHobbsDisplay1dp("abc")).toBe("abc");
  });
});
