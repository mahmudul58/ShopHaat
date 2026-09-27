import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { FaBars } from "react-icons/fa";

import { MobileDrawer } from "../../components/common/MobileDrawer";
import { useAuth } from "../../hooks/useAuth";
import { fetchMySellerStatus } from "../../services/marketplaceService";
import { SellerApplyGate } from "./SellerApplyGate";
import { SellerApplicationStatus } from "./SellerApplicationStatus";
import { SellerSidebar } from "../../components/seller/SellerSidebar";

/**
 * Shell for /seller/*. Mirrors the AdminLayout pattern but specifically
 * gates the dashboard on seller application status.
 */
export function SellerLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMySellerStatus()
      .then((data) => !cancelled && setStatus(data))
      .catch(() => !cancelled && setStatus(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="mx-auto max-w-7xl px-6 py-16 text-center text-text-secondary">Loading seller center…</div>;
  }

  if (!status) {
    return <Navigate to="/seller/apply" replace />;
  }

  if (status.status !== "APPROVED") {
    return <SellerApplicationStatus profile={status} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border-subtle bg-surface-card px-4 py-3 shadow-card lg:hidden">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Seller Center</h1>
          <p className="text-xs text-text-secondary">{status.store_name} · {user?.full_name}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded p-2 text-text-secondary hover:bg-canvas-elevated"
        >
          <FaBars />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border-subtle bg-surface-card p-3 shadow-card">
            <SellerSidebar />
          </div>
        </aside>

        <div className="lg:hidden">
          <Outlet />
        </div>
        <div className="hidden lg:block">
          <Outlet />
        </div>
      </div>

      <MobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} title="Seller Center">
        <div className="p-3">
          <SellerSidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      </MobileDrawer>
    </div>
  );
}
