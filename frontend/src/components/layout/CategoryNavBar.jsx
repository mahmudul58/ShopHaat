import { Link, useLocation } from "react-router-dom";
import { FaBolt, FaFire, FaStar, FaTags } from "react-icons/fa";

/**
 * Second-level navigation strip. Hidden on small screens.
 *   Categories | Flash Sale | New Arrivals | Best Sellers | Deals
 * Dark-theme variant: dark elevated strip with saffron active link.
 */
const LINKS = [
  { to: "/catalog", label: "Categories", icon: FaTags },
  { to: "/catalog?sort=-created_at", label: "New Arrivals", icon: FaStar },
  { to: "/catalog?ordering=-average_rating", label: "Best Sellers", icon: FaFire },
  { to: "/catalog?ordering=-base_price", label: "Flash Sale", icon: FaBolt },
  { to: "/catalog?in_stock=true", label: "All Products", icon: FaTags },
];

export function CategoryNavBar({ onOpenMegaMenu }) {
  const location = useLocation();

  return (
    <div className="hidden border-t border-border-subtle bg-canvas-elevated md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
        <button
          type="button"
          onClick={onOpenMegaMenu}
          onMouseEnter={onOpenMegaMenu}
          className="flex items-center gap-2 border-r border-border-subtle px-4 py-2.5 text-sm font-semibold text-text-primary hover:text-brand"
        >
          <FaTags /> All Categories
        </button>
        <nav className="flex flex-1 items-center overflow-x-auto">
          {LINKS.map((link) => {
            const Icon = link.icon;
            const [path, query] = link.to.split("?");
            const isActive =
              location.pathname === path &&
              (!query || location.search.includes(query.split("=")[0]));
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "font-medium text-brand"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
