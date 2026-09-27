import { useAuth } from "../../hooks/useAuth";
import { EmptyState } from "../common/EmptyState";

/** Client-side gate for admin-only pages reachable within the shared
 * /admin layout (which only requires staff-or-admin). This just gives
 * staff a clear message instead of a confusing 403 from the API — the
 * backend's IsAdminRole permission is still the real enforcement. */
export function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <EmptyState title="Admins only" description="This section is restricted to admin accounts." />;
  }
  return children;
}
