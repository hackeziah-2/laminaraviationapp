/**
 * ATL (Aircraft Technical Log) RBAC for Operation / Technical Logbook modules.
 *
 * Edit gate (role + current work_status):
 * - Admin → any status
 * - Maintenance Planner → may edit at FOR_REVIEW, AWAITING_ATTACHMENT, PENDING, REJECTED_MAINTENANCE;
 *   on edit at PENDING / REJECTED_MAINTENANCE: Work Status is shown but locked (no status change)
 * - Technical Publication → AWAITING_ATTACHMENT, PENDING
 * - Maintenance Manager → PENDING, REJECTED_MAINTENANCE, APPROVED
 * - Quality Manager → APPROVED, REJECTED_QUALITY (COMPLETED entries are view-only)
 * - All other roles → view only (no field edits)
 *
 * COMPLETED: only Admin may update fields (all roles else view-only).
 * APPROVED (locked): Admin, Maintenance Manager, and Quality Manager may edit
 * when their role also allows that status.
 *
 * Work-status dropdown options match each role's allowed edit statuses.
 */

export const ATL_WORK_STATUS_KEYS = [
  "FOR_REVIEW",
  "AWAITING_ATTACHMENT",
  "REJECTED_MAINTENANCE",
  "APPROVED",
  "REJECTED_QUALITY",
  "PENDING",
  "COMPLETED",
] as const;

export type AtlWorkStatusKey = (typeof ATL_WORK_STATUS_KEYS)[number];

export const ATL_LOCKED_WORK_STATUSES: readonly AtlWorkStatusKey[] = [
  "COMPLETED",
  "APPROVED",
];

export const ATL_EDIT_FORBIDDEN_MESSAGE =
  "You do not have permission to edit this ATL record in its current work status.";

const ATL_LOCKED_SET = new Set<AtlWorkStatusKey>(ATL_LOCKED_WORK_STATUSES);

/** @deprecated Use ATL_EDIT_FORBIDDEN_MESSAGE */
export const MAINTENANCE_PLANNER_ATL_EDIT_DENIED_MESSAGE =
  ATL_EDIT_FORBIDDEN_MESSAGE;

/** @deprecated Use ATL_EDIT_FORBIDDEN_MESSAGE */
export const MAINTENANCE_MANAGER_ATL_EDIT_DENIED_MESSAGE =
  ATL_EDIT_FORBIDDEN_MESSAGE;

export const MAINTENANCE_PLANNER_ATL_WORK_STATUS_OPTIONS: readonly AtlWorkStatusKey[] =
  ["FOR_REVIEW", "AWAITING_ATTACHMENT", "PENDING", "REJECTED_MAINTENANCE"];

/** Work-status transitions in the edit-entry dropdown when status change is allowed. */
export const MAINTENANCE_PLANNER_ATL_EDIT_DROPDOWN_OPTIONS: readonly AtlWorkStatusKey[] =
  ["FOR_REVIEW", "AWAITING_ATTACHMENT"];

/** On edit, Maintenance Planner may not change work status when entry is at these statuses. */
export const MAINTENANCE_PLANNER_ATL_WORK_STATUS_LOCKED_ON_EDIT: readonly AtlWorkStatusKey[] =
  ["PENDING", "REJECTED_MAINTENANCE"];

export const MAINTENANCE_PLANNER_ATL_EDIT_BLOCKED_STATUSES: readonly AtlWorkStatusKey[] =
  ["REJECTED_QUALITY", "COMPLETED", "APPROVED"];

export const MAINTENANCE_MANAGER_ATL_WORK_STATUS_OPTIONS: readonly AtlWorkStatusKey[] =
  ["PENDING", "REJECTED_MAINTENANCE", "APPROVED"];

export const QUALITY_MANAGER_ATL_WORK_STATUS_OPTIONS: readonly AtlWorkStatusKey[] =
  ["APPROVED", "REJECTED_QUALITY", "COMPLETED"];

export const TECHNICAL_PUBLICATION_ATL_WORK_STATUS_OPTIONS: readonly AtlWorkStatusKey[] =
  ["AWAITING_ATTACHMENT", "PENDING"];

type AtlRbacRole =
  | "maintenance_planner"
  | "maintenance_manager"
  | "technical_publication"
  | "quality_manager";

const ATL_EDIT_ALLOWED_BY_ROLE: Record<AtlRbacRole, ReadonlySet<AtlWorkStatusKey>> =
  {
    maintenance_planner: new Set(MAINTENANCE_PLANNER_ATL_WORK_STATUS_OPTIONS),
    technical_publication: new Set(
      TECHNICAL_PUBLICATION_ATL_WORK_STATUS_OPTIONS
    ),
    maintenance_manager: new Set(MAINTENANCE_MANAGER_ATL_WORK_STATUS_OPTIONS),
    quality_manager: new Set(QUALITY_MANAGER_ATL_WORK_STATUS_OPTIONS),
  };

