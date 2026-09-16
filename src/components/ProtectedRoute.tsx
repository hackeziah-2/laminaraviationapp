import { useUserPermissions } from "../hooks/useUserPermissions";
import { SpinnerIcon } from "./ui/spinner";
import { ModuleAccessDenied } from "./ModuleAccessDenied";

interface ProtectedRouteProps {
  /** Module code from constants/modulePermissions (e.g. dashboard, profile, settings). */
  moduleCode?: string;
  children: React.ReactNode;
  /** Extra role check after module access. Hiding a menu item is not enough. */
  requireRole?: (role: string | undefined) => boolean;
}

/**
 * Renders children only if the current user's role has read access to the given module.
 * When the backend returned explicit permissions and read is false for this module,
 * shows an access message instead of the list/view (no data display).
 */
export function ProtectedRoute({
  moduleCode,
  children,
  requireRole,
}: ProtectedRouteProps) {
  const { canAccess, loading, permissions, user } = useUserPermissions();

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <SpinnerIcon size="lg" />
      </div>
    );
  }

  if (requireRole && !requireRole(user?.role)) {
    return <ModuleAccessDenied />;
  }

  if (moduleCode && permissions.length > 0 && !canAccess(moduleCode)) {
    return <ModuleAccessDenied />;
  }

  return <>{children}</>;
}
