/**
 * Role-name normalization and authorization aliases.
 *
 * Display names stay as stored (e.g. "Mechanic - Maintenance Manager").
 * Authorization and permission loading may resolve an alias to a canonical role.
 */

export const MAINTENANCE_MANAGER_ROLE_NAME = "Maintenance Manager";
export const MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME =
  "Mechanic - Maintenance Manager";

export function normalizeRoleNameForMatch(raw: string | undefined): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/-/g, " ")
    .replace(/[.'"]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alias display names → canonical role used for permission loading. */
const AUTHORIZATION_ROLE_ALIASES: Record<string, string> = {
  [normalizeRoleNameForMatch(MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME)]:
    MAINTENANCE_MANAGER_ROLE_NAME,
};

export function isCanonicalMaintenanceManagerRole(
  userRole: string | undefined | null
): boolean {
  const n = normalizeRoleNameForMatch(userRole ?? undefined);
  return n === "maintenance manager" || n === "maint manager";
}

export function isMechanicMaintenanceManagerRole(
  userRole: string | undefined | null
): boolean {
  const n = normalizeRoleNameForMatch(userRole ?? undefined);
  return n === normalizeRoleNameForMatch(
    MECHANIC_MAINTENANCE_MANAGER_ROLE_NAME
  );
}

/** True when this display role should use Maintenance Manager authorization. */
export function inheritsMaintenanceManagerAuthorization(
  userRole: string | undefined | null
): boolean {
  return (
    isCanonicalMaintenanceManagerRole(userRole) ||
    isMechanicMaintenanceManagerRole(userRole)
  );
}

/**
 * Canonical role name for authorization lookups. The original display name is
 * unchanged; only access checks may follow this mapping.
 */
export function resolveCanonicalAuthorizationRole(
  roleName: string | undefined | null
): string {
  const trimmed = String(roleName ?? "").trim();
  if (!trimmed) return "";
  const aliased =
    AUTHORIZATION_ROLE_ALIASES[normalizeRoleNameForMatch(trimmed)];
  return aliased ?? trimmed;
}

/** Load Maintenance Manager's stored permissions for the Mechanic - MM alias. */
export function shouldLoadCanonicalPermissionRole(
  roleName: string | undefined | null
): boolean {
  return isMechanicMaintenanceManagerRole(roleName);
}

export function resolvePermissionSourceRoleId(options: {
  userRoleName?: string | null;
  userRoleId?: number | null;
  roles: Array<{ id: number; name: string }>;
}): number {
  const userRoleId = Number(options.userRoleId ?? 0);
  const fallback = Number.isFinite(userRoleId) && userRoleId > 0 ? userRoleId : 0;

  if (!shouldLoadCanonicalPermissionRole(options.userRoleName)) {
    return fallback;
  }

  const canonical = options.roles.find((role) =>
    isCanonicalMaintenanceManagerRole(role.name)
  );
  const canonicalId = Number(canonical?.id ?? 0);
  if (Number.isFinite(canonicalId) && canonicalId > 0) return canonicalId;
  return fallback;
}

/** Look up a role map by display name, then by canonical authorization alias. */
export function lookupMappedValueForRole<T>(
  roleName: string | undefined | null,
  map: Record<string, T>
): T | undefined {
  if (!map || roleName == null) return undefined;
  const raw = String(roleName);
  if (Object.prototype.hasOwnProperty.call(map, raw)) return map[raw];

  const canonical = resolveCanonicalAuthorizationRole(raw);
  if (
    canonical &&
    canonical !== raw &&
    Object.prototype.hasOwnProperty.call(map, canonical)
  ) {
    return map[canonical];
  }

  const n = normalizeRoleNameForMatch(raw);
  const canonicalN = normalizeRoleNameForMatch(canonical);
  for (const [key, value] of Object.entries(map)) {
    const kn = normalizeRoleNameForMatch(key);
    if (kn === n) return value;
    if (canonicalN && kn === canonicalN) return value;
  }
  return undefined;
}
