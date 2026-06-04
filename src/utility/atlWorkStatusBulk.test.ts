import { describe, expect, it } from "vitest";
import {
  canBulkUpdateAtlToTargetStatus,
  canShowAtlBulkCheckboxForEntry,
  getAtlBulkSelectableSourceStatusesForRole,
  getAtlBulkTargetStatusesForRole,
  validateAtlEntriesForBulkWorkStatus,
} from "./atlWorkStatusBulk";

describe("getAtlBulkSelectableSourceStatusesForRole", () => {
  it("returns planner sources", () => {
    expect(getAtlBulkSelectableSourceStatusesForRole("Maintenance Planner")).toEqual(
      ["FOR_REVIEW", "AWAITING_ATTACHMENT"]
    );
  });

  it("returns technical publication sources", () => {
    expect(
      getAtlBulkSelectableSourceStatusesForRole("Technical Publication")
    ).toEqual(["AWAITING_ATTACHMENT", "PENDING"]);
  });

  it("returns maintenance manager sources", () => {
    expect(
      getAtlBulkSelectableSourceStatusesForRole("Maintenance Manager")
    ).toEqual(
      expect.arrayContaining(["PENDING", "APPROVED", "REJECTED_MAINTENANCE"])
    );
    expect(
      getAtlBulkSelectableSourceStatusesForRole("Maintenance Manager")
    ).toHaveLength(3);
  });

  it("returns quality manager sources without COMPLETED", () => {
    expect(getAtlBulkSelectableSourceStatusesForRole("Quality Manager")).toEqual(
      ["APPROVED", "REJECTED_QUALITY"]
    );
  });
});

describe("getAtlBulkTargetStatusesForRole", () => {
  it("returns planner targets", () => {
    expect(getAtlBulkTargetStatusesForRole("Maintenance Planner")).toEqual([
      "FOR_REVIEW",
      "AWAITING_ATTACHMENT",
    ]);
  });

  it("returns quality manager targets including COMPLETED", () => {
    expect(getAtlBulkTargetStatusesForRole("Quality Manager")).toEqual(
      expect.arrayContaining(["APPROVED", "COMPLETED", "REJECTED_QUALITY"])
    );
    expect(getAtlBulkTargetStatusesForRole("Quality Manager")).toHaveLength(3);
  });
});

describe("canShowAtlBulkCheckboxForEntry", () => {
  it("always hides COMPLETED", () => {
    expect(
      canShowAtlBulkCheckboxForEntry("Quality Manager", "COMPLETED")
    ).toBe(false);
    expect(canShowAtlBulkCheckboxForEntry("Admin", "COMPLETED")).toBe(false);
  });

  it("shows checkbox for maintenance manager at PENDING", () => {
    expect(
      canShowAtlBulkCheckboxForEntry("Maintenance Manager", "PENDING")
    ).toBe(true);
  });

  it("hides checkbox for maintenance manager at FOR_REVIEW", () => {
    expect(
      canShowAtlBulkCheckboxForEntry("Maintenance Manager", "FOR_REVIEW")
    ).toBe(false);
  });

  it("shows checkbox for quality manager at APPROVED", () => {
    expect(
      canShowAtlBulkCheckboxForEntry("Quality Manager", "APPROVED")
    ).toBe(true);
  });
});

describe("canBulkUpdateAtlToTargetStatus", () => {
  it("allows maintenance manager PENDING to APPROVED", () => {
    expect(
      canBulkUpdateAtlToTargetStatus(
        "Maintenance Manager",
        "PENDING",
        "APPROVED"
      )
    ).toBe(true);
  });

  it("allows quality manager APPROVED to COMPLETED", () => {
    expect(
      canBulkUpdateAtlToTargetStatus(
        "Quality Manager",
        "APPROVED",
        "COMPLETED"
      )
    ).toBe(true);
  });

  it("blocks target outside role list", () => {
    expect(
      canBulkUpdateAtlToTargetStatus(
        "Maintenance Planner",
        "FOR_REVIEW",
        "APPROVED"
      )
    ).toBe(false);
  });
});

describe("validateAtlEntriesForBulkWorkStatus", () => {
  it("returns valid ids when source and target are allowed", () => {
    const result = validateAtlEntriesForBulkWorkStatus(
      "Maintenance Manager",
      [{ id: 1, workStatus: "PENDING" }],
      "APPROVED"
    );
    expect(result.validIds).toEqual([1]);
    expect(result.failedItems).toEqual([]);
  });

  it("fails COMPLETED entries", () => {
    const result = validateAtlEntriesForBulkWorkStatus(
      "Admin",
      [{ id: 2, workStatus: "COMPLETED" }],
      "APPROVED"
    );
    expect(result.validIds).toEqual([]);
    expect(result.failedItems[0].reason).toContain("Completed");
  });
});
