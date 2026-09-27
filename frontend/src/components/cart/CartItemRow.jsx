import { useState } from "react";
import { FaTrash } from "react-icons/fa";

import { Money } from "../common/Money";
import { QuantitySelector } from "../common/QuantitySelector";
import { Checkbox } from "../common/Input";

/**
 * A single cart line. Used by CartPage.
 *
 * Dark-theme variant: surface-elevated image thumb, dark hover states.
 */
export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isSelected,
  onToggleSelection,
  onMoveToWishlist,
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function changeQuantity(newQuantity) {
    if (newQuantity < 1) return;
    setIsUpdating(true);
    try {
      await onUpdateQuantity(item.id, newQuantity);
    } finally {
      setIsUpdating(false);
    }
  }

  const product = item.variant?.product || {};
  const variantLabel = [item.variant?.color, item.variant?.size]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <Checkbox
        checked={isSelected}
        onChange={() => onToggleSelection(item.id)}
        aria-label="Select item"
      />

      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-canvas-elevated sm:h-20 sm:w-20">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs text-text-muted">Image</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-text-primary">
          {product.name || "Product"}
        </p>
        {variantLabel && (
          <p className="mt-0.5 text-xs text-text-secondary">{variantLabel}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <QuantitySelector
            value={item.quantity}
            onChange={changeQuantity}
            max={item.variant?.stock || 99}
            disabled={isUpdating}
          />
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="inline-flex items-center gap-1 rounded p-1.5 text-xs text-text-secondary hover:bg-state-danger/10 hover:text-state-danger"
          >
            <FaTrash className="h-3 w-3" /> Remove
          </button>
          {onMoveToWishlist && (
            <button
              type="button"
              onClick={() => onMoveToWishlist(item)}
              className="text-xs text-brand hover:underline"
            >
              Move to wishlist
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <Money
          amount={item.line_total}
          className="text-base font-semibold text-text-primary"
        />
      </div>
    </div>
  );
}
