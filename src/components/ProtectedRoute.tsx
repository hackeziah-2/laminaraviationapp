import { Navigate } from "react-router-dom";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { SpinnerIcon } from "./ui/spinner";

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
      <div className="flex min-h-[200px] items-center justify-center">
        <SpinnerIcon size="lg" />
      </div>
    );
  }

  if (!canAccess(moduleCode)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