export function normalizeAtlWorkStatus(
  status: string | undefined
): AtlWorkStatusKey | "" {
  if (!status || status.trim() === "") return "";
  const key = status
    .trim()
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
  return (ATL_WORK_STATUS_KEYS as readonly string[]).includes(key)
    ? (key as AtlWorkStatusKey)
    : "";
}

function normalizeRoleNameForMatch(raw: string | undefined): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[.'"]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAtlLockedWorkStatus(
  workStatus: string | undefined
): boolean {
  const key = normalizeAtlWorkStatus(workStatus);
  return Boolean(key && ATL_LOCKED_SET.has(key));
}

export function isAtlCompletedWorkStatus(
  workStatus: string | undefined
): boolean {
  return normalizeAtlWorkStatus(workStatus) === "COMPLETED";
}

export function isQualityManagerRole(userRole: string | undefined): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return (
    n === "quality manager" ||
    n === "qa manager" ||
    n.endsWith(" quality manager")
  );
}

/**
 * Roles that may edit ATL when work status is locked (APPROVED / COMPLETED).
 * At COMPLETED, only Admin may bypass; at APPROVED, Admin / MM / QM may bypass.
 */
export function canBypassAtlLockedStatusEdit(
  userRole: string | undefined,
  workStatus?: string | undefined
): boolean {
  if (isAtlCompletedWorkStatus(workStatus)) {
    return isAdminRole(userRole);
  }
  return (
    isAdminRole(userRole) ||
    isMaintenanceManagerRole(userRole) ||
    isQualityManagerRole(userRole)
  );
}

export function isAdminRole(userRole: string | undefined): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return (
    n === "admin" ||
    n === "administrator" ||
    n.endsWith(" admin") ||
    n.endsWith(" administrator")
  );
}

export function isMaintenancePlannerRole(
  userRole: string | undefined
): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return (
    n === "maintenance planner" ||
    n === "maint planner" ||
    n === "maintenance planning" ||
    n.endsWith(" maintenance planner")
  );
}

export function isMaintenanceManagerRole(
  userRole: string | undefined
): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return (
    n === "maintenance manager" ||
    n === "maint manager" ||
    n.endsWith(" maintenance manager")
  );
}

/** @deprecated Use !canEditAtlFields */
export function isMaintenancePlannerAtlEditBlocked(
  workStatus: string | undefined
): boolean {
  return !canEditAtlFields("Maintenance Planner", workStatus);
}

/** @deprecated Use !canEditAtlFields */
export function isMaintenanceManagerAtlEditBlocked(
  workStatus: string | undefined
): boolean {
  return !canEditAtlFields("Maintenance Manager", workStatus);
}

export function isTechnicalPublicationRole(
  userRole: string | undefined
): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  const hasTechnicalPublicationPhrase =
    n.includes("technical publication") || n.includes("tech publication");
  return (
    hasTechnicalPublicationPhrase ||
    n === "technical publication" ||
    n === "tech publication" ||
    n === "oem technical publication" ||
    n === "oem tech publication" ||
    n.endsWith(" technical publication")
  );
}

export function isTechnicalPublicationTechPubViewWorkStatus(
  workStatus: string | undefined
): boolean {
  const key = normalizeAtlWorkStatus(workStatus);
  return key === "PENDING" || key === "AWAITING_ATTACHMENT";
}

export type AtlWhiteAtlDfpEntryFields = {
  whiteAtl?: string | null;
  whiteAtlWebLink?: string | null;
  dfp?: string | null;
  dfpWebLink?: string | null;
};

/** True when the entry has a stored file path or weblink for White ATL or DFP. */
export function hasAtlWhiteAtlDfpContent(
  entry: AtlWhiteAtlDfpEntryFields | null | undefined
): boolean {
  if (!entry) return false;
  return Boolean(
    entry.whiteAtl?.trim() ||
      entry.whiteAtlWebLink?.trim() ||
      entry.dfp?.trim() ||
      entry.dfpWebLink?.trim()
  );
}

/**
 * Whether the user may update White ATL, DFP, White ATL Weblink, and DFP Weblink.
 * Only Admin, Technical Publication (PENDING / AWAITING_ATTACHMENT), and Maintenance Manager
 * (at allowed work statuses).
 */
