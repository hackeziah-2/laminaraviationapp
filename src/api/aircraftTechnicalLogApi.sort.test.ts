import { describe, expect, it } from "vitest";
import {
  displayTSN,
  formatAtlListCell,
  normalizeAtlPagedSortParam,
} from "./aircraftTechnicalLogApi";
import { formatAtlFuelLeftRightForDisplay } from "../utility/utils";

describe("normalizeAtlPagedSortParam", () => {
  it("passes ascending field unchanged", () => {
    expect(normalizeAtlPagedSortParam("sequence_no")).toBe("sequence_no");
  });

  it("passes descending field unchanged", () => {
    expect(normalizeAtlPagedSortParam("-created_at")).toBe("-created_at");
  });

  it("collapses accidental double prefix", () => {
    expect(normalizeAtlPagedSortParam("--sequence_no")).toBe("-sequence_no");
  });

  it("returns empty for blank sort", () => {
    expect(normalizeAtlPagedSortParam("")).toBe("");
    expect(normalizeAtlPagedSortParam("   ")).toBe("");
  });
});

describe("formatAtlListCell", () => {
  it("displays - for 0, null, undefined, and empty", () => {
    expect(formatAtlListCell(0)).toBe("-");
    expect(formatAtlListCell("0")).toBe("-");
    expect(formatAtlListCell("0.00")).toBe("-");
    expect(formatAtlListCell(null)).toBe("-");
    expect(formatAtlListCell(undefined)).toBe("-");
    expect(formatAtlListCell("")).toBe("-");
    expect(formatAtlListCell("  ")).toBe("-");
  });

  it("keeps valid non-zero values unchanged", () => {
    expect(formatAtlListCell(4)).toBe("4");
    expect(formatAtlListCell("12.50")).toBe("12.50");
    expect(formatAtlListCell("001")).toBe("001");
    expect(formatAtlListCell("FOR_REVIEW")).toBe("FOR_REVIEW");
  });
});

describe("displayTSN", () => {
  it("displays UNK when TSN is unknown, not -", () => {
    expect(displayTSN(null)).toBe("UNK");
    expect(displayTSN(undefined)).toBe("UNK");
    expect(displayTSN("")).toBe("UNK");
  });

  it("keeps a known TSN including 0", () => {
    expect(displayTSN(0)).toBe("0");
    expect(displayTSN("125.5")).toBe("125.5");
  });
});

describe("formatAtlFuelLeftRightForDisplay", () => {
  it("treats 0 as unassigned without changing non-zero sides", () => {
    expect(formatAtlFuelLeftRightForDisplay(0, 0)).toBe("-");
    expect(formatAtlFuelLeftRightForDisplay(0, 5)).toBe("5");
    expect(formatAtlFuelLeftRightForDisplay(4, 5)).toBe("4+5");
  });
});
