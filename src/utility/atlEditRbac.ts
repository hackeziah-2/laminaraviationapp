/**
 * ATL (Aircraft Technical Log) edit access by role and fleet work_status.
 * Work Status edit dropdown + edit gate use the logged-in user's role name (e.g. from GET /auth/me).
 *
 * Gated roles use two related rule sets:
 * - Current-status edit gate: whether the edit modal may open for the entry.
 * - Dropdown targets: which work_status values the user may pick in the form.
 *
 * Current-status edit gate:
 * - Maintenance Planner → FOR_REVIEW, AWAITING_ATTACHMENT only (blocked at REJECTED_QUALITY, PENDING, COMPLETED, APPROVED, etc.)
 * - Maintenance Manager → FOR_REVIEW, APPROVED
 * - Technical Publication → AWAITING_ATTACHMENT, PENDING
 * - Quality Manager → PENDING
 *
 * Dropdown targets:
 * - Maintenance Planner → FOR_REVIEW, AWAITING_ATTACHMENT
 * - Maintenance Manager → FOR_REVIEW, APPROVED
 * - Technical Publication → AWAITING_ATTACHMENT, PENDING
 * - Quality Manager → PENDING, COMPLETED, REJECTED_QUALITY
 *
 * Roles not listed here are not gated by work status (module update permission still applies).
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

/** Operation / Technical Logbook: Maintenance Planner may edit and pick only these work statuses. */
export const MAINTENANCE_PLANNER_ATL_WORK_STATUS_OPTIONS: readonly AtlWorkStatusKey[] =
  ["FOR_REVIEW", "AWAITING_ATTACHMENT"];

/** Statuses where Maintenance Planner cannot open full ATL edit (includes all non-allowed). */
export const MAINTENANCE_PLANNER_ATL_EDIT_BLOCKED_STATUSES: readonly AtlWorkStatusKey[] =
  ["REJECTED_QUALITY", "PENDING", "COMPLETED", "APPROVED"];

export const MAINTENANCE_PLANNER_ATL_EDIT_DENIED_MESSAGE =
  "Maintenance Planner is not allowed to edit ATL when work status is REJECTED_QUALITY, PENDING, COMPLETED, or APPROVED.";

const MAINTENANCE_PLANNER_ATL_EDIT_ALLOWED_SET = new Set<AtlWorkStatusKey>(
  MAINTENANCE_PLANNER_ATL_WORK_STATUS_OPTIONS
);

export function isMaintenancePlannerAtlEditBlocked(
  workStatus: string | undefined
): boolean {
  const key = normalizeAtlWorkStatus(workStatus);
  if (!key) return true;
  return !MAINTENANCE_PLANNER_ATL_EDIT_ALLOWED_SET.has(key);
}

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

type AtlRbacRole =
  | "maintenance_planner"
  | "maintenance_manager"
  | "technical_publication"
  | "quality_manager";

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

/** Work statuses where TechPubView (White ATL / DFP / links) is shown. */
export function isTechnicalPublicationTechPubViewWorkStatus(
  workStatus: string | undefined
): boolean {
  const key = normalizeAtlWorkStatus(workStatus);
  return key === "PENDING" || key === "AWAITING_ATTACHMENT";
}

/** Admin role variants — full ATL edit; TechPubView on every work status. */
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

/**
 * `#TechPubView` visibility:
 * - Admin: any work status (full ATL edit + White ATL / DFP / links section).
 * - Technical Publication: PENDING or AWAITING_ATTACHMENT only (attachment-only edit).
 */
export function canShowTechPubViewForRoleAndWorkStatus(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  if (isAdminRole(userRole)) return true;
  return (
    isTechnicalPublicationRole(userRole) &&
    isTechnicalPublicationTechPubViewWorkStatus(workStatus)
  );
}

/**
 * Technical Publication attachment-only edit: only White ATL, DFP, and web links are editable;
 * all other fields stay read-only. Applies when work status is PENDING or AWAITING_ATTACHMENT.
 * (Admin uses TechPubView but retains full-form edit.)
 */