export function canUpdateAtlWhiteAtlDfpFields(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  if (isAtlCompletedWorkStatus(workStatus)) {
    return isAdminRole(userRole);
  }
  if (isAdminRole(userRole)) return true;
  if (
    isTechnicalPublicationRole(userRole) &&
    isTechnicalPublicationTechPubViewWorkStatus(workStatus)
  ) {
    return true;
  }
  if (isMaintenanceManagerRole(userRole)) {
    const key = normalizeAtlWorkStatus(workStatus);
    return (
      key !== "" &&
      (MAINTENANCE_MANAGER_ATL_WORK_STATUS_OPTIONS as readonly string[]).includes(
        key
      )
    );
  }
  return false;
}

/** @deprecated Use `canUpdateAtlWhiteAtlDfpFields` */
export function canShowTechPubViewForRoleAndWorkStatus(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return canUpdateAtlWhiteAtlDfpFields(userRole, workStatus);
}

/**
 * Show White ATL / DFP section on edit: privileged roles at allowed status, or any role
 * when the entry already has White ATL / DFP data (view-only).
 */
export function canShowAtlWhiteAtlDfpSection(
  userRole: string | undefined,
  workStatus: string | undefined,
  options?: { isEdit?: boolean; entry?: AtlWhiteAtlDfpEntryFields | null }
): boolean {
  if (options?.isEdit && hasAtlWhiteAtlDfpContent(options.entry)) {
    return true;
  }
  return canUpdateAtlWhiteAtlDfpFields(userRole, workStatus);
}

/** Whether the user may edit White ATL, DFP, and their weblinks. */
export function canEditAtlWhiteAtlDfpFields(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return canUpdateAtlWhiteAtlDfpFields(userRole, workStatus);
}

export function isTechnicalPublicationRestrictedEdit(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return (
    isTechnicalPublicationRole(userRole) &&
    isTechnicalPublicationTechPubViewWorkStatus(workStatus) &&
    canEditAtlFields(userRole, workStatus)
  );
}

/** @deprecated Use `isTechnicalPublicationRestrictedEdit` */
export function isTechnicalPublicationAwaitingAttachmentRestrictedEdit(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return isTechnicalPublicationRestrictedEdit(userRole, workStatus);
}

export function canUploadWhiteAtlAndDfpFiles(
  userRole: string | undefined,
  workStatus?: string | undefined
): boolean {
  if (workStatus !== undefined) {
    return canUpdateAtlWhiteAtlDfpFields(userRole, workStatus);
  }
  return (
    isAdminRole(userRole) ||
    isTechnicalPublicationRole(userRole) ||
    isMaintenanceManagerRole(userRole)
  );
}

/** Attachment-only edit: White ATL / DFP / links without full form edit. */
export function isAtlWhiteAtlDfpOnlyEdit(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return (
    canEditAtlWhiteAtlDfpFields(userRole, workStatus) &&
    !canEditAtlFields(userRole, workStatus)
  );
}

export function isMechanicRole(userRole: string | undefined): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return (
    n === "mechanic" ||
    n === "aircraft mechanic" ||
    n === "a&p mechanic" ||
    n === "ap mechanic" ||
    n.endsWith(" mechanic")
  );
}

export function canManageAtlBatchFilter(
  _userRole: string | undefined
): boolean {
  return true;
}

function isAdminRoleName(n: string): boolean {
  return n === "admin" || n.endsWith(" admin");
}

function isMaintenancePlannerRoleName(n: string): boolean {
  return (
    n === "maintenance planner" ||
    n === "maint planner" ||
    n === "maintenance planning" ||
    n.endsWith(" maintenance planner")
  );
}

function isMaintenanceManagerRoleName(n: string): boolean {
  return (
    n === "maintenance manager" ||
    n === "maint manager" ||
    n.endsWith(" maintenance manager")
  );
}

export function canCreateAtlBatch(userRole: string | undefined): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return isAdminRoleName(n) || isMaintenancePlannerRoleName(n);
}

export function canEditAtlBatch(userRole: string | undefined): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return isAdminRoleName(n) || isMaintenanceManagerRoleName(n);
}

export function resolveAtlRbacRole(
  userRole: string | undefined
): AtlRbacRole | null {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return null;

  if (isMaintenancePlannerRoleName(n)) return "maintenance_planner";
  if (isMaintenanceManagerRoleName(n)) return "maintenance_manager";
  if (isTechnicalPublicationRole(userRole)) return "technical_publication";
  if (isQualityManagerRole(userRole)) return "quality_manager";

  return null;
}

/**
 * Whether the user may change ATL fields (Save/Update) for this work status.
 */
