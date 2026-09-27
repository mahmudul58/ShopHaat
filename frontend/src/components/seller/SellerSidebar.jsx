import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaBox,
  FaPlus,
  FaClipboardList,
  FaChartLine,
  FaDollarSign,
  FaStar,
  FaStore,
  FaCog,
  FaBell,
  FaSignOutAlt,
} from "react-icons/fa";

import { useAuth } from "../../hooks/useAuth";

const LINK_CLASSES = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
    isActive ? "bg-brand/15 font-semibold text-brand" : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
  }`;

/**
 * Seller Center sidebar — dark ShopHaat variant.
 */
export function SellerSidebar({ onNavigate }) {
  const { user, logout } = useAuth();

  const links = [
    { to: "/seller", label: "Dashboard", icon: FaHome, end: true },
    { to: "/seller/products", label: "Products", icon: FaBox },
    { to: "/seller/products/new", label: "Add Product", icon: FaPlus },
    { to: "/seller/orders", label: "Orders", icon: FaClipboardList },
    { to: "/seller/earnings", label: "Earnings", icon: FaDollarSign },
    { to: "/seller/store", label: "Store Profile", icon: FaStore },
    { to: "/seller/notifications", label: "Notifications", icon: FaBell },
  ];

  return (
    <nav className="space-y-1">
      <div className="mb-2 px-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Seller Center</p>
        <p className="mt-1 truncate text-xs text-text-secondary">{user?.email}</p>
      </div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
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
        <FaHome className="h-4 w-4" /> Back to storefront
      </NavLink>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          logout();
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-state-danger hover:bg-state-danger/10"
      >
        <FaSignOutAlt className="h-4 w-4" /> Log out
      </button>
    </nav>
  );
}
