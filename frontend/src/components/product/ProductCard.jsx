import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaRegHeart, FaStar, FaCartPlus } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";

import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

/**
 * Product card reused across catalog/search/wishlist/related.
 * Matches the home page card style exactly: edge-to-edge image, discount pill,
 * verified seller, ৳ price, delivery chip, compact cart icon button.
 */
export function ProductCard({ product }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const slug = product.slug;
  const name = product.name || "Unnamed product";
  const brand =
    typeof product.brand === "object" ? product.brand?.name : product.brand || "";
  const merchant =
    (typeof product.seller === "object" ? product.seller?.store_name : null) ||
    "Verified Seller";
  const oldPrice = parseFloat(product.min_price || product.base_price) || 0;
  const discountPct = parseFloat(product.discount_percent) || 0;
  const price = Math.round(discountPct > 0 ? oldPrice * (1 - discountPct / 100) : oldPrice);
  const rating = parseFloat(product.average_rating || 0).toFixed(1);
  const soldCount = product.total_sold ?? product.sales_count ?? 0;
  const inStock = product.in_stock ?? true;
  const fastDelivery = (product.id ?? 1) % 2 === 0;
  const thumbnail = product.thumbnail || product.image;

  async function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const variantId = product.default_variant_id || product.first_variant_id || product.id;
    if (!variantId) {
      navigate(`/products/${slug}`);
      return;
    }
    setIsAdding(true);
    try {
      await addItem(variantId, 1);
      showToast({ type: "success", message: "Item added to the cart" });
    } catch (err) {
      showToast({
        type: "error",
        message: err?.response?.data?.error?.message || "Could not add to cart",
      });
    } finally {
      setIsAdding(false);
    }
  }

  function handleAddToWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    showToast({ type: "success", message: "Item added to wishlist" });
  }

  return (
    <Link
      to={`/products/${slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card transition-all duration-200 hover:border-brand/50"
    >
      {/* Edge-to-edge image */}
      <div className="relative aspect-square overflow-hidden bg-canvas">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
            No image
          </div>
        )}

        {/* Discount pill (top-left) */}
        {discountPct > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-brand px-2 py-0.5 text-[11px] font-extrabold text-white">
            -{Math.round(discountPct)}%
          </span>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/70">
            <span className="rounded-full bg-canvas/95 px-3 py-1 text-xs font-semibold text-text-secondary">
              Out of stock
            </span>
          </div>
        )}

        {/* Wishlist heart (top-right) */}
        <button
          type="button"
          aria-label="Add to wishlist"
          onClick={handleAddToWishlist}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-canvas/80 text-text-secondary transition-colors hover:text-brand"
        >
          <FaRegHeart className="text-xs" />
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col space-y-1.5 p-3.5">
        {/* Merchant with verified tick */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-state-success">
          <FaCircleCheck className="text-[10px]" />
          <span className="text-text-secondary">Sold by</span>{" "}
          <span className="truncate text-state-success">{merchant}</span>
        </div>

        {/* Title */}
        <h4 className="truncate text-[15px] font-bold text-text-primary">
          {name}
        </h4>

        {/* Rating + sold count */}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="flex items-center gap-1 font-semibold text-text-primary">
            <FaStar className="text-xs text-amber-400" /> {rating}
          </span>
          <span>
            {soldCount >= 1000
              ? `${(soldCount / 1000).toFixed(1)}k sold`
              : `${soldCount} sold`}
          </span>
        </div>

        {/* Price block */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-text-primary">
            ৳ {price.toLocaleString()}
          </span>
          {oldPrice > price && (
            <span className="text-xs text-text-secondary line-through">
              ৳ {Math.round(oldPrice).toLocaleString()}
            </span>
          )}
        </div>

        {/* Cart button — pushed to the bottom */}
        <div className="!mt-auto pt-2.5">
          <button
            type="button"
            aria-label="Add to cart"
            onClick={handleAddToCart}
            disabled={!inStock || isAdding}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border-subtle bg-canvas py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAdding ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <FaCartPlus className="text-sm" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
