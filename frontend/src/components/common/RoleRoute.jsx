import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

/** Guards routes restricted to specific roles (e.g. staff/admin dashboards).
 * Usage: <RoleRoute allowedRoles={["staff", "admin"]} /> */
export function RoleRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
