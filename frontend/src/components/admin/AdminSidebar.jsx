import { NavLink } from "react-router-dom";
import {
  FaChartLine,
  FaBox,
  FaCog,
  FaPercent,
  FaSitemap,
  FaShoppingCart,
  FaTag,
  FaStore,
  FaSignOutAlt,
  FaUsers,
  FaClipboardList,
  FaMoneyBillWave,
  FaBolt,
  FaHome,
} from "react-icons/fa";

import { useAuth } from "../../hooks/useAuth";

const LINK_CLASSES = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
    isActive
      ? "bg-brand/15 font-semibold text-brand"
      : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
  }`;

/**
 * Admin sidebar with mobile drawer support. Rendered inside <AdminLayout>
 * which provides the open/close state via context-free prop drilling.
 *
 * Marketplace-specific links (sellers, seller-orders, settlements,
 * commissions) are gated to admin-only because they wield the
 * marketplace-level permissions on the backend.
 */
export function AdminSidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const links = [
    ...(isAdmin ? [{ to: "/admin/analytics", label: "Dashboard", icon: FaHome }] : []),
    { to: "/admin/orders", label: "Orders", icon: FaShoppingCart },
    { to: "/admin/products", label: "Products", icon: FaBox },
    ...(isAdmin
      ? [
          { to: "/admin/sellers", label: "Sellers", icon: FaUsers },
          { to: "/admin/seller-orders", label: "Marketplace Orders", icon: FaClipboardList },
          { to: "/admin/settlements", label: "Settlements", icon: FaMoneyBillWave },
          { to: "/admin/commissions", label: "Commissions", icon: FaPercent },
          { to: "/admin/catalog", label: "Catalog", icon: FaSitemap },
          { to: "/admin/flash-sales", label: "Flash Sales", icon: FaBolt },
          { to: "/admin/coupons", label: "Coupons", icon: FaTag },
          { to: "/admin/top-products", label: "Top Products", icon: FaChartLine },
          { to: "/admin/settings", label: "Settings", icon: FaCog },
        ]
      : []),
  ];

  return (
    <nav className="space-y-1">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Console
      </p>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={onNavigate}
          className={LINK_CLASSES}
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </NavLink>
      ))}

      <div className="my-3 border-t border-border-subtle" />

      <NavLink
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
      >
        <FaStore className="h-4 w-4" />
        Back to storefront
      </NavLink>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          logout();
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-state-danger hover:bg-state-danger/15"
      >
        <FaSignOutAlt className="h-4 w-4" />
        Log out
      </button>
    </nav>
  );
}
