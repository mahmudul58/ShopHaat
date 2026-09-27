import { Link } from "react-router-dom";
import { FaTruck, FaUndo, FaStar } from "react-icons/fa";

import { Money } from "../common/Money";
import { PriceDisplay } from "../common/PriceDisplay";
import { DiscountBadge } from "../common/DiscountBadge";
import { Button } from "../common/Button";
import { QuantitySelector } from "../common/QuantitySelector";
import { WishlistButton } from "../common/WishlistButton";
import { RatingStars } from "./RatingStars";
import { VariantSelector } from "./VariantSelector";

/**
 * Right column of the product detail page.
 * Title, brand, rating, price, variants, quantity, prominent CTAs.
 *
 * Dark-theme variant: surface-card panel with rounded-2xl, saffron accents.
 */
export function ProductInfo({
  product,
  selectedVariant,
  onSelectVariant,
  quantity,
  onQuantityChange,
  isAdding,
  onAddToCart,
  onBuyNow,
}) {
  const oldPrice = parseFloat(selectedVariant?.price_override ?? product.base_price) || 0;
  const discountPct = parseFloat(product.discount_percent) || 0;
  const price = Math.round(discountPct > 0 ? oldPrice * (1 - discountPct / 100) : oldPrice);
  const stock = selectedVariant?.stock ?? 0;
  const inStock = stock > 0;
  const rating = parseFloat(product.average_rating || 0);
  const reviewCount = product.review_count || 0;

  const hasSelectableVariants = product.variants?.some(v => v.size || v.color);

  return (
    <div className="flex flex-col">
      {/* Rating */}
      <div className="flex items-center gap-2">
        <RatingStars rating={rating} size={16} />
        <span className="text-sm font-medium text-text-secondary">
          {rating.toFixed(1)}/5 ({reviewCount} reviews)
        </span>
      </div>

      {/* Title */}
      <h1 className="mt-4 font-serif text-3xl font-bold text-text-primary sm:text-4xl">
        {product.name}
      </h1>

      {/* Price */}
      <div className="mt-4">
        <PriceDisplay price={price} oldPrice={oldPrice} size="xl" />
      </div>

      {/* Short Description */}
      {(product.short_description || product.description) && (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          {product.short_description || `${product.description?.substring(0, 120)}...`}
        </p>
      )}

      {/* Actions Row (Wishlist, Stock) */}
      <div className="mt-6 flex flex-wrap items-center gap-6 border-b border-border-subtle pb-6 text-sm font-medium text-text-secondary">
        <div className="flex items-center gap-2">
          <WishlistButton productId={product.id} productName={product.name} />
          <span>Add to Favourite</span>
        </div>

        <div className="flex items-center gap-2">
          {inStock ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
              <span className="text-text-primary">{stock} In Stock</span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span className="text-text-primary">Out of Stock</span>
            </>
          )}
        </div>
      </div>

      {/* Variants Card */}
      {hasSelectableVariants && (
        <div className="mt-6 rounded-2xl bg-canvas-elevated p-6">
          <VariantSelector
            variants={product.variants}
            selectedVariant={selectedVariant}
            onSelect={onSelectVariant}
          />
        </div>
      )}

      {/* Add to Cart Area */}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <QuantitySelector
          value={quantity}
          onChange={onQuantityChange}
          max={Math.min(99, stock)}
          disabled={!inStock}
        />
        <Button
          onClick={onAddToCart}
          isLoading={isAdding}
          disabled={!inStock}
          className="flex-1 rounded-full bg-black text-white hover:bg-gray-900 sm:flex-none sm:min-w-[200px]"
        >
          Add to Cart
        </Button>
        <Button
          variant="secondary"
          onClick={onBuyNow}
          disabled={!inStock}
          className="rounded-full sm:min-w-[140px]"
        >
          Buy Now
        </Button>
      </div>

      {/* Delivery Info */}
      <div className="mt-10 flex flex-col gap-3 text-sm text-text-secondary">
        <div className="flex items-center gap-3">
          <FaTruck className="h-5 w-5 text-text-primary" />
          <span>Estimated Delivery: <span className="font-semibold text-green-500">Within 2-4 Days</span></span>
        </div>
        <div className="flex items-center gap-3">
          <FaUndo className="h-5 w-5 text-text-primary" />
          <span>Returns: <span className="font-semibold text-text-primary">7 Days Easy Return</span></span>
        </div>
      </div>
    </div>
  );
}
