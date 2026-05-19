import { describe, expect, it } from "vitest";
import {
  normalizeFleetImportHeaderCell,
  validateAircraftFleetImportHeaderRow,
} from "./aircraftFleetImportExcelHeaders";

describe("normalizeFleetImportHeaderCell", () => {
  it("normalizes case, underscores, and extra spaces", () => {
    expect(normalizeFleetImportHeaderCell("  Base_Location  ")).toBe(
      "base location"
    );
  });
});

describe("validateAircraftFleetImportHeaderRow", () => {
  it("passes when required aliases are present", () => {
    expect(
      validateAircraftFleetImportHeaderRow([
        "Registration",
        "Model",
        "MSN",
        "Base Location",
      ])
    ).toEqual({ ok: true });
  });

  it("reports missing required header groups", () => {
    const result = validateAircraftFleetImportHeaderRow([
      "Registration",
      "Model",
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("MSN");
      expect(result.missing).toContain("Base");
    }
  });
});
