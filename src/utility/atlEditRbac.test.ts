import { describe, expect, it } from "vitest";
import {
  ATL_EDIT_FORBIDDEN_MESSAGE,
  canBypassAtlLockedStatusEdit,
  canEditAtlFields,
  canEditAtlWhiteAtlDfpFields,
  canOpenAtlEditModal,
  canShowAtlWhiteAtlDfpSection,
  canUpdateAtlWhiteAtlDfpFields,
  canUploadWhiteAtlAndDfpFiles,
  getAtlWorkStatusDropdownKeysForRole,
  hasAtlWhiteAtlDfpContent,
  isAtlLockedWorkStatus,
  isMaintenancePlannerAtlWorkStatusLockedOnEdit,
} from "./atlEditRbac";

describe("ATL RBAC — Maintenance Planner", () => {
  const role = "Maintenance Planner";

  it("allows FOR_REVIEW, AWAITING_ATTACHMENT, PENDING, and REJECTED_MAINTENANCE", () => {
    expect(canEditAtlFields(role, "FOR_REVIEW")).toBe(true);
    expect(canEditAtlFields(role, "AWAITING_ATTACHMENT")).toBe(true);
    expect(canEditAtlFields(role, "PENDING")).toBe(true);
    expect(canEditAtlFields(role, "REJECTED_MAINTENANCE")).toBe(true);
  });

  it("blocks REJECTED_QUALITY, COMPLETED, and APPROVED", () => {
    for (const s of ["REJECTED_QUALITY", "COMPLETED", "APPROVED"]) {
      expect(canEditAtlFields(role, s)).toBe(false);
    }
  });

  it("dropdown lists all allowed statuses (bulk / non-edit)", () => {
    expect(getAtlWorkStatusDropdownKeysForRole(role)).toEqual([
      "FOR_REVIEW",
      "AWAITING_ATTACHMENT",
      "PENDING",
      "REJECTED_MAINTENANCE",
    ]);
  });

  it("locks work status change on edit at PENDING and REJECTED_MAINTENANCE", () => {
    expect(
      isMaintenancePlannerAtlWorkStatusLockedOnEdit(role, "PENDING", true)
    ).toBe(true);
    expect(
      isMaintenancePlannerAtlWorkStatusLockedOnEdit(
        role,
        "REJECTED_MAINTENANCE",
        true
      )
    ).toBe(true);
    expect(
      isMaintenancePlannerAtlWorkStatusLockedOnEdit(role, "FOR_REVIEW", true)
    ).toBe(false);
    expect(
      isMaintenancePlannerAtlWorkStatusLockedOnEdit(role, "PENDING", false)
    ).toBe(false);
  });

  it("edit dropdown shows only current status when locked", () => {
    expect(
      getAtlWorkStatusDropdownKeysForRole(role, {
        isEdit: true,
        currentWorkStatus: "PENDING",
      })
    ).toEqual(["PENDING"]);
    expect(
      getAtlWorkStatusDropdownKeysForRole(role, {
        isEdit: true,
        currentWorkStatus: "REJECTED_MAINTENANCE",
      })
    ).toEqual(["REJECTED_MAINTENANCE"]);
  });

  it("edit dropdown lists FOR_REVIEW and AWAITING_ATTACHMENT when change allowed", () => {
    expect(
      getAtlWorkStatusDropdownKeysForRole(role, {
        isEdit: true,
        currentWorkStatus: "AWAITING_ATTACHMENT",
      })
    ).toEqual(["FOR_REVIEW", "AWAITING_ATTACHMENT"]);
  });

  it("edit dropdown at FOR_REVIEW includes current status for display", () => {
    expect(
      getAtlWorkStatusDropdownKeysForRole(role, {
        isEdit: true,
        currentWorkStatus: "FOR_REVIEW",
      })
    ).toEqual(["FOR_REVIEW", "AWAITING_ATTACHMENT"]);
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

  it("allows APPROVED and REJECTED_QUALITY; COMPLETED is admin-only for edits", () => {
    expect(canEditAtlFields(role, "APPROVED")).toBe(true);
    expect(canEditAtlFields(role, "REJECTED_QUALITY")).toBe(true);
    expect(canEditAtlFields(role, "COMPLETED")).toBe(false);
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

  it("only Admin bypasses lock at COMPLETED", () => {
    expect(canBypassAtlLockedStatusEdit("Admin", "COMPLETED")).toBe(true);
    expect(canBypassAtlLockedStatusEdit("Quality Manager", "COMPLETED")).toBe(
      false
    );
    expect(canBypassAtlLockedStatusEdit("Maintenance Manager", "COMPLETED")).toBe(
      false
    );
    expect(canBypassAtlLockedStatusEdit("Maintenance Planner", "COMPLETED")).toBe(
      false
    );
  });

  it("Admin, Maintenance Manager, and Quality Manager bypass lock at APPROVED", () => {
    expect(canBypassAtlLockedStatusEdit("Admin", "APPROVED")).toBe(true);
    expect(canBypassAtlLockedStatusEdit("Maintenance Manager", "APPROVED")).toBe(
      true
    );
    expect(canBypassAtlLockedStatusEdit("Quality Manager", "APPROVED")).toBe(
      true
    );
    expect(canBypassAtlLockedStatusEdit("Technical Publication", "APPROVED")).toBe(
      false
    );
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

  it("role-only upload check allows Admin, Tech Pub, Maintenance Manager", () => {
    expect(canUploadWhiteAtlAndDfpFiles("Maintenance Manager")).toBe(true);
    expect(canUploadWhiteAtlAndDfpFiles("Technical Publication")).toBe(true);
    expect(canUploadWhiteAtlAndDfpFiles("Quality Manager")).toBe(false);
    expect(canUploadWhiteAtlAndDfpFiles("Maintenance Planner")).toBe(false);
  });
});

describe("ATL RBAC — White ATL / DFP fields", () => {
  const entryWithWhiteAtl = {
    whiteAtlWebLink: "https://example.com/white-atl",
  };

  it("detects White ATL / DFP content on entry", () => {
    expect(hasAtlWhiteAtlDfpContent({})).toBe(false);
    expect(hasAtlWhiteAtlDfpContent(entryWithWhiteAtl)).toBe(true);
  });

  it("only Admin, Technical Publication, and Maintenance Manager may update", () => {
    expect(canUpdateAtlWhiteAtlDfpFields("Admin", "PENDING")).toBe(true);
    expect(
      canUpdateAtlWhiteAtlDfpFields("Technical Publication", "PENDING")
    ).toBe(true);
    expect(canUpdateAtlWhiteAtlDfpFields("Maintenance Manager", "PENDING")).toBe(
      true
    );
    expect(canUpdateAtlWhiteAtlDfpFields("Quality Manager", "APPROVED")).toBe(
      false
    );
    expect(canUpdateAtlWhiteAtlDfpFields("Maintenance Planner", "PENDING")).toBe(
      false
    );
  });

  it("Maintenance Manager may update at allowed statuses only", () => {
    expect(canEditAtlWhiteAtlDfpFields("Maintenance Manager", "PENDING")).toBe(
      true
    );
    expect(
      canEditAtlWhiteAtlDfpFields("Maintenance Manager", "FOR_REVIEW")
    ).toBe(false);
  });

  it("view-only roles see section on edit when entry has White ATL / DFP data", () => {
    expect(
      canShowAtlWhiteAtlDfpSection("Maintenance Planner", "PENDING", {
        isEdit: true,
        entry: entryWithWhiteAtl,
      })
    ).toBe(true);
    expect(
      canUpdateAtlWhiteAtlDfpFields("Maintenance Planner", "PENDING")
    ).toBe(false);
    expect(
      canShowAtlWhiteAtlDfpSection("Quality Manager", "APPROVED", {
        isEdit: true,
        entry: entryWithWhiteAtl,
      })
    ).toBe(true);
    expect(canUpdateAtlWhiteAtlDfpFields("Quality Manager", "APPROVED")).toBe(
      false
    );
  });

  it("canUploadWhiteAtlAndDfpFiles follows update rules when work status provided", () => {
    expect(canUploadWhiteAtlAndDfpFiles("Quality Manager", "APPROVED")).toBe(
      false
    );
    expect(canUploadWhiteAtlAndDfpFiles("Maintenance Manager", "PENDING")).toBe(
      true
    );
  });

  it("only Admin may update White ATL / DFP at COMPLETED", () => {
    expect(canUpdateAtlWhiteAtlDfpFields("Admin", "COMPLETED")).toBe(true);
    expect(canUpdateAtlWhiteAtlDfpFields("Maintenance Manager", "COMPLETED")).toBe(
      false
    );
    expect(canUpdateAtlWhiteAtlDfpFields("Quality Manager", "COMPLETED")).toBe(
      false
    );
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
