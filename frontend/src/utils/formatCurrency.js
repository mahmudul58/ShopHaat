// Bangladeshi Taka (BDT) by default. Pass a `currency` arg for tests/USD.
// `maximumFractionDigits: 0` because BDT retail prices are whole takas.
const BDT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Format a numeric amount as currency. Returns "৳0" for NaN so a missing
 * price never renders as "$NaN". Pass `currency: "USD"` to opt out.
 */
export function formatCurrency(amount, { currency = "BDT" } = {}) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (value == null || Number.isNaN(value)) return currency === "BDT" ? "৳0" : "$0.00";
  return currency === "BDT" ? BDT.format(value) : USD.format(value);
}

/** Convenience: compute and format a percentage like "20%". */
export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "0%";
  return `${Math.round(value)}%`;
}