export function canEditAtlFields(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  if (isAdminRole(userRole)) return true;

  const key = normalizeAtlWorkStatus(workStatus);
  if (!key) return false;

  const rbacRole = resolveAtlRbacRole(userRole);
  if (!rbacRole) return false;

  const allowed = ATL_EDIT_ALLOWED_BY_ROLE[rbacRole];
  if (!allowed.has(key)) return false;

  if (
    ATL_LOCKED_SET.has(key) &&
    !canBypassAtlLockedStatusEdit(userRole, workStatus)
  ) {
    return false;
  }

  return true;
}

/**
 * Whether the Edit modal may open (read-only when `canEditAtlFields` is false).
 * Requires module Update permission at the call site.
 */
export function canOpenAtlEditModal(userRole: string | undefined): boolean {
  if (isAdminRole(userRole)) return true;
  return resolveAtlRbacRole(userRole) !== null;
}

/**
 * @deprecated Alias for `canEditAtlFields` — used by list gates and submit checks.
 */
export function isAtlEditAllowedForRoleAndWorkStatus(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return canEditAtlFields(userRole, workStatus);
}

export function getAtlEditDeniedMessage(
  userRole: string | undefined,
  workStatus: string | undefined
): string {
  if (!canEditAtlFields(userRole, workStatus)) {
    return ATL_EDIT_FORBIDDEN_MESSAGE;
  }
  const label = (workStatus || "unset").replace(/_/g, " ");
  return `You cannot edit this ATL entry for your role while work status is ${label}.`;
}

export function formatAtlWorkStatusLabel(key: AtlWorkStatusKey): string {
  return key.replace(/_/g, " ");
}

export type AtlWorkStatusDropdownOptions = {
  pendingRole?: boolean;
  currentWorkStatus?: string;
  /** Edit-entry modal: Maintenance Planner uses a narrower status list. */
  isEdit?: boolean;
};

function sortAtlWorkStatusKeys(
  keys: AtlWorkStatusKey[]
): AtlWorkStatusKey[] {
  return [...keys].sort(
    (a, b) => ATL_WORK_STATUS_KEYS.indexOf(a) - ATL_WORK_STATUS_KEYS.indexOf(b)
  );
}

/** Maintenance Planner edit modal: lock work-status changes at PENDING / REJECTED_MAINTENANCE. */
export function isMaintenancePlannerAtlWorkStatusLockedOnEdit(
  userRole: string | undefined,
  workStatus: string | undefined,
  isEdit = false
): boolean {
  if (!isEdit || !isMaintenancePlannerRole(userRole)) return false;
  const key = normalizeAtlWorkStatus(workStatus);
  return (
    key !== "" &&
    (
      MAINTENANCE_PLANNER_ATL_WORK_STATUS_LOCKED_ON_EDIT as readonly string[]
    ).includes(key)
  );
}

function getMaintenancePlannerEditDropdownKeys(
  currentWorkStatus: string | undefined
): readonly AtlWorkStatusKey[] {
  const cur = normalizeAtlWorkStatus(currentWorkStatus);

  if (
    cur &&
    (
      MAINTENANCE_PLANNER_ATL_WORK_STATUS_LOCKED_ON_EDIT as readonly string[]
    ).includes(cur)
  ) {
    return [cur];
  }

  let keys = [...MAINTENANCE_PLANNER_ATL_EDIT_DROPDOWN_OPTIONS];
  if (
    cur &&
    !keys.includes(cur) &&
    (MAINTENANCE_PLANNER_ATL_WORK_STATUS_OPTIONS as readonly string[]).includes(
      cur
    )
  ) {
    keys = sortAtlWorkStatusKeys([...keys, cur]);
  }

  return sortAtlWorkStatusKeys(keys);
}

export function getAtlWorkStatusDropdownKeysForRole(
  userRole: string | undefined,
  options?: AtlWorkStatusDropdownOptions
): readonly AtlWorkStatusKey[] {
  const trimmed = userRole?.trim();
  if (options?.pendingRole && !trimmed) {
    const cur = normalizeAtlWorkStatus(options.currentWorkStatus);
    return cur ? [cur] : [];
  }

  if (isAdminRole(trimmed)) return ATL_WORK_STATUS_KEYS;

  const rbacRole = resolveAtlRbacRole(trimmed);
  if (!rbacRole) return [];

  if (options?.isEdit && rbacRole === "maintenance_planner") {
    return getMaintenancePlannerEditDropdownKeys(options.currentWorkStatus);
  }

  const allowed = [...ATL_EDIT_ALLOWED_BY_ROLE[rbacRole]];

  const cur = normalizeAtlWorkStatus(options?.currentWorkStatus);
  if (cur && !allowed.includes(cur)) {
    return sortAtlWorkStatusKeys([...allowed, cur]);
  }

  return allowed;
}