export function isTechnicalPublicationRestrictedEdit(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return (
    isTechnicalPublicationRole(userRole) &&
    isTechnicalPublicationTechPubViewWorkStatus(workStatus)
  );
}

/** @deprecated Use `isTechnicalPublicationRestrictedEdit` — kept for existing imports. */
export function isTechnicalPublicationAwaitingAttachmentRestrictedEdit(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  return isTechnicalPublicationRestrictedEdit(userRole, workStatus);
}

/** Technical Publication role variants (incl. OEM) — used for ATL work-status RBAC and upload-only Operation edit. */
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

/**
 * White ATL / DFP file upload in Add/Edit ATL entry: allowed only for Admin and Technical Publication (incl. OEM variants).
 */
export function canUploadWhiteAtlAndDfpFiles(
  userRole: string | undefined
): boolean {
  return isAdminRole(userRole) || isTechnicalPublicationRole(userRole);
}

/**
 * Mechanic role variants. Used to restrict actions that read-only / shop-floor
 * mechanics must not perform (e.g. exporting Fleet Time data, opening the
 * Aircraft Details history page).
 */
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

/**
 * Fleet / logbook "Filter by ATL batch" picker visibility.
 *
 * Per product spec, the ATL batch filter is now available to every authenticated
 * role (Admin, Maintenance Planner, Maintenance Manager, Mechanic, and all
 * "Other Roles"). Batch create/edit gating is enforced separately by
 * `canEditAtlBatch`.
 *
 * Kept as a function (rather than a constant `true`) so the existing call sites
 * across `Operation.tsx`, `AircraftTechnicalLogbook.tsx`, and
 * `AddTechnicalLogbookEntryModal.tsx` keep their explicit visibility flag,
 * and so future role-based gating (if reintroduced) only changes here.
 */
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

export function isMaintenancePlannerRole(
  userRole: string | undefined
): boolean {
  return isMaintenancePlannerRoleName(normalizeRoleNameForMatch(userRole));
}

function isMaintenanceManagerRoleName(n: string): boolean {
  return (
    n === "maintenance manager" ||
    n === "maint manager" ||
    n.endsWith(" maintenance manager")
  );
}

/**
 * Roles allowed to create ATL batch records:
 * Admin and Maintenance Planner.
 */
export function canCreateAtlBatch(userRole: string | undefined): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return isAdminRoleName(n) || isMaintenancePlannerRoleName(n);
}

/**
 * Roles allowed to edit ATL batch records from the operation ATL
 * batch dropdown:
 * Admin and Maintenance Manager.
 */
export function canEditAtlBatch(userRole: string | undefined): boolean {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return false;
  return isAdminRoleName(n) || isMaintenanceManagerRoleName(n);
}

function resolveAtlRbacRole(userRole: string | undefined): AtlRbacRole | null {
  const n = normalizeRoleNameForMatch(userRole);
  if (!n) return null;

  const isPlanner =
    n === "maintenance planner" ||
    n === "maint planner" ||
    n === "maintenance planning" ||
    n.endsWith(" maintenance planner");
  if (isPlanner) return "maintenance_planner";

  const isMaintManager =
    n === "maintenance manager" ||
    n === "maint manager" ||
    n.endsWith(" maintenance manager");
  if (isMaintManager) return "maintenance_manager";

  if (isTechnicalPublicationRole(userRole)) {
    return "technical_publication";
  }

  const isQuality =
    n === "quality manager" ||
    n === "qa manager" ||
    n.endsWith(" quality manager");
  if (isQuality) return "quality_manager";

  return null;
}

const ATL_EDIT_OPEN_ALLOWED_BY_ROLE: Record<
  Exclude<AtlRbacRole, "maintenance_planner">,
  ReadonlySet<AtlWorkStatusKey>
> = {
  maintenance_manager: new Set(["FOR_REVIEW", "APPROVED"]),
  technical_publication: new Set(["AWAITING_ATTACHMENT", "PENDING"]),
  quality_manager: new Set(["PENDING"]),
};

