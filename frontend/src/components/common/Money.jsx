import { formatCurrency } from "../../utils/formatCurrency";

/**
 * Single source of truth for "show a price". Renders ৳1,499 by default.
 * Pass `currency="USD"` for tests. Pass `className` to size/color the text.
 */
export function Money({ amount, currency = "BDT", className = "" }) {
  return <span className={className}>{formatCurrency(amount, { currency })}</span>;
}
