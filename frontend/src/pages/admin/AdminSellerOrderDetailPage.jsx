import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import {
  ADMIN_ORDER_TRANSITIONS,
  SELLER_ORDER_STATUS_LABELS,
} from "../../utils/constants";
import {
  fetchAdminSellerOrderDetail,
  transitionAdminSellerOrder,
} from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * Admin's view of a single SellerOrder. Drives the marketplace side of
 * the lifecycle: RECEIVED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED, plus
 * return handling (RETURN_APPROVED / REJECTED / REFUNDED).
 *
 * Sellers handle their half (CONFIRMED → READY_TO_SHIP → HANDED_OVER);
 * after HANDED_OVER the marketplace takes over.
 */
export function AdminSellerOrderDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminSellerOrderDetail(id);
      setOrder(data);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load this seller-order."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function transition(next, note = "") {
    setActing(next);
    try {
      const updated = await transitionAdminSellerOrder(id, { status: next, note });
      setOrder(updated);
      showToast({ type: "success", message: `Order → ${SELLER_ORDER_STATUS_LABELS[next]}` });
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update.") });
    } finally {
      setActing(null);
    }
  }

  if (error) return <ErrorState title="Could not load" description={error} />;
  if (loading || !order) return <Skeleton className="h-96 w-full" />;

  const allowed = ADMIN_ORDER_TRANSITIONS[order.status] || [];

  return (
    <div>
      <Link to="/admin/seller-orders" className="mb-2 inline-flex items-center gap-1 text-xs text-brand hover:underline">
        <FaArrowLeft className="h-3 w-3" /> Back to all marketplace orders
      </Link>
      <Breadcrumbs
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Marketplace Orders", to: "/admin/seller-orders" },
          { label: `#${order.order_number}` },
        ]}
        className="mb-3"
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Seller order #{order.order_number}
          </h1>
          <p className="text-xs text-text-secondary">
            Placed {new Date(order.placed_at).toLocaleString()} ·{" "}
            <Link to={`/admin/sellers/${order.seller}`} className="font-semibold text-brand">
              {order.seller_name}
            </Link>{" "}
            · Parent order #{order.order_number}
          </p>
        </div>
        <StatusBadge status={order.status} variant="seller_order" />
      </div>

      {allowed.length > 0 && (
        <div className="mb-5 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Drive status
            </p>
            <p className="text-[11px] text-text-secondary">
              Lifecycle is sequential — each step unlocks the next.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowed.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === "CANCELLED" || next === "RETURN_REJECTED" ? "secondary" : "primary"}
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
        <section className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-base font-bold text-text-primary">Items</h2>
          <ul className="divide-y divide-border-subtle">
            {(order.items || []).map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-3 text-sm">
                {it.thumbnail ? (
                  <img src={it.thumbnail} alt="" className="h-14 w-14 rounded-lg border border-border-subtle object-contain" />
                ) : (
                  <div className="h-14 w-14 rounded-lg border border-border-subtle bg-canvas-elevated" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary">{it.product_name_snapshot}</p>
                  <p className="text-xs text-text-secondary">{it.variant_attributes_snapshot} · Qty {it.quantity}</p>
                </div>
                <Money amount={it.line_total} className="font-semibold" />
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-3 text-sm">
            <Row label="Subtotal" value={<Money amount={order.subtotal} />} />
            <Row label="Shipping (your slice)" value={<Money amount={order.shipping_contribution} />} />
            <Row label="Commission" value={<span className="text-state-danger"><Money amount={order.commission_amount} /></span>} />
            <div className="my-2 border-t border-dashed border-border-subtle" />
            <Row label="Net payout" value={<Money amount={order.seller_earning} className="font-bold text-state-success" />} bold />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
            <h2 className="mb-2 text-base font-bold text-text-primary">Customer</h2>
            <p className="text-sm font-semibold text-text-primary">{order.customer_name}</p>
            <p className="text-xs text-text-secondary">{order.customer_email}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
            <h2 className="mb-2 text-base font-bold text-text-primary">Ship to</h2>
            <p className="text-sm text-text-secondary">
              {order.shipping_address?.full_name}
              <br />
              {order.shipping_address?.line1}
              {order.shipping_address?.line2 ? `, ${order.shipping_address.line2}` : ""}
              <br />
              {order.shipping_address?.city}{order.shipping_address?.district ? `, ${order.shipping_address.district}` : ""}
              <br />
              {order.shipping_address?.country}
            </p>
          </div>
          {order.shipment && (
            <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
              <h2 className="mb-2 text-base font-bold text-text-primary">Shipment</h2>
              <p className="text-xs text-text-secondary">Carrier: <strong className="text-text-primary">{order.shipment.carrier || "—"}</strong></p>
              <p className="text-xs text-text-secondary">Tracking: <strong className="text-text-primary">{order.shipment.tracking_number || "—"}</strong></p>
              <p className="text-xs text-text-secondary">Status: <strong className="text-text-primary">{order.shipment.status || "—"}</strong></p>
            </div>
          )}
        </section>
      </div>

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
      <span>{value}</span>
    </div>
  );
}
