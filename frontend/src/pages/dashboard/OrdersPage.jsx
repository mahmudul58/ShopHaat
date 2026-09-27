import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBoxOpen } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { OrderRowSkeleton } from "../../components/common/Skeleton";
import { StatusBadge, PaymentStatusBadge } from "../../components/common/StatusBadge";
import { fetchOrders } from "../../services/orderService";
import { extractErrorMessage } from "../../services/apiClient";

const TABS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");

  useEffect(() => {
    fetchOrders()
      .then((data) => setOrders(data.results || data || []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load orders.")))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = orders.filter((o) =>
    activeTab === "ALL" ? true : o.status === activeTab
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Orders" }]} className="mb-3" />

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">My Orders</h1>
        <p className="text-sm text-text-secondary">
          {orders.length} order{orders.length === 1 ? "" : "s"} total
        </p>
      </div>

      {/* Tabs (scroll on mobile) */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? "border-brand bg-brand/15 text-brand"
                : "border-border-subtle text-text-secondary hover:border-brand/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      {error ? (
        <ErrorState
          title="Couldn't load orders"
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
            fetchOrders().then((data) => setOrders(data.results || data || [])).finally(() => setIsLoading(false));
          }}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          <OrderRowSkeleton />
          <OrderRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description={
            activeTab === "ALL"
              ? "Place your first order to see it here."
              : `You don't have any ${activeTab.toLowerCase()} orders.`
          }
          action={
            <Link to="/catalog">
              <Button>Browse Catalog</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.order_number} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }) {
  const paymentStatus = order.payment_transactions?.[0]?.status;
  const paymentMethod = order.payment_method;
  const showPaymentBadge =
    paymentStatus &&
    (paymentMethod === "SIMULATED_ONLINE" || paymentStatus === "FAILED");

  return (
    <Link
      to={`/dashboard/orders/${order.order_number}`}
      className="block rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-card-hover sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-text-primary">
            #{order.order_number}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Placed {new Date(order.placed_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          {showPaymentBadge && (
            <PaymentStatusBadge status={paymentStatus} />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex -space-x-2">
          {order.items?.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-surface-card bg-canvas-elevated"
            >
              {item.product_image ? (
                <img
                  src={item.product_image}
                  alt={item.product_name_snapshot}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FaBoxOpen className="h-4 w-4 text-text-muted" />
              )}
            </div>
          ))}
          {order.items?.length > 3 && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-card bg-canvas-elevated text-xs font-medium text-text-secondary">
              +{order.items.length - 3}
            </div>
          )}
        </div>
        <p className="line-clamp-1 flex-1 text-sm text-text-secondary">
          {order.items?.map((i) => i.product_name_snapshot).join(", ")}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
        <p className="text-xs text-text-secondary">
          {order.items?.length} item{order.items?.length === 1 ? "" : "s"}
        </p>
        <Money
          amount={order.grand_total}
          className="text-base font-bold text-brand"
        />
      </div>
    </Link>
  );
}
