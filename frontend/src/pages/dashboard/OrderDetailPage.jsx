import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaMapMarkerAlt, FaTruck, FaBox, FaStore } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge, PaymentStatusBadge } from "../../components/common/StatusBadge";
import { OrderStatusTracker } from "../../components/orders/OrderStatusTracker";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { cancelOrder, fetchOrderDetail, requestOrderReturn } from "../../services/orderService";

const CANCELLABLE_STATES = ["PENDING", "CONFIRMED"];
const PAYMENT_LABELS = {
  COD: "Cash on Delivery",
  SIMULATED_ONLINE: "Card / Online Payment",
};

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchOrderDetail(orderNumber)
      .then(setOrder)
      .catch((err) => setError(extractErrorMessage(err, "Could not load this order.")));
  }, [orderNumber]);

  async function handleCancel() {
    setIsCancelling(true);
    try {
      const updated = await cancelOrder(orderNumber);
      setOrder(updated);
      showToast({ type: "success", message: "Order cancelled" });
    } catch (err) {
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Could not cancel this order."),
      });
    } finally {
      setIsCancelling(false);
    }
  }

  if (error) {
    return (
      <ErrorState
        title="Order not found"
        description={error}
        action={
          <Link to="/dashboard/orders" className="mt-2 inline-block">
            <Button>Back to orders</Button>
          </Link>
        }
      />
    );
  }

  if (!order) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Orders", to: "/dashboard/orders" },
          { label: order.order_number },
        ]}
        className="mb-3"
      />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
            Order #{order.order_number}
          </h1>
          <p className="text-xs text-text-secondary">
            Placed {new Date(order.placed_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {(() => {
            const ps = order.payment_transactions?.[0]?.status;
            const show =
              ps && (order.payment_method === "SIMULATED_ONLINE" || ps === "FAILED");
            return show ? <PaymentStatusBadge status={ps} /> : null;
          })()}
        </div>
      </div>

      {/* Status tracker */}
      <div className="mb-5 rounded-xl border border-border-subtle bg-surface-card p-5 shadow-card">
        <OrderStatusTracker status={order.status} />
      </div>

      {/* Address + payment */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <FaMapMarkerAlt /> Delivery Address
          </div>
          {order.shipping_address_snapshot ? (
            <div className="text-sm text-text-secondary">
              <p className="font-semibold text-text-primary">
                {order.shipping_address_snapshot.full_name}
              </p>
              <p>{order.shipping_address_snapshot.phone}</p>
              <p className="mt-1">
                {order.shipping_address_snapshot.line1}
                {order.shipping_address_snapshot.line2 &&
                  `, ${order.shipping_address_snapshot.line2}`}
                , {order.shipping_address_snapshot.city},{" "}
                {order.shipping_address_snapshot.state}{" "}
                {order.shipping_address_snapshot.postal_code}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No address recorded.</p>
          )}
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <FaTruck /> Payment
          </div>
          <p className="text-sm font-medium text-text-primary">
            {PAYMENT_LABELS[order.payment_method] || order.payment_method}
          </p>
          {order.payment_transactions?.[0] && (
            <p className="mt-1 text-xs text-text-secondary">
              Reference: {order.payment_transactions[0].reference_id}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mb-5 rounded-xl border border-border-subtle bg-surface-card shadow-card">
        <div className="border-b border-border-subtle px-4 py-3 text-sm font-semibold text-text-primary">
          Items ({order.items.length})
        </div>
        <ul className="divide-y divide-border-subtle">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-canvas-elevated">
                {item.product_image ? (
                  <img
                    src={item.product_image}
                    alt={item.product_name_snapshot}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <FaBox className="h-5 w-5 text-text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-text-primary">
                  {item.product_name_snapshot}
                </p>
                <p className="text-xs text-text-secondary">
                  {item.variant_attributes_snapshot} · Qty {item.quantity}
                </p>
                {item.seller_store_slug && (
                  <Link
                    to={`/stores/${item.seller_store_slug}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-brand"
                  >
                    <FaStore className="h-2.5 w-2.5" /> {item.seller_store_name}
                  </Link>
                )}
              </div>
              <Money amount={item.line_total} className="text-sm font-semibold" />
            </li>
          ))}
        </ul>
      </div>



      {/* Totals */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-4 text-sm shadow-card">
        <div className="flex justify-between">
          <span className="text-text-secondary">Subtotal</span>
          <Money amount={order.subtotal} />
        </div>
        {Number(order.discount_amount) > 0 && (
          <div className="flex justify-between text-state-success">
            <span>Discount</span>
            <span className="font-medium">− <Money amount={order.discount_amount} /></span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-text-secondary">Shipping</span>
          <Money amount={order.shipping_cost} />
        </div>
        <div className="mt-2 flex justify-between border-t border-border-subtle pt-2 text-base font-semibold">
          <span>Total</span>
          <Money amount={order.grand_total} className="text-brand" />
        </div>
      </div>

      {/* Cancel */}
      {CANCELLABLE_STATES.includes(order.status) && (
        <div className="mt-6 flex justify-end">
          <Button variant="danger" onClick={handleCancel} isLoading={isCancelling}>
            Cancel Order
          </Button>
        </div>
      )}

      {/* Return request */}
      {order.status === "DELIVERED" && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="secondary"
            onClick={async () => {
              const reason = window.prompt("Why are you returning this order?");
              if (!reason) return;
              try {
                await requestOrderReturn(order.order_number, {
                  items: order.items.map((it) => it.id),
                  reason,
                });
                showToast({ type: "success", message: "Return request submitted" });
                const updated = await fetchOrderDetail(order.order_number);
                setOrder(updated);
              } catch (err) {
                showToast({
                  type: "error",
                  message: extractErrorMessage(err, "Could not submit return."),
                });
              }
            }}
          >
            Request return
          </Button>
        </div>
      )}
    </div>
  );
}
