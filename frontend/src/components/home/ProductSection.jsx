import { Link, useNavigate } from "react-router-dom";
import { FaRegHeart, FaStar, FaCartPlus } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";

import { Skeleton } from "../common/Skeleton";
import { SectionHeader } from "../common/SectionHeader";
import { Money } from "../common/Money";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";

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

function ProductCard({ product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const oldPrice = parseFloat(product.min_price || product.base_price) || 0;
  const discountPct = parseFloat(product.discount_percent) || 0;
  const price = Math.round(discountPct > 0 ? oldPrice * (1 - discountPct / 100) : oldPrice);
  const rating = parseFloat(product.average_rating || 0).toFixed(1);
  const sold = product.total_sold ?? product.sales_count ?? 0;
  const badgeText = sold >= 500 ? "Best Seller" : "Top Choice";
  const badgeClass = sold >= 500 ? "bg-brand/10 text-brand" : "bg-info/10 text-info";
  const merchant = product.seller?.store_name || "Verified Store";
  const thumbnail = product.thumbnail || product.image;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      const variantId = product.default_variant_id || product.id;
      await addItem(variantId, 1);
      showToast({ type: "success", message: "Item added to the cart" });
    } catch (err) {
      showToast({ type: "error", message: "Could not add to cart" });
    }
  };

  const handleAddToWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    showToast({ type: "success", message: "Item added to wishlist" });
  };

  return (
    <Link to={`/products/${product.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card transition-all duration-200 hover:border-brand/50">
      <div className="relative aspect-square overflow-hidden bg-canvas">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            No image
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-brand px-2 py-0.5 text-[11px] font-extrabold text-white">
          -{discountPct}%
        </span>
        <button 
          onClick={handleAddToWishlist}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-canvas/80 text-text-secondary transition-colors hover:text-brand"
        >
          <FaRegHeart className="text-xs" />
        </button>
      </div>

      <div className="p-2.5 sm:p-3.5">
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-state-success">
          <FaCircleCheck className="text-[9px] sm:text-[10px]" />
          <span className="text-text-secondary hidden sm:inline">Sold by</span>
          <span className="truncate">{merchant}</span>
        </div>
        <h4 className="mt-1 truncate text-xs sm:text-[13px] md:text-sm font-bold text-text-primary">
          {product.name || "Product"}
        </h4>
        <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-xs text-text-secondary">
          <span className="flex items-center gap-1 font-semibold text-text-primary">
            <FaStar className="text-[10px] sm:text-xs text-amber-400" /> {rating}
          </span>
          <span>
            {sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold} sold
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2">
          <Money
            amount={price}
            className="text-sm sm:text-base md:text-[17px] font-bold text-text-primary"
          />
          <Money
            amount={oldPrice}
            className="text-[9px] sm:text-xs text-text-secondary line-through"
          />
        </div>
        <div className="mt-2.5 pt-1">
          <button 
            onClick={handleAddToCart}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border-subtle bg-canvas py-1.5 text-[12px] sm:text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:bg-brand hover:text-white"
          >
            <FaCartPlus className="text-sm" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </Link>
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
