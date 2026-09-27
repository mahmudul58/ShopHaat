import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

/**
 * Gates the /seller/* routes on the user being signed in with the seller
 * role. If they don't have a seller profile yet, the SellerLayout itself
 * decides whether to render the apply form / pending screen / dashboard.
 *
 * Note: the SellerLayout screen actually does the more granular gating —
 * this route just blocks unauthenticated traffic from reaching it.
 */
export function SellerRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login?next=/seller" replace />;

  return <Outlet />;
}
