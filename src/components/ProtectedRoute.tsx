import { Navigate } from "react-router-dom";
import { useUserPermissions } from "../hooks/useUserPermissions";

interface ProtectedRouteProps {
  /** Module code from constants/modulePermissions (e.g. dashboard, profile, settings). */
  moduleCode: string;
  children: React.ReactNode;
}

/**
 * Renders children only if the current user's role has read access to the given module.
 * Otherwise redirects to /dashboard.
 */
export function ProtectedRoute({ moduleCode, children }: ProtectedRouteProps) {
  const { canAccess, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!canAccess(moduleCode)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
