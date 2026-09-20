import { describe, expect, it } from "vitest";
import { getPostLoginPath } from "../api/authApi";
import {
  ATL_WORK_STATUS_KEYS,
  canBypassAtlLockedStatusEdit,
  canCreateAtlBatch,
  canEditAtlBatch,
  canEditAtlFields,
  canEditAtlWhiteAtlDfpFields,
  canManageAtlBatchFilter,
  canOpenAtlEditModal,
  canShowAtlWhiteAtlDfpSection,
  canUpdateAtlWhiteAtlDfpFields,
  canUploadWhiteAtlAndDfpFiles,
  getAtlWorkStatusDropdownKeysForRole,
  isAdminRole,
  isAtlWhiteAtlDfpOnlyEdit,
  isMaintenanceManagerRole,
  isMaintenancePlannerAtlWorkStatusLockedOnEdit,
  isMaintenancePlannerRole,
  isMechanicRole,
  isQualityManagerRole,
  isTechnicalPublicationRole,
  resolveAtlRbacRole,
} from "./atlEditRbac";
import {
  canBulkUpdateAtlToTargetStatus,
  canShowAtlBulkCheckboxForEntry,
  canUseAtlBulkWorkStatusUpdate,
  getAtlBulkSelectableSourceStatusesForRole,
  getAtlBulkTargetStatusesForRole,
} from "./atlWorkStatusBulk";
import {
  MAINTENANCE_MANAGER_ROLE_NAME,
  MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME,
  inheritsMaintenanceManagerAuthorization,
  isCanonicalMaintenanceManagerRole,
  isMechanicMaintenanceManagerRole,
  lookupMappedValueForRole,
  resolveCanonicalAuthorizationRole,
  resolvePermissionSourceRoleId,
  shouldLoadCanonicalPermissionRole,
} from "./roleAuthorization";
import { isAssignableTechnicalPublicationUserRole } from "./technicalPublicationAddUser";

const MECHANIC_MM_ROLE_VARIANTS = [
  MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME,
  "mechanic - maintenance manager",
  "Mechanic-Maintenance Manager",
];

function getRoleAuthorizationSnapshot(role: string) {
  const statuses = [...ATL_WORK_STATUS_KEYS, "", undefined] as const;
  return {
    isAdmin: isAdminRole(role),
    isMaintenanceManager: isMaintenanceManagerRole(role),
    isMaintenancePlanner: isMaintenancePlannerRole(role),
    isQualityManager: isQualityManagerRole(role),
    isTechnicalPublication: isTechnicalPublicationRole(role),
    isMechanic: isMechanicRole(role),
    inheritsMaintenanceManager: inheritsMaintenanceManagerAuthorization(role),
    atlRbacRole: resolveAtlRbacRole(role),
    canCreateAtlBatch: canCreateAtlBatch(role),
    canEditAtlBatch: canEditAtlBatch(role),
    canOpenAtlEditModal: canOpenAtlEditModal(role),
    canManageAtlBatchFilter: canManageAtlBatchFilter(role),
    canUseAtlBulkWorkStatusUpdate: canUseAtlBulkWorkStatusUpdate(role),
    bulkSources: getAtlBulkSelectableSourceStatusesForRole(role),
    bulkTargets: getAtlBulkTargetStatusesForRole(role),
    workStatusDropdown: getAtlWorkStatusDropdownKeysForRole(role),
    postLoginPath: getPostLoginPath(role),
    canUploadWhiteAtlDfpRoleOnly: canUploadWhiteAtlAndDfpFiles(role),
    assignableTechnicalPublicationUser:
      isAssignableTechnicalPublicationUserRole(role),
    byStatus: statuses.map((workStatus) => ({
      workStatus: workStatus ?? null,
      canEditAtlFields: canEditAtlFields(role, workStatus),
      canUpdateWhiteAtlDfp: canUpdateAtlWhiteAtlDfpFields(role, workStatus),
      canEditWhiteAtlDfp: canEditAtlWhiteAtlDfpFields(role, workStatus),
      canShowWhiteAtlDfp: canShowAtlWhiteAtlDfpSection(role, workStatus),
      canUploadWhiteAtlDfp: canUploadWhiteAtlAndDfpFiles(role, workStatus),
      canBypassLocked: canBypassAtlLockedStatusEdit(role, workStatus),
      canShowBulkCheckbox: canShowAtlBulkCheckboxForEntry(role, workStatus),
      isWhiteAtlDfpOnlyEdit: isAtlWhiteAtlDfpOnlyEdit(role, workStatus),
      plannerStatusLockedOnEdit: isMaintenancePlannerAtlWorkStatusLockedOnEdit(
        role,
        workStatus,
        true
      ),
      editDropdown: getAtlWorkStatusDropdownKeysForRole(role, {
        isEdit: true,
        currentWorkStatus: workStatus,
      }),
    })),
    bulkTransitions: ATL_WORK_STATUS_KEYS.flatMap((from) =>
      ATL_WORK_STATUS_KEYS.map((to) => ({
        from,
        to,
        allowed: canBulkUpdateAtlToTargetStatus(role, from, to),
      }))
    ),
  };
}

