import { describe, expect, it } from "vitest";
import { canEditOemTechnicalPublication } from "./oemTechnicalPublicationAccess";

describe("canEditOemTechnicalPublication", () => {
  it("lets the Technical Publication role edit without module update", () => {
    expect(canEditOemTechnicalPublication("Technical Publication", false)).toBe(
      true
    );
    expect(canEditOemTechnicalPublication("Tech Publication", false)).toBe(
      true
    );
    expect(
      canEditOemTechnicalPublication("OEM Technical Publication", false)
    ).toBe(true);
  });

  it("lets other roles edit when Regulatory Compliance update is granted", () => {
    expect(canEditOemTechnicalPublication("Admin", true)).toBe(true);
    expect(canEditOemTechnicalPublication("Quality Manager", true)).toBe(true);
  });

  it("keeps view-only roles from editing", () => {
    expect(canEditOemTechnicalPublication("Quality Manager", false)).toBe(
      false
    );
    expect(canEditOemTechnicalPublication("Mechanic", false)).toBe(false);
    expect(canEditOemTechnicalPublication("", false)).toBe(false);
    expect(canEditOemTechnicalPublication(undefined, false)).toBe(false);
  });
});