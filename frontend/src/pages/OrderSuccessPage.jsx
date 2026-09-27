import { useEffect, useState } from "react";
import { FaCheckCircle, FaMapMarkerAlt, FaBoxOpen, FaTruck } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { Money } from "../components/common/Money";
import { Skeleton } from "../components/common/Skeleton";
import { extractErrorMessage } from "../services/apiClient";
import { fetchOrderDetail } from "../services/orderService";

const PAYMENT_LABELS = {
  COD: "Cash on Delivery",
  SIMULATED_ONLINE: "Card / Online Payment",
};

export function OrderSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderNumber = params.get("order");

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderNumber) {
      navigate("/");
      return;
    }
    fetchOrderDetail(orderNumber)
      .then(setOrder)
      .catch((err) => setError(extractErrorMessage(err, "Could not load this order.")));
  }, [orderNumber, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          title="Order not found"
          description={error}
          action={
            <Link to="/dashboard/orders" className="mt-2 inline-block">
              <Button>View my orders</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-8 w-2/3" />
        <Skeleton className="mx-auto mt-2 h-4 w-1/2" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Orders", to: "/dashboard/orders" },
          { label: order.order_number },
        ]}
        className="mb-4"
      />

      {/* Hero confirmation */}
      <div className="rounded-2xl border border-state-success/30 bg-state-success/10 px-6 py-10 text-center">
        <FaCheckCircle className="mx-auto h-16 w-16 text-state-success" />
        <h1 className="mt-4 text-2xl font-bold text-text-primary sm:text-3xl">
          Order Placed Successfully!
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Thank you for shopping with ShopHaat. Your order is being processed.
        </p>
        <p className="mt-3 inline-block rounded-full bg-surface-card px-4 py-1.5 text-sm font-semibold text-text-primary shadow-card">
          Order ID: {order.order_number}
        </p>
      </div>

      {/* Details */}
      <div className="mt-6 space-y-4 rounded-xl border border-border-subtle bg-surface-card p-5 shadow-card">
        <DetailRow
          icon={FaBoxOpen}
          label="Order ID"
          value={order.order_number}
        />
        <DetailRow
          icon={FaMapMarkerAlt}
          label="Delivering to"
          value={
            order.shipping_address_snapshot
              ? `${order.shipping_address_snapshot.full_name}, ${order.shipping_address_snapshot.city}, ${order.shipping_address_snapshot.state}`
              : "—"
          }
        />
        <DetailRow
          icon={FaTruck}
          label="Estimated Delivery"
          value="2–7 business days"
        />
        <DetailRow
          icon={FaTruck}
          label="Payment Method"
          value={PAYMENT_LABELS[order.payment_method] || order.payment_method}
        />
        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold text-text-primary">Total Amount</span>
            <Money
              amount={order.grand_total}
              className="text-2xl font-bold text-brand"
            />
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to={`/dashboard/orders/${order.order_number}`} className="flex-1">
          <Button className="w-full">Track Order</Button>
        </Link>
        <Link to="/catalog" className="flex-1">
          <Button variant="secondary" className="w-full">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas-elevated text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}
