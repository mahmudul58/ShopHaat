import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { Skeleton } from "./Skeleton";

/** Guards any route that requires a logged-in user (checkout, orders,
 * profile, wishlist). Renders a skeleton while the initial session check
 * is still in flight, so we don't flash a login redirect on page refresh. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <Skeleton className="h-8 w-1/3" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
