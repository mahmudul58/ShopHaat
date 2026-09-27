import { Money } from "./Money";
import { formatPercent } from "../../utils/formatCurrency";

/**
 * Three-line price block used by ProductCard and PDP:
 *   ৳1,499  ৳1,999  -25%
 *
 * - `price` is required; `oldPrice` is optional (strike-through).
 * - When `oldPrice` is present and larger, computes discount %.
 * - `size` controls text scale: 'sm' for cards, 'lg' for PDP.
 * - `accent="brand"` renders the price in saffron to match the reference
 *   design's orange price treatment.
 */
export function PriceDisplay({
  price,
  oldPrice,
  size = "md",
  className = "",
  accent = "default",
}) {
  const hasDiscount =
    oldPrice != null &&
    !Number.isNaN(parseFloat(oldPrice)) &&
    parseFloat(oldPrice) > parseFloat(price);
  const discountPct = hasDiscount
    ? ((parseFloat(oldPrice) - parseFloat(price)) / parseFloat(oldPrice)) * 100
    : 0;

  const sizeClass =
    size === "lg"
      ? "text-2xl sm:text-3xl"
      : size === "sm"
        ? "text-sm"
        : "text-base sm:text-lg";

  const priceColor = accent === "brand" ? "text-brand" : "text-text-primary";

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <Money
        amount={price}
        className={`font-bold ${priceColor} ${sizeClass}`}
      />
      {hasDiscount && (
        <>
          <Money
            amount={oldPrice}
            className="text-xs text-text-muted line-through"
          />
          <span className="rounded bg-state-success/10 px-1.5 py-0.5 text-xs font-bold text-state-success">
            -{formatPercent(discountPct)}
          </span>
        </>
      )}
    </div>
  );
}
