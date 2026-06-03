import { describe, expect, it } from "vitest";
import {
  isAtlEditAllowedForRoleAndWorkStatus,
  getAtlWorkStatusDropdownKeysForRole,
  MAINTENANCE_PLANNER_ATL_EDIT_DENIED_MESSAGE,
  getAtlEditDeniedMessage,
} from "./atlEditRbac";

describe("Maintenance Planner ATL edit RBAC", () => {
  const role = "Maintenance Planner";

  it("blocks edit for REJECTED_QUALITY, PENDING, COMPLETED, and APPROVED", () => {
    for (const status of [
      "REJECTED_QUALITY",
      "PENDING",
      "COMPLETED",
      "APPROVED",
    ]) {
      expect(isAtlEditAllowedForRoleAndWorkStatus(role, status)).toBe(false);
    }
  });

  it("allows edit only for FOR_REVIEW and AWAITING_ATTACHMENT", () => {
    expect(isAtlEditAllowedForRoleAndWorkStatus(role, "FOR_REVIEW")).toBe(true);
    expect(
      isAtlEditAllowedForRoleAndWorkStatus(role, "AWAITING_ATTACHMENT")
    ).toBe(true);
    expect(
      isAtlEditAllowedForRoleAndWorkStatus(role, "REJECTED_MAINTENANCE")
    ).toBe(false);
  });

  it("returns the required denial message for blocked statuses", () => {
    expect(getAtlEditDeniedMessage(role, "APPROVED")).toBe(
      MAINTENANCE_PLANNER_ATL_EDIT_DENIED_MESSAGE
    );
  });

  it("work status dropdown offers only FOR_REVIEW and AWAITING_ATTACHMENT", () => {
    const keys = getAtlWorkStatusDropdownKeysForRole(role);
    expect(keys).toEqual(["FOR_REVIEW", "AWAITING_ATTACHMENT"]);
  });
});
