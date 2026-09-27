/**
 * Refined discount ribbon used at the top-left of a product card.
 * Solid saffron per ShopHaat design system.
 */
export function DiscountBadge({ percent, className = "" }) {
  if (!percent || percent <= 0) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white shadow-card ${className}`}
    >
      -{Math.round(percent)}%
    </span>
  );
}
