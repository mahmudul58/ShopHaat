import { FaArrowDown, FaArrowUp } from "react-icons/fa";

/**
 * Single KPI tile for the admin dashboard.
 *  - label: small uppercase eyebrow
 *  - value: headline number (string or number)
 *  - icon: react-icon component (optional, top-right corner)
 *  - trend: { value: number, label?: string } — positive number renders
 *           green ↑ arrow, negative renders red ↓ arrow. Omit for no trend.
 */
export function StatCard({ label, value, icon: Icon, trend, accent }) {
  const trendIsPositive = trend && typeof trend.value === "number" && trend.value >= 0;
  const trendColor = !trend
    ? ""
    : trendIsPositive
    ? "text-state-success bg-state-success/15"
    : "text-state-danger bg-state-danger/15";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card transition-shadow hover:shadow-elevated sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-medium uppercase tracking-wider ${accent || "text-text-secondary"}`}>
          {label}
        </p>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl">
        {value}
      </p>
      {trend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${trendColor}`}
          >
            {trendIsPositive ? (
              <FaArrowUp className="h-2.5 w-2.5" />
            ) : (
              <FaArrowDown className="h-2.5 w-2.5" />
            )}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          {trend.label && <span className="text-text-secondary">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
