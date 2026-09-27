import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaBox,
  FaHeart,
  FaMapMarkerAlt,
  FaCog,
  FaSignOutAlt,
  FaBars,
} from "react-icons/fa";
import { useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { useWishlist } from "../../hooks/useWishlist";
import { MobileDrawer } from "../common/MobileDrawer";

const NAV = [
  { to: "/dashboard/profile", label: "Profile", icon: FaUser },
  { to: "/dashboard/orders", label: "My Orders", icon: FaBox },
  { to: "/dashboard/wishlist", label: "Wishlist", icon: FaHeart },
  { to: "/dashboard/addresses", label: "Addresses", icon: FaMapMarkerAlt },
];

/**
 * Sidebar shell for all customer dashboard pages. The <Outlet/> renders
 * the active child route. Sidebar collapses to a hamburger drawer on mobile.
 *
 * Dark-theme variant: canvas-elevated sidebar with saffron active state.
 */
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {user?.full_name?.[0]?.toUpperCase() || <FaUser />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {user?.full_name || "Account"}
                  </p>
                  <p className="truncate text-xs text-text-secondary">{user?.email}</p>
                </div>
              </div>
            </div>
            <nav className="space-y-1 rounded-xl border border-border-subtle bg-surface-card p-2 shadow-card">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-brand/15 font-semibold text-brand"
                        : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.to === "/dashboard/wishlist" && wishlistItems.length > 0 && (
                    <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                      {wishlistItems.length}
                    </span>
                  )}
                </NavLink>
              ))}
              {(user?.role === "staff" || user?.role === "admin") && (
                <NavLink
                  to="/admin"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand hover:bg-brand/15"
                >
                  <FaCog className="h-4 w-4" />
                  Admin Console
                </NavLink>
              )}
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-state-danger hover:bg-state-danger/10"
              >
                <FaSignOutAlt className="h-4 w-4" />
                Log out
              </button>
            </nav>
          </div>
        </aside>

        {/* Mobile topbar */}
        <div className="flex items-center justify-between lg:hidden">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Hi, {user?.full_name?.split(" ")[0] || "there"}
            </h1>
            <p className="text-xs text-text-secondary">Manage your account</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="rounded p-2 text-text-secondary hover:bg-canvas-elevated"
            aria-label="Open dashboard menu"
          >
            <FaBars />
          </button>
        </div>

        {/* Mobile content offset */}
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
        title="My Account"
      >
        <div className="p-2">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-canvas-elevated p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {user?.full_name?.[0]?.toUpperCase() || <FaUser />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {user?.full_name}
              </p>
              <p className="truncate text-xs text-text-secondary">{user?.email}</p>
            </div>
          </div>
          <nav className="flex flex-col">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    isActive
                      ? "bg-brand/15 font-semibold text-brand"
                      : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen(false);
                logout();
              }}
              className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-state-danger hover:bg-state-danger/10"
            >
              <FaSignOutAlt className="h-4 w-4" />
              Log out
            </button>
          </nav>
        </div>
      </MobileDrawer>
    </div>
  );
}
