import { describe, expect, it } from "vitest";
import {
  isAnnualInspection,
  ldndUnitForSave,
  resolveLdndUnit,
} from "./ldndEntryForm";

describe("LDND entry unit", () => {
  it("leaves Annual inspections blank unless a unit was chosen", () => {
    expect(isAnnualInspection("Annual Inspection")).toBe(true);
    expect(isAnnualInspection("ANNUAL")).toBe(true);
    expect(isAnnualInspection("100-Hour Inspection")).toBe(false);
    expect(isAnnualInspection("Semi-annual Inspection")).toBe(false);

    expect(
      resolveLdndUnit({
        inspectionType: "Annual Inspection",
        unit: "HRS",
        unitTouched: false,
      })
    ).toBe("");
    expect(
      resolveLdndUnit({
        inspectionType: "100-Hour Inspection",
        unit: "",
        unitTouched: false,
      })
    ).toBe("HRS");
    expect(
      resolveLdndUnit({
        inspectionType: "Annual Inspection",
        unit: "CYCLES",
        unitTouched: true,
      })
    ).toBe("CYCLES");
    expect(ldndUnitForSave("")).toBeNull();
    expect(ldndUnitForSave("HRS")).toBe("HRS");
  });
});