const ATL_EDIT_TARGET_ALLOWED_BY_ROLE: Record<
  Exclude<AtlRbacRole, "maintenance_planner">,
  ReadonlySet<AtlWorkStatusKey>
> = {
  maintenance_manager: new Set(["FOR_REVIEW", "APPROVED"]),
  technical_publication: new Set(["AWAITING_ATTACHMENT", "PENDING"]),
  quality_manager: new Set(["PENDING", "COMPLETED", "REJECTED_QUALITY"]),
};

function isMaintenancePlannerEditOpenAllowed(
  workStatus: string | undefined
): boolean {
  const key = normalizeAtlWorkStatus(workStatus);
  if (!key) return false;
  return MAINTENANCE_PLANNER_ATL_EDIT_ALLOWED_SET.has(key);
}

/** User-facing message when edit is denied for role + work status (Operation / Logbook modules). */
export function getAtlEditDeniedMessage(
  userRole: string | undefined,
  workStatus: string | undefined
): string {
  if (
    isMaintenancePlannerRole(userRole) &&
    isMaintenancePlannerAtlEditBlocked(workStatus)
  ) {
    return MAINTENANCE_PLANNER_ATL_EDIT_DENIED_MESSAGE;
  }
  const label = (workStatus || "unset").replace(/_/g, " ");
  return `You cannot edit this ATL entry for your role while work status is ${label}.`;
}

/**
 * Whether the Edit ATL modal may open for this role and work status.
 * Returns true when the user is not one of the gated roles (caller still enforces module `canUpdate`).
 * Returns false for gated roles when status is missing, unknown, or not in the allowed set.
 */
export function isAtlEditAllowedForRoleAndWorkStatus(
  userRole: string | undefined,
  workStatus: string | undefined
): boolean {
  const rbacRole = resolveAtlRbacRole(userRole);
  if (!rbacRole) return true;
  if (rbacRole === "maintenance_planner") {
    return isMaintenancePlannerEditOpenAllowed(workStatus);
  }
  const key = normalizeAtlWorkStatus(workStatus);
  if (!key) return false;
  return ATL_EDIT_OPEN_ALLOWED_BY_ROLE[rbacRole].has(key);
}

/** Label for select options / display (underscores → spaces). */
export function formatAtlWorkStatusLabel(key: AtlWorkStatusKey): string {
  return key.replace(/_/g, " ");
}

export type AtlWorkStatusDropdownOptions = {
  /**
   * While permissions/user role is still loading, pass true + currentWorkStatus so the
   * select does not briefly list every status (ungated fallback).
   */
  pendingRole?: boolean;
  /** Entry/form work_status (raw); merged into options if missing from allowed set. */
  currentWorkStatus?: string;
};

/**
 * Work status keys shown in the ATL edit form dropdown.
 * Gated roles only see statuses they are allowed to edit; other roles see the full list.
 */
export function getAtlWorkStatusDropdownKeysForRole(
  userRole: string | undefined,
  options?: AtlWorkStatusDropdownOptions
): readonly AtlWorkStatusKey[] {
  const trimmed = userRole?.trim();
  if (options?.pendingRole && !trimmed) {
    const cur = normalizeAtlWorkStatus(options.currentWorkStatus);
    return cur ? [cur] : [];
  }

  const rbacRole = resolveAtlRbacRole(trimmed);
  if (!rbacRole) return ATL_WORK_STATUS_KEYS;

  const allowed =
    rbacRole === "maintenance_planner"
      ? [...MAINTENANCE_PLANNER_ATL_WORK_STATUS_OPTIONS]
      : ATL_WORK_STATUS_KEYS.filter((k) =>
          ATL_EDIT_TARGET_ALLOWED_BY_ROLE[rbacRole].has(k)
        );

  const cur = normalizeAtlWorkStatus(options?.currentWorkStatus);
  if (cur && !allowed.includes(cur)) {
    return [...allowed, cur].sort(
      (a, b) =>
        ATL_WORK_STATUS_KEYS.indexOf(a) - ATL_WORK_STATUS_KEYS.indexOf(b)
    );
  }

  return allowed;
}