describe("role authorization aliases", () => {
  it("maps Mechanic - Maintenance Manager to Maintenance Manager without renaming it", () => {
    expect(
      resolveCanonicalAuthorizationRole(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME)
    ).toBe(MAINTENANCE_MANAGER_ROLE_NAME);
    expect(isMechanicMaintenanceManagerRole(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME)).toBe(
      true
    );
    expect(isCanonicalMaintenanceManagerRole(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME)).toBe(
      false
    );
    expect(
      isCanonicalMaintenanceManagerRole(MAINTENANCE_MANAGER_ROLE_NAME)
    ).toBe(true);
    expect(
      shouldLoadCanonicalPermissionRole(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME)
    ).toBe(true);
    expect(shouldLoadCanonicalPermissionRole(MAINTENANCE_MANAGER_ROLE_NAME)).toBe(
      false
    );
  });

  it("does not alias other roles onto Maintenance Manager", () => {
    expect(resolveCanonicalAuthorizationRole("Mechanic")).toBe("Mechanic");
    expect(resolveCanonicalAuthorizationRole("Line Mechanic")).toBe(
      "Line Mechanic"
    );
    expect(resolveCanonicalAuthorizationRole("Maintenance Planner")).toBe(
      "Maintenance Planner"
    );
    expect(resolveCanonicalAuthorizationRole("Quality Manager")).toBe(
      "Quality Manager"
    );
    expect(shouldLoadCanonicalPermissionRole("Mechanic")).toBe(false);
    expect(isMechanicMaintenanceManagerRole("Mechanic")).toBe(false);
  });

  it("loads Maintenance Manager permission rows for the Mechanic - MM alias only", () => {
    const roles = [
      { id: 4, name: "Mechanic" },
      { id: 10, name: MAINTENANCE_MANAGER_ROLE_NAME },
      { id: 11, name: MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME },
      { id: 12, name: "Quality Manager" },
    ];

    expect(
      resolvePermissionSourceRoleId({
        userRoleName: MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME,
        userRoleId: 11,
        roles,
      })
    ).toBe(10);

    expect(
      resolvePermissionSourceRoleId({
        userRoleName: MAINTENANCE_MANAGER_ROLE_NAME,
        userRoleId: 10,
        roles,
      })
    ).toBe(10);

    expect(
      resolvePermissionSourceRoleId({
        userRoleName: "Mechanic",
        userRoleId: 4,
        roles,
      })
    ).toBe(4);

    expect(
      resolvePermissionSourceRoleId({
        userRoleName: "Quality Manager",
        userRoleId: 12,
        roles,
      })
    ).toBe(12);
  });

  it("falls back to the alias role id when Maintenance Manager is missing", () => {
    expect(
      resolvePermissionSourceRoleId({
        userRoleName: MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME,
        userRoleId: 11,
        roles: [{ id: 11, name: MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME }],
      })
    ).toBe(11);
  });

  it("looks up fallback permission maps via the canonical alias without changing other keys", () => {
    const mmPerms = [{ module: "Maintenance", read: true, create: true, update: true, delete: true }];
    const mechanicPerms = [{ module: "Logbook", read: true, create: false, update: false, delete: false }];
    const map = {
      [MAINTENANCE_MANAGER_ROLE_NAME]: mmPerms,
      Mechanic: mechanicPerms,
    };

    expect(
      lookupMappedValueForRole(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME, map)
    ).toBe(mmPerms);
    expect(lookupMappedValueForRole("Mechanic", map)).toBe(mechanicPerms);
    expect(lookupMappedValueForRole("Quality Manager", map)).toBeUndefined();
  });
});

describe("Mechanic - Maintenance Manager matches Maintenance Manager authorization", () => {
  const canonical = MAINTENANCE_MANAGER_ROLE_NAME;
  const expected = getRoleAuthorizationSnapshot(canonical);

  it.each(MECHANIC_MM_ROLE_VARIANTS)(
    "returns identical authorization results for %s",
    (alias) => {
      expect(getRoleAuthorizationSnapshot(alias)).toEqual(expected);
    }
  );

  it("keeps the display name distinct from Maintenance Manager", () => {
    expect(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME).not.toBe(
      MAINTENANCE_MANAGER_ROLE_NAME
    );
    expect(
      isMechanicMaintenanceManagerRole(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME)
    ).toBe(true);
    expect(isCanonicalMaintenanceManagerRole(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME)).toBe(
      false
    );
  });

  it("does not change Mechanic, Planner, or Quality Manager authorization", () => {
    expect(isMaintenanceManagerRole("Mechanic")).toBe(false);
    expect(isMechanicRole("Mechanic")).toBe(true);
    expect(canOpenAtlEditModal("Mechanic")).toBe(false);
    expect(canEditAtlFields("Mechanic", "PENDING")).toBe(false);
    expect(canEditAtlBatch("Mechanic")).toBe(false);
    expect(getPostLoginPath("Mechanic")).toBe("/profile");
    expect(isAssignableTechnicalPublicationUserRole("Mechanic")).toBe(true);

    expect(isMaintenancePlannerRole("Maintenance Planner")).toBe(true);
    expect(isMaintenanceManagerRole("Maintenance Planner")).toBe(false);
    expect(canCreateAtlBatch("Maintenance Planner")).toBe(true);
    expect(canEditAtlBatch("Maintenance Planner")).toBe(false);

    expect(isQualityManagerRole("Quality Manager")).toBe(true);
    expect(isMaintenanceManagerRole("Quality Manager")).toBe(false);
    expect(canEditAtlFields("Quality Manager", "PENDING")).toBe(false);
    expect(canEditAtlFields("Quality Manager", "APPROVED")).toBe(true);
  });
});
