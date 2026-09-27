import {
  ORDER_STATUS_LABELS,
  SELLER_ORDER_STATUS_LABELS,
} from "../../utils/constants";

/**
 * One source of truth for the customer + seller-order statuses. Every
 * list/detail view renders status through this so changing a color is a
 * one-line edit. Now tuned for the ShopHaat dark theme.
 *
 * Mapping:
 *   PENDING         → warning  (waiting on action)
 *   CONFIRMED       → info     (acknowledged)
 *   PROCESSING      → info
 *   SHIPPED         → info / brand (on the move)
 *   DELIVERED       → success
 *   CANCELLED       → danger
 *   REFUNDED        → muted
 */
const STATUS_STYLES = {
  PENDING: "bg-warning/10 text-warning ring-warning/30",
  CONFIRMED: "bg-info/10 text-info ring-info/30",
  PROCESSING: "bg-info/10 text-info ring-info/30",
  SHIPPED: "bg-brand/15 text-brand ring-brand/30",
  DELIVERED: "bg-state-success/15 text-state-success ring-state-success/30",
  CANCELLED: "bg-state-danger/10 text-state-danger ring-state-danger/30",
  REFUNDED: "bg-canvas-elevated text-text-secondary ring-border-subtle",
  // Marketplace/seller-order statuses (richer lifecycle)
  READY_TO_SHIP: "bg-info/10 text-info ring-info/30",
  HANDED_OVER: "bg-info/10 text-info ring-info/30",
  RECEIVED: "bg-info/10 text-info ring-info/30",
  OUT_FOR_DELIVERY: "bg-brand/15 text-brand ring-brand/30",
  RETURN_REQUESTED: "bg-warning/10 text-warning ring-warning/30",
  RETURN_APPROVED: "bg-warning/10 text-warning ring-warning/30",
  RETURN_REJECTED: "bg-state-danger/10 text-state-danger ring-state-danger/30",
  RETURNED: "bg-canvas-elevated text-text-secondary ring-border-subtle",
};

export function StatusBadge({ status, className = "", variant = "order" }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  if (variant === "seller_order") {
    const label = SELLER_ORDER_STATUS_LABELS[status] || status;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
      >
        {label}
      </span>
    );
  }
  const label = ORDER_STATUS_LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {label}
    </span>
  );
}

/** Payment status (PAID/PENDING/FAILED) — backend returns `payment_transactions[0].status` */
const PAYMENT_STATUS_STYLES = {
  SUCCESS: "bg-state-success/15 text-state-success ring-state-success/30",
  PENDING: "bg-warning/10 text-warning ring-warning/30",
  FAILED: "bg-state-danger/10 text-state-danger ring-state-danger/30",
};

export function PaymentStatusBadge({ status, className = "" }) {
  const style = PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.PENDING;
  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : "Pending";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {label}
    </span>
  );
}
