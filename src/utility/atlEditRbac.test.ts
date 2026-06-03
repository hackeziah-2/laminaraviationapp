import { describe, expect, it } from "vitest";
import {
  ATL_EDIT_FORBIDDEN_MESSAGE,
  canBypassAtlLockedStatusEdit,
  canEditAtlFields,
  canEditAtlWhiteAtlDfpFields,
  canOpenAtlEditModal,
  canUploadWhiteAtlAndDfpFiles,
  getAtlWorkStatusDropdownKeysForRole,
  isAtlLockedWorkStatus,
} from "./atlEditRbac";

describe("ATL RBAC — Maintenance Planner", () => {
  const role = "Maintenance Planner";

  it("allows FOR_REVIEW and AWAITING_ATTACHMENT", () => {
    expect(canEditAtlFields(role, "FOR_REVIEW")).toBe(true);
    expect(canEditAtlFields(role, "AWAITING_ATTACHMENT")).toBe(true);
  });

  it("blocks REJECTED_QUALITY, PENDING, COMPLETED, APPROVED", () => {
    for (const s of ["REJECTED_QUALITY", "PENDING", "COMPLETED", "APPROVED"]) {
      expect(canEditAtlFields(role, s)).toBe(false);
    }
  });
});

describe("ATL RBAC — Technical Publication", () => {
  const role = "Technical Publication";

  it("allows AWAITING_ATTACHMENT and PENDING", () => {
    expect(canEditAtlFields(role, "AWAITING_ATTACHMENT")).toBe(true);
    expect(canEditAtlFields(role, "PENDING")).toBe(true);
  });

  it("blocks APPROVED and FOR_REVIEW", () => {
    expect(canEditAtlFields(role, "APPROVED")).toBe(false);
    expect(canEditAtlFields(role, "FOR_REVIEW")).toBe(false);
  });
});

describe("ATL RBAC — Maintenance Manager", () => {
  const role = "Maintenance Manager";

  it("allows PENDING, REJECTED_MAINTENANCE, APPROVED", () => {
    expect(canEditAtlFields(role, "PENDING")).toBe(true);
    expect(canEditAtlFields(role, "REJECTED_MAINTENANCE")).toBe(true);
    expect(canEditAtlFields(role, "APPROVED")).toBe(true);
  });

  it("blocks COMPLETED and FOR_REVIEW", () => {
    expect(canEditAtlFields(role, "COMPLETED")).toBe(false);
    expect(canEditAtlFields(role, "FOR_REVIEW")).toBe(false);
  });
});

describe("ATL RBAC — Quality Manager", () => {
  const role = "Quality Manager";

  it("allows APPROVED, REJECTED_QUALITY, COMPLETED", () => {
    expect(canEditAtlFields(role, "APPROVED")).toBe(true);
    expect(canEditAtlFields(role, "REJECTED_QUALITY")).toBe(true);
    expect(canEditAtlFields(role, "COMPLETED")).toBe(true);
  });

  it("blocks PENDING", () => {
    expect(canEditAtlFields(role, "PENDING")).toBe(false);
  });

  it("dropdown lists all allowed statuses", () => {
    expect(getAtlWorkStatusDropdownKeysForRole(role)).toEqual([
      "APPROVED",
      "REJECTED_QUALITY",
      "COMPLETED",
    ]);
  });
});

describe("ATL RBAC — locked statuses", () => {
  it("flags COMPLETED and APPROVED as locked", () => {
    expect(isAtlLockedWorkStatus("COMPLETED")).toBe(true);
    expect(isAtlLockedWorkStatus("APPROVED")).toBe(true);
    expect(isAtlLockedWorkStatus("PENDING")).toBe(false);
  });

  it("only Admin, Maintenance Manager, Quality Manager bypass lock", () => {
    expect(canBypassAtlLockedStatusEdit("Admin")).toBe(true);
    expect(canBypassAtlLockedStatusEdit("Maintenance Manager")).toBe(true);
    expect(canBypassAtlLockedStatusEdit("Quality Manager")).toBe(true);
    expect(canBypassAtlLockedStatusEdit("Maintenance Planner")).toBe(false);
    expect(canBypassAtlLockedStatusEdit("Technical Publication")).toBe(false);
  });

  it("planner cannot edit APPROVED even though lock bypass is false", () => {
    expect(canEditAtlFields("Maintenance Planner", "APPROVED")).toBe(false);
  });
});

describe("ATL RBAC — Admin and other roles", () => {
  it("admin can edit any status", () => {
    expect(canEditAtlFields("Admin", "COMPLETED")).toBe(true);
    expect(canEditAtlFields("Admin", "FOR_REVIEW")).toBe(true);
  });

  it("mechanic cannot edit and cannot open edit modal", () => {
    expect(canEditAtlFields("Mechanic", "PENDING")).toBe(false);
    expect(canOpenAtlEditModal("Mechanic")).toBe(false);
    expect(getAtlWorkStatusDropdownKeysForRole("Mechanic")).toEqual([]);
  });

  it("gated roles can open edit modal", () => {
    expect(canOpenAtlEditModal("Quality Manager")).toBe(true);
    expect(canOpenAtlEditModal("Maintenance Planner")).toBe(true);
  });

  it("Maintenance Manager and Quality Manager may upload White ATL / DFP", () => {
    expect(canUploadWhiteAtlAndDfpFiles("Maintenance Manager")).toBe(true);
    expect(canUploadWhiteAtlAndDfpFiles("Quality Manager")).toBe(true);
    expect(canUploadWhiteAtlAndDfpFiles("Maintenance Planner")).toBe(false);
  });
});

describe("ATL RBAC — White ATL / DFP fields", () => {
  it("Maintenance Manager sees TechPub section at allowed statuses", () => {
    expect(
      canEditAtlWhiteAtlDfpFields("Maintenance Manager", "PENDING")
    ).toBe(true);
    expect(
      canEditAtlWhiteAtlDfpFields("Maintenance Manager", "FOR_REVIEW")
    ).toBe(false);
  });

  it("Quality Manager sees TechPub section at allowed statuses", () => {
    expect(
      canEditAtlWhiteAtlDfpFields("Quality Manager", "APPROVED")
    ).toBe(true);
    expect(
      canEditAtlWhiteAtlDfpFields("Quality Manager", "FOR_REVIEW")
    ).toBe(false);
  });
});

describe("ATL RBAC — forbidden message", () => {
  it("uses standard message when edit denied", () => {
    expect(canEditAtlFields("Mechanic", "PENDING")).toBe(false);
    expect(ATL_EDIT_FORBIDDEN_MESSAGE).toContain(
      "do not have permission to edit"
    );
  });
});
