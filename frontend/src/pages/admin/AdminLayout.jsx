import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaBars } from "react-icons/fa";

import { AdminSidebar } from "../../components/admin/AdminSidebar";
import { MobileDrawer } from "../../components/common/MobileDrawer";
import { useAuth } from "../../hooks/useAuth";

/**
 * Shell for /admin/*. Desktop renders a sidebar + main content. Mobile
 * renders a top bar with a hamburger that opens the same sidebar in a
 * slide-from-right drawer.
 */
export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer whenever the route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Mobile topbar */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border-subtle bg-surface-card px-4 py-3 shadow-card lg:hidden">
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            Admin Console
          </h1>
          <p className="text-xs text-text-secondary">
            Signed in as {user?.full_name} ({user?.role})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="rounded p-2 text-text-secondary hover:bg-canvas-elevated"
          aria-label="Open admin menu"
        >
          <FaBars />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border-subtle bg-surface-card p-3 shadow-card">
            <AdminSidebar />
          </div>
        </aside>

        {/* Mobile content */}
        <div className="lg:hidden">
          <Outlet />
        </div>

        {/* Desktop content */}
        <div className="hidden lg:block">
          <Outlet />
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title="Admin Console"
      >
        <div className="p-3">
          <AdminSidebar onNavigate={() => setIsMobileOpen(false)} />
        </div>
      </MobileDrawer>
    </div>
  );
}
