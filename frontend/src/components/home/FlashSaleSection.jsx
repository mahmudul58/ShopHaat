import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBolt, FaArrowRight, FaRegHeart, FaStar } from "react-icons/fa";
import { FaCartShopping } from "react-icons/fa6";

import { ProductGrid } from "../product/ProductGrid";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";

/**
 * Flash-sale section matching the ShopHaat reference.
 * Header: ⚡ Flash Sale + Ending Soon badge + countdown timer + "See all"
 * Body: 5-col product grid (lg), 3-col (md), 2-col (sm), 1-col (mobile).
 */
const FLASH_END = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(23, 59, 59, 0);
  return d;
})();

function useCountdown(target) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  return { hours, mins, secs };
}

const Pad = (n) => String(n).padStart(2, "0");

export function FlashSaleSection({ products, isLoading }) {
  const { hours, mins, secs } = useCountdown(FLASH_END);

  return (
    <section
      id="sale"
      className="relative border-b border-border-subtle py-16"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header row */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-border-subtle pb-6 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-text-primary sm:text-3xl">
              <span className="text-brand">⚡</span> Flash Sale
            </h2>
            <div className="rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
              Ending Soon
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
              <CountBox value={Pad(hours)} />
              <span className="font-bold text-brand">:</span>
              <CountBox value={Pad(mins)} />
              <span className="font-bold text-brand">:</span>
              <CountBox value={Pad(secs)} highlight />
            </div>
          </div>
          <Link
            to="/catalog?ordering=-base_price"
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-canvas-elevated px-4 py-2 text-sm font-semibold text-text-primary transition-all hover:border-brand"
          >
            See all deals
            <FaArrowRight className="h-3 w-3 text-brand" />
          </Link>
        </div>

        {/* 5-col flash deals grid (matches reference) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <FlashDealSkeleton key={i} />
              ))
            : products.slice(0, 5).map((p) => (
                <FlashDealCard key={p.id} product={p} />
              ))}
        </div>
      </div>
    </section>
  );
}

function CountBox({ value, highlight = false }) {
  return (
    <span
      className={`rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-sm ${
        highlight ? "text-brand" : "text-text-primary"
      }`}
    >
      {value}
    </span>
  );
}

function FlashDealCard({ product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const oldPrice = parseFloat(product.min_price || product.base_price) || 0;
  const discountPct = parseFloat(product.discount_percent) || 0;
  const price = Math.round(discountPct > 0 ? oldPrice * (1 - discountPct / 100) : oldPrice);
  const rating = parseFloat(product.average_rating || 0).toFixed(1);
  const reviews = product.review_count || 0;
  const sold = product.total_sold ?? product.sales_count ?? 0;
  const soldPct = Math.min(100, Math.round((sold / (sold + 15)) * 100)) || 0;
  const left = Math.max(1, 15 - sold);
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
    <Link to={`/products/${product.slug}`} className="group flex h-full flex-col justify-between rounded-2xl border border-border-subtle bg-surface-card p-3.5 transition-all duration-200 hover:border-brand/60">
      <div>
        <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-canvas">
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
          <span className="absolute left-2.5 top-2.5 rounded-md bg-brand px-2 py-0.5 text-[11px] font-extrabold text-white shadow">
            -{discountPct}%
          </span>
          <button
            type="button"
            onClick={handleAddToWishlist}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-canvas/80 text-text-secondary transition-colors hover:text-brand"
          >
            <FaRegHeart className="text-xs" />
          </button>
        </div>

        <div className="text-[11px] font-medium text-text-secondary">{merchant}</div>
        <h3 className="mt-1 truncate text-[15px] font-bold text-text-primary">
          {product.name || "Product"}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <FaStar className="text-xs text-amber-400" />
          <span className="text-xs font-semibold text-text-primary">
            {rating}
          </span>
          <span className="text-[11px] text-text-secondary">
            ({reviews} reviews)
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-brand">
            ৳ {price.toLocaleString()}
          </span>
          <span className="text-xs text-text-secondary line-through">
            ৳ {oldPrice.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-3.5 border-t border-border-subtle pt-3">
        <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className="h-1.5 rounded-full bg-brand"
            style={{ width: `${soldPct}%` }}
          />
        </div>
        <div className="mb-3 flex justify-between text-[11px] text-text-secondary">
          <span>{soldPct}% Sold</span>
          <span className="font-semibold text-brand">{left} left</span>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-canvas-elevated py-2 text-xs font-bold text-text-primary transition-all hover:border-transparent hover:bg-brand hover:text-white"
        >
          <FaCartShopping className="text-xs" />
          Add to Cart
        </button>
      </div>
    </Link>
  );
}

function FlashDealSkeleton() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-3.5">
      <div className="mb-3 aspect-square animate-pulse rounded-xl bg-canvas-elevated" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-canvas-elevated" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-canvas-elevated" />
      <div className="mt-3 h-6 w-full animate-pulse rounded bg-canvas-elevated" />
    </div>
  );
}
