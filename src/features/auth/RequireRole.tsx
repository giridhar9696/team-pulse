import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";
import type { UserRole } from "./authService";

type RequireRoleProps = {
  role: UserRole;
};

export function RequireRole({ role }: RequireRoleProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <Outlet />;
}
