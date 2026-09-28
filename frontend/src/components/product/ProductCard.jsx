import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaRegHeart, FaStar, FaCartPlus } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";

import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Money } from "../common/Money";

/**
 * Product card reused across catalog/search/wishlist/related.
 * This is the exact style used in the "Only For You" section.
 */
export function ProductCard({ product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);

  const oldPrice = parseFloat(product.min_price || product.base_price) || 0;
  const discountPct = parseFloat(product.discount_percent) || 0;
  const price = Math.round(discountPct > 0 ? oldPrice * (1 - discountPct / 100) : oldPrice);
  const rating = parseFloat(product.average_rating || 0).toFixed(1);
  const sold = product.total_sold ?? product.sales_count ?? 0;
  const inStock = product.in_stock ?? true;
  const merchant =
    (typeof product.seller === "object" ? product.seller?.store_name : null) ||
    "Verified Seller";
  const thumbnail = product.thumbnail || product.image;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const variantId = product.default_variant_id || product.first_variant_id || product.id;
    if (!variantId) {
      navigate(`/products/${product.slug}`);
      return;
    }
    setIsAdding(true);
    try {
      await addItem(variantId, 1);
      showToast({ type: "success", message: "Item added to the cart" });
    } catch (err) {
      showToast({ 
        type: "error", 
        message: err?.response?.data?.error?.message || "Could not add to cart" 
      });
    } finally {
      setIsAdding(false);
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
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            No image
          </div>
        )}
        
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

        <button 
          onClick={handleAddToWishlist}
          aria-label="Add to wishlist"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-canvas/80 text-text-secondary transition-colors hover:text-brand"
        >
          <FaRegHeart className="text-xs" />
        </button>
      </div>

      <div className="p-2.5 sm:p-3.5 flex flex-col flex-1">
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
          {oldPrice > price && (
            <Money
              amount={oldPrice}
              className="text-[9px] sm:text-xs text-text-secondary line-through"
            />
          )}
        </div>
        <div className="mt-auto pt-2.5">
          <button 
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || isAdding}
            aria-label="Add to cart"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border-subtle bg-canvas py-1.5 text-[12px] sm:text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
