import {
  ATL_WORK_STATUS_KEYS,
  type AtlWorkStatusKey,
  isAdminRole,
  isMaintenanceManagerRole,
  isMaintenancePlannerRole,
  isQualityManagerRole,
  isTechnicalPublicationRole,
  normalizeAtlWorkStatus,
} from "./atlEditRbac";

export type AtlBulkStatusEntry = {
  id: number;
  workStatus?: string;
};

type AtlBulkRbacRoleKey =
  | "maintenance_planner"
  | "technical_publication"
  | "maintenance_manager"
  | "quality_manager";

/** Current work_status values for which the bulk checkbox may appear. */
const BULK_SELECTABLE_SOURCE_BY_ROLE: Record<
  AtlBulkRbacRoleKey,
  readonly AtlWorkStatusKey[]
> = {
  maintenance_planner: ["FOR_REVIEW", "AWAITING_ATTACHMENT"],
  technical_publication: ["AWAITING_ATTACHMENT", "PENDING"],
  maintenance_manager: ["PENDING", "APPROVED", "REJECTED_MAINTENANCE"],
  quality_manager: ["APPROVED", "REJECTED_QUALITY"],
};

/** New work status options in the bulk Update Status modal. */
const BULK_TARGET_BY_ROLE: Record<
  AtlBulkRbacRoleKey,
  readonly AtlWorkStatusKey[]
> = {
  maintenance_planner: ["FOR_REVIEW", "AWAITING_ATTACHMENT"],
  technical_publication: ["AWAITING_ATTACHMENT", "PENDING"],
  maintenance_manager: ["PENDING", "APPROVED", "REJECTED_MAINTENANCE"],
  quality_manager: ["APPROVED", "COMPLETED", "REJECTED_QUALITY"],
};

function sortAtlWorkStatusKeys(keys: AtlWorkStatusKey[]): AtlWorkStatusKey[] {
  return [...keys].sort(
    (a, b) => ATL_WORK_STATUS_KEYS.indexOf(a) - ATL_WORK_STATUS_KEYS.indexOf(b)
  );
}

function resolveBulkRbacRoleKey(
  userRole: string | undefined
): AtlBulkRbacRoleKey | null {
  if (isMaintenancePlannerRole(userRole)) return "maintenance_planner";
  if (isTechnicalPublicationRole(userRole)) return "technical_publication";
  if (isMaintenanceManagerRole(userRole)) return "maintenance_manager";
  if (isQualityManagerRole(userRole)) return "quality_manager";
  return null;
}

/**
 * Whether bulk work-status update is available for this role (has target statuses).
 */
export function canUseAtlBulkWorkStatusUpdate(
  userRole: string | undefined
): boolean {
  return getAtlBulkTargetStatusesForRole(userRole).length > 0;
}

/** Source statuses where the row checkbox may be shown (never includes COMPLETED). */
export function getAtlBulkSelectableSourceStatusesForRole(
  userRole: string | undefined
): AtlWorkStatusKey[] {
  if (isAdminRole(userRole)) {
    return sortAtlWorkStatusKeys(
      ATL_WORK_STATUS_KEYS.filter((k) => k !== "COMPLETED")
    );
  }
  const key = resolveBulkRbacRoleKey(userRole);
  if (!key) return [];
  return sortAtlWorkStatusKeys([...BULK_SELECTABLE_SOURCE_BY_ROLE[key]]);
}

/** New work status options in the bulk Update Status modal. */
export function getAtlBulkTargetStatusesForRole(
  userRole: string | undefined
): AtlWorkStatusKey[] {
  if (isAdminRole(userRole)) {
    return sortAtlWorkStatusKeys([...ATL_WORK_STATUS_KEYS]);
  }
  const key = resolveBulkRbacRoleKey(userRole);
  if (!key) return [];
  return sortAtlWorkStatusKeys([...BULK_TARGET_BY_ROLE[key]]);
}

/**
 * Show bulk checkbox for this ATL row.
 * COMPLETED is always hidden; current status must be in the role's allowed source list.
 */
export function canShowAtlBulkCheckboxForEntry(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  const from = normalizeAtlWorkStatus(workStatus);
  if (!from || from === "COMPLETED") {
    return false;
  }
  return getAtlBulkSelectableSourceStatusesForRole(userRole).includes(from);
}

/** Whether this role may bulk-update an entry from its current status to the target status. */
export function canBulkUpdateAtlToTargetStatus(
  userRole: string | undefined,
  fromStatus: string | undefined,
  toStatus: string | undefined
): boolean {
  const from = normalizeAtlWorkStatus(fromStatus);
  const to = normalizeAtlWorkStatus(toStatus);
  if (!from || !to || from === to) {
    return false;
  }
  if (!canShowAtlBulkCheckboxForEntry(userRole, from)) {
    return false;
  }
  return getAtlBulkTargetStatusesForRole(userRole).includes(to);
}

/** @deprecated Use {@link canBulkUpdateAtlToTargetStatus} */
export function canTransitionAtlWorkStatusForBulk(
  userRole: string | undefined,
  fromStatus: string | undefined,
  toStatus: string | undefined
): boolean {
  return canBulkUpdateAtlToTargetStatus(userRole, fromStatus, toStatus);
}

export function validateAtlEntriesForBulkWorkStatus(
  userRole: string | undefined,
  entries: AtlBulkStatusEntry[],
  targetStatus: string
): {
  validIds: number[];
  failedItems: Array<{ id: number; reason: string }>;
} {
  const to = normalizeAtlWorkStatus(targetStatus);
  const allowedTargets = getAtlBulkTargetStatusesForRole(userRole);

  if (!to || !allowedTargets.includes(to)) {
    return {
      validIds: [],
      failedItems: entries.map((e) => ({
        id: e.id,
        reason: "Invalid or unauthorized work status for bulk update.",
      })),
    };
  }

  const validIds: number[] = [];
  const failedItems: Array<{ id: number; reason: string }> = [];

  for (const entry of entries) {
    const id = Number(entry.id);
    if (!Number.isFinite(id) || id <= 0) {
      failedItems.push({ id: entry.id, reason: "Invalid ATL id." });
      continue;
    }
    const from = normalizeAtlWorkStatus(entry.workStatus);
    if (!canShowAtlBulkCheckboxForEntry(userRole, from)) {
      failedItems.push({
        id,
        reason:
          from === "COMPLETED"
            ? "Completed entries cannot be bulk updated."
            : "Your role cannot bulk update entries at this work status.",
      });
      continue;
    }
    if (from === to) {
      failedItems.push({
        id,
        reason: `Entry is already ${to.replace(/_/g, " ")}.`,
      });
      continue;
    }
    if (!canBulkUpdateAtlToTargetStatus(userRole, from, to)) {
      failedItems.push({
        id,
        reason: `Cannot change work status from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")} for your role.`,
      });
      continue;
    }
    validIds.push(id);
  }

  return { validIds, failedItems };
}
