import { Link, useNavigate } from "react-router-dom";
import { FaRegHeart, FaStar, FaCartPlus } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";

import { Skeleton } from "../common/Skeleton";
import { SectionHeader } from "../common/SectionHeader";
import { Money } from "../common/Money";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { ProductCard } from "../product/ProductCard";

/**
 * "Only For You" / "Featured" / "Trending" product grid.
 * Matches the ShopHaat reference exactly: 5-col grid on desktop with
 * merchant-verified pill, free/fast delivery chip, cart icon button.
 */
const FILTERS = [
  { id: "trending", label: "Trending Now" },
  { id: "best", label: "Best Rated" },
  { id: "new", label: "Newly Added" },
  { id: "under", label: "Under ৳1,500" },
];

export function ProductSection({
  title,
  subtitle,
  products,
  isLoading,
  viewAllTo,
  className = "",
  showFilters = false,
}) {
  return (
    <section className={`bg-canvas py-16 ${className}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            {title && (
              <div className="flex items-center gap-2">
                <span className="text-xl text-brand">✨</span>
                <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
                  {title}
                </h2>
              </div>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
            )}
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f, i) => (
                <button
                  key={f.id}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    i === 0
                      ? "bg-brand text-white"
                      : "border border-border-subtle bg-surface-card text-text-secondary hover:bg-canvas-hover hover:text-text-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 6-col product grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <GridCardSkeleton key={i} />)
            : products.slice(0, 15).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
        </div>

        {/* Load more */}
        {!isLoading && products.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              to="/catalog"
              className="group inline-flex items-center justify-center gap-2.5 rounded-full border border-border-subtle bg-canvas-elevated px-9 py-3 text-sm font-bold text-text-primary shadow-card transition-all hover:border-brand"
            >
              Load more
              <FaRegHeart className="hidden text-xs text-brand transition-transform group-hover:translate-y-0.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}



function GridCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}
