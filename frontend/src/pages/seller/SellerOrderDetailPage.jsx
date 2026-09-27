import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { SELLER_ORDER_STATUS_LABELS, SELLER_ORDER_TRANSITIONS } from "../../utils/constants";
import { fetchSellerOrderDetail, transitionSellerOrder } from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * Single seller-order view — dark ShopHaat variant.
 */
export function SellerOrderDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSellerOrderDetail(id);
      setOrder(data);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load this order."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function transition(targetStatus) {
    setActing(targetStatus);
    try {
      const updated = await transitionSellerOrder(id, { status: targetStatus });
      setOrder(updated);
      showToast({ type: "success", message: `Order moved to ${SELLER_ORDER_STATUS_LABELS[targetStatus]}` });
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update order.") });
    } finally {
      setActing(null);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState title="Could not load" description={error} />;
  if (!order) return null;

  const allowed = SELLER_ORDER_TRANSITIONS[order.status] || [];
  const isTerminal = order.status === "CANCELLED" || order.status === "REFUNDED" || order.status === "HANDED_OVER";

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Seller Center", to: "/seller" },
          { label: "Orders", to: "/seller/orders" },
          { label: `#${order.order_number}` },
        ]}
        className="mb-3"
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Order #{order.order_number}
          </h1>
          <p className="text-xs text-text-secondary">
            Placed {new Date(order.placed_at).toLocaleString()} · Parent order #
            {order.order_number}
          </p>
        </div>
        <StatusBadge status={order.status} variant="seller_order" />
      </div>

      {/* Transitions */}
      {!isTerminal && allowed.length > 0 && (
        <div className="mb-5 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Next steps
          </p>
          <div className="flex flex-wrap gap-2">
            {allowed.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === "CANCELLED" ? "secondary" : "primary"}
                isLoading={acting === next}
                disabled={Boolean(acting)}
                onClick={() => transition(next)}
              >
                {SELLER_ORDER_STATUS_LABELS[next] || next}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Items */}
        <section className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-base font-bold text-text-primary">Items in this order</h2>
          <ul className="divide-y divide-border-subtle">
            {(order.items || []).map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-3 text-sm">
                {it.thumbnail ? (
                  <img
                    src={it.thumbnail}
                    alt={it.product_name_snapshot}
                    className="h-14 w-14 rounded-lg border border-border-subtle object-contain"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg border border-border-subtle bg-canvas-elevated" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/products/${it.product_slug || "#"}`}
                    className="line-clamp-2 font-semibold text-text-primary hover:text-brand"
                  >
                    {it.product_name_snapshot}
                  </Link>
                  <p className="text-xs text-text-secondary">
                    {it.variant_attributes_snapshot} · Qty {it.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <Money amount={it.line_total} className="font-semibold" />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-3 text-sm">
            <Row label="Items subtotal" value={<Money amount={order.subtotal} />} />
            <Row label="Shipping (your slice)" value={<Money amount={order.shipping_contribution} />} />
            <Row label="Commission" value={<span className="text-state-danger">-<Money amount={order.commission_amount} /></span>} />
            <div className="my-2 border-t border-dashed border-border-subtle" />
            <Row label="Net earnings" value={<Money amount={order.seller_earning} className="font-bold text-state-success" />} bold />
          </div>
        </section>

        {/* Customer + shipment */}
        <section className="space-y-4">
          <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
            <h2 className="mb-2 text-base font-bold text-text-primary">Customer</h2>
            <p className="text-sm font-semibold text-text-primary">{order.customer_name}</p>
            <p className="text-xs text-text-secondary">{order.customer_email}</p>
            {order.customer_phone && (
              <p className="text-xs text-text-secondary">{order.customer_phone}</p>
            )}
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
            <h2 className="mb-2 text-base font-bold text-text-primary">Shipping to</h2>
            <p className="text-sm text-text-secondary">
              {order.shipping_address?.full_name}
              <br />
              {order.shipping_address?.line1}
              {order.shipping_address?.line2 ? `, ${order.shipping_address.line2}` : ""}
              <br />
              {order.shipping_address?.city}
              {order.shipping_address?.district ? `, ${order.shipping_address.district}` : ""}
              <br />
              {order.shipping_address?.country}
            </p>
          </div>

          {order.shipment && (
            <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
              <h2 className="mb-2 text-base font-bold text-text-primary">Shipment</h2>
              <p className="text-xs text-text-secondary">
                Carrier: <strong className="text-text-primary">{order.shipment.carrier || "—"}</strong>
              </p>
              <p className="text-xs text-text-secondary">
                Tracking: <strong className="text-text-primary">{order.shipment.tracking_number || "—"}</strong>
              </p>
              <p className="text-xs text-text-secondary">
                Status: <strong className="text-text-primary">{order.shipment.status || "—"}</strong>
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Status history */}
      {order.status_history?.length > 0 && (
        <section className="mt-5 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <h2 className="mb-3 text-base font-bold text-text-primary">Status history</h2>
          <ul className="space-y-2 text-sm">
            {order.status_history.map((h, i) => (
              <li key={i} className="flex items-center justify-between border-b border-border-subtle pb-2 last:border-b-0">
                <div>
                  <StatusBadge status={h.status} variant="seller_order" />
                  {h.note && <p className="ml-2 inline text-xs text-text-secondary">{h.note}</p>}
                </div>
                <span className="text-xs text-text-secondary">{new Date(h.changed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base" : ""}`}>
      <span className={bold ? "font-semibold text-text-primary" : "text-text-secondary"}>{label}</span>
      <span className={bold ? "" : ""}>{value}</span>
    </div>
  );
}
