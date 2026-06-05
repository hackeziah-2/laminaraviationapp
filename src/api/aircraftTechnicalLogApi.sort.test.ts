import { describe, expect, it } from "vitest";
import { normalizeAtlPagedSortParam } from "./aircraftTechnicalLogApi";

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
