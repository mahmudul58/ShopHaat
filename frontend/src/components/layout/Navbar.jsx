import { useEffect, useState } from "react";
import {
  FaBars,
  FaShoppingCart,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaHeart,
  FaBox,
  FaMapMarkerAlt,
  FaHome,
  FaChevronDown,
  FaStore,
} from "react-icons/fa";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { useWishlist } from "../../hooks/useWishlist";
import { fetchCategories } from "../../services/catalogService";
import { NotificationBell } from "../common/NotificationBell";
import { MegaMenu } from "./MegaMenu";
import { MiniCart } from "./MiniCart";
import { MobileDrawer } from "../common/MobileDrawer";
import { SearchBar } from "./SearchBar";

/**
 * ShopHaat marketplace navbar.
 *
 * Sticky dark navy header with glassmorphism backdrop-blur, white wordmark
 * with saffron "Haat" accent. Layout: Logo · Categories · Search · Account
 * · Cart. Matches the ShopHaat reference design.
 */
export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Close user-menu on outside click.
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const close = () => setIsUserMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [isUserMenuOpen]);

  return (
    <header 
      className="sticky top-0 z-30 w-full bg-canvas-elevated/85 backdrop-blur-md border-b border-border-subtle shadow-card"
      onMouseLeave={() => setIsMegaOpen(false)}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-4 md:py-3.5">
        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-canvas hover:text-brand md:hidden"
        >
          <FaBars className="h-5 w-5" />
        </button>

        {/* Logo */}
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2"
          aria-label="ShopHaat home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 border border-brand/30 text-brand transition-transform group-hover:scale-105">
            <FaStore className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline font-sans text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
            Shop<span className="text-brand">Haat</span>
          </span>
        </Link>

        {/* Categories trigger (desktop) */}
        <button
          type="button"
          onClick={() => setIsMegaOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={isMegaOpen}
          className="hidden items-center gap-1.5 rounded-lg border border-border-subtle bg-canvas px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:border-brand/50 md:inline-flex"
        >
          <FaBars className="h-3.5 w-3.5 text-brand" />
          Categories
          <FaChevronDown className="h-3 w-3 text-text-secondary" />
        </button>

        {/* Search */}
        <div className="flex-1 min-w-0 px-2 sm:px-4">
          <SearchBar variant="dark" />
        </div>

        {/* Right icons */}
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          {/* Wishlist (desktop only) */}
          {isAuthenticated && (
            <Link
              to="/dashboard/wishlist"
              aria-label="Wishlist"
              className="hidden rounded-lg p-2 text-text-secondary transition-colors hover:bg-canvas hover:text-brand sm:inline-flex"
            >
              <div className="relative">
                <FaHeart className="h-5 w-5" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
                    {wishlistItems.length}
                  </span>
                )}
              </div>
            </Link>
          )}

          {/* Notifications (all authenticated users) */}
          {isAuthenticated && (
            <NotificationBell
              destination={
                user?.role === "seller"
                  ? "/seller/notifications"
                  : user?.role === "admin" || user?.role === "staff"
                  ? "/admin"
                  : "/dashboard/orders"
              }
            />
          )}

          {/* Cart */}
          <div
            className="relative"
            onMouseLeave={() => setIsCartOpen(false)}
          >
            <button
              type="button"
              onMouseEnter={() => setIsCartOpen(true)}
              onClick={() => {
                if (!isAuthenticated) {
                  navigate("/login?next=/cart");
                } else {
                  navigate("/cart");
                }
              }}
              aria-label="Cart"
              className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-canvas hover:text-brand"
            >
              <FaShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
                  {itemCount}
                </span>
              )}
            </button>
            <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          </div>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserMenuOpen((v) => !v);
                }}
                aria-label="Account menu"
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-text-primary transition-colors hover:bg-canvas"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {user?.full_name?.[0]?.toUpperCase() || <FaUser />}
                </div>
                <FaChevronDown className="hidden h-3 w-3 text-text-secondary md:inline" />
              </button>
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 animate-fade-up overflow-hidden rounded-xl border border-border-subtle bg-canvas-elevated backdrop-blur-md py-2 shadow-float"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-b border-border-subtle bg-canvas px-4 py-3">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {user?.full_name}
                    </p>
                    <p className="truncate text-xs text-text-secondary">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    {(user?.role === "staff" || user?.role === "admin") && (
                      <MenuLink
                        to="/admin"
                        icon={FaCog}
                        onClick={() => setIsUserMenuOpen(false)}
                        accent
                      >
                        Admin Console
                      </MenuLink>
                    )}
                    {user?.role === "seller" && (
                      <MenuLink
                        to="/seller"
                        icon={FaStore}
                        onClick={() => setIsUserMenuOpen(false)}
                        accent
                      >
                        Seller Center
                      </MenuLink>
                    )}

                    <MenuLink to="/dashboard/orders" icon={FaBox} onClick={() => setIsUserMenuOpen(false)}>
                      My Orders
                    </MenuLink>
                    <MenuLink to="/dashboard/wishlist" icon={FaHeart} onClick={() => setIsUserMenuOpen(false)}>
                      Wishlist
                    </MenuLink>
                    <MenuLink to="/dashboard/addresses" icon={FaMapMarkerAlt} onClick={() => setIsUserMenuOpen(false)}>
                      Addresses
                    </MenuLink>
                    <MenuLink to="/dashboard/profile" icon={FaCog} onClick={() => setIsUserMenuOpen(false)}>
                      Profile
                    </MenuLink>
                  </div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-left text-sm font-medium text-state-danger transition-colors hover:bg-canvas"
                  >
                    <FaSignOutAlt /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-brand"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-px hover:bg-brand-hover"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>


      {/* Mega menu (desktop only) */}
      <MegaMenu
        categories={categories}
        isOpen={isMegaOpen}
        onClose={() => setIsMegaOpen(false)}
      />

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title="Menu"
      >
        <div className="p-2">
          {isAuthenticated && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-canvas p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {user?.full_name?.[0]?.toUpperCase() || <FaUser />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {user?.full_name}
                </p>
                <p className="truncate text-xs text-text-secondary">{user?.email}</p>
              </div>
            </div>
          )}

          <nav className="flex flex-col">
            <DrawerLink to="/" icon={FaHome} onClick={() => setIsMobileOpen(false)}>
              Home
            </DrawerLink>
            <DrawerLink to="/catalog" icon={FaBars} onClick={() => setIsMobileOpen(false)}>
              All Categories
            </DrawerLink>
            <DrawerLink
              to="/catalog?ordering=-created_at"
              icon={FaBox}
              onClick={() => setIsMobileOpen(false)}
            >
              New Arrivals
            </DrawerLink>
            <DrawerLink
              to="/catalog?ordering=-average_rating"
              icon={FaHeart}
              onClick={() => setIsMobileOpen(false)}
            >
              Best Sellers
            </DrawerLink>

            <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              My Account
            </p>
            {isAuthenticated ? (
              <>
                <DrawerLink
                  to="/dashboard/orders"
                  icon={FaBox}
                  onClick={() => setIsMobileOpen(false)}
                >
                  My Orders
                </DrawerLink>
                <DrawerLink
                  to="/dashboard/wishlist"
                  icon={FaHeart}
                  onClick={() => setIsMobileOpen(false)}
                >
                  Wishlist
                </DrawerLink>
                <DrawerLink
                  to="/dashboard/addresses"
                  icon={FaMapMarkerAlt}
                  onClick={() => setIsMobileOpen(false)}
                >
                  Addresses
                </DrawerLink>
                <DrawerLink
                  to="/dashboard/profile"
                  icon={FaCog}
                  onClick={() => setIsMobileOpen(false)}
                >
                  Profile
                </DrawerLink>
                {(user?.role === "staff" || user?.role === "admin") && (
                  <DrawerLink
                    to="/admin"
                    icon={FaCog}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Admin Console
                  </DrawerLink>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    logout();
                  }}
                  className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-state-danger hover:bg-canvas"
                >
                  <FaSignOutAlt /> Log out
                </button>
              </>
            ) : (
              <>
                <DrawerLink to="/login" icon={FaUser} onClick={() => setIsMobileOpen(false)}>
                  Log in
                </DrawerLink>
                <DrawerLink
                  to="/register"
                  icon={FaUser}
                  onClick={() => setIsMobileOpen(false)}
                >
                  Create account
                </DrawerLink>
              </>
            )}
          </nav>

          {/* In-drawer category list */}
          {categories.length > 0 && (
            <div className="mt-4 border-t border-border-subtle pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Browse Categories
              </p>
              <nav className="flex flex-col">
                {categories.map((cat) => (
                  <NavLink
                    key={cat.id}
                    to={`/catalog?category=${cat.slug}`}
                    onClick={() => setIsMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-canvas hover:text-text-primary"
                  >
                    {cat.name}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>
      </MobileDrawer>
    </header>
  );
}

function MenuLink({ to, icon: Icon, onClick, accent, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
        accent
          ? "font-semibold text-brand hover:bg-canvas"
          : "text-text-secondary hover:bg-canvas hover:text-text-primary"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function DrawerLink({ to, icon: Icon, onClick, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "bg-brand/15 font-semibold text-brand"
            : "text-text-secondary hover:bg-canvas hover:text-text-primary"
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </NavLink>
  );
}
