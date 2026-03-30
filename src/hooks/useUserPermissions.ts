import { useState, useEffect, useCallback } from "react";
import * as authApi from "../api/authApi";
import * as rolesApi from "../api/rolesApi";
import {
  MODULE_PERMISSIONS_LIST,
  getModuleLabel,
} from "../constants/modulePermissions";

export type Permission = rolesApi.Permission;

export interface UserPermissionsState {
  user: authApi.AuthUser | null;
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  canAccess: (moduleCode: string) => boolean;
  canCreate: (moduleCode: string) => boolean;
  canUpdate: (moduleCode: string) => boolean;
  canDelete: (moduleCode: string) => boolean;
  refetch: () => Promise<void>;
}

function matchPermission(
  permissions: Permission[],
  moduleCode: string,
  predicate: (p: Permission) => boolean
): boolean {
  const label = getModuleLabel(moduleCode);
  return permissions.some(
    (p) =>
      (p.module === moduleCode || (label && p.module === label)) && predicate(p)
  );
}

/**
 * Load current user and their role's permissions. Use for Sidebar filtering, route guards, and UI:
 * - read (canAccess): ProtectedRoute shows no list when read is false for the module.
 * - create (canCreate): hide Add/Create actions.
 * - update (canUpdate): hide Edit/Update actions.
 * - delete (canDelete): hide Delete actions.
 * If the backend returns no permission rows, read/create/update/delete checks stay permissive for access (fallback).
 */
export function useUserPermissions(): UserPermissionsState {
  const [user, setUser] = useState<authApi.AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await authApi.getMe();
      setUser(me);

      let roleId = me.roleId;
      if (roleId == null || roleId === 0) {
        const roles = await rolesApi.getRoles();
        const byName = roles.find(
          (r) => r.name.toLowerCase() === (me.role || "").toLowerCase()
        );
        roleId = byName?.id ?? 0;
      }

      if (roleId) {
        const perms = await rolesApi.getRolePermissions(roleId);
        setPermissions(perms);
      } else {
        setPermissions([]);
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load permissions");
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canAccess = useCallback(
    (moduleCode: string) => {
      if (!permissions.length && !loading) {
        return true;
      }
      return matchPermission(permissions, moduleCode, (p) => p.read);
    },
    [permissions, loading]
  );

  const canCreate = useCallback(
    (moduleCode: string) =>
      matchPermission(permissions, moduleCode, (p) => p.create),
    [permissions]
  );

  const canUpdate = useCallback(
    (moduleCode: string) =>
      matchPermission(permissions, moduleCode, (p) => p.update),
    [permissions]
  );

  const canDelete = useCallback(
    (moduleCode: string) =>
      matchPermission(permissions, moduleCode, (p) => p.delete),
    [permissions]
  );

  return {
    user,
    permissions,
    loading,
    error,
    canAccess,
    canCreate,
    canUpdate,
    canDelete,
    refetch: load,
  };
}
