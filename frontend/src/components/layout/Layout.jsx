import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

/** Shared shell rendered around every page via React Router's <Outlet />.
 *  Smoothly scrolls to top whenever the route changes.
 *  ShopHaat dark marketplace canvas — bg-canvas (#080F1C). */
export function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-canvas text-text-primary">
      <Navbar />
      <main className="flex-1 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
