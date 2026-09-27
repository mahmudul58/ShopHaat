import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { OrderStatusUpdateForm } from "../../components/admin/OrderStatusUpdateForm";
import { Skeleton } from "../../components/common/Skeleton";
import { OrderStatusTracker } from "../../components/orders/OrderStatusTracker";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { fetchOrderDetail, updateOrderStatus } from "../../services/orderService";
import { formatCurrency } from "../../utils/formatCurrency";

export function AdminOrderDetailPage() {
  const { orderNumber } = useParams();
  const { showToast } = useToast();

  const [order, setOrder] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrderDetail(orderNumber).then(setOrder);
  }, [orderNumber]);

  async function handleUpdateStatus({ status, note }) {
    setIsUpdating(true);
    try {
      const updated = await updateOrderStatus(orderNumber, { status, note });
      setOrder(updated);
      showToast("Order status updated.", "success");
    } catch (error) {
      showToast(extractErrorMessage(error, "Could not update this order's status."), "error");
    } finally {
      setIsUpdating(false);
    }
  }

  if (!order) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-text-primary">{order.order_number}</h1>
      <p className="mb-6 text-sm text-text-muted">{new Date(order.placed_at).toLocaleString()}</p>

      <div className="mb-6 rounded-xl bg-surface-card p-4 shadow-card border border-border-subtle">
        <OrderStatusTracker status={order.status} />
      </div>

      <div className="mb-6 divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium text-text-primary">{item.product_name_snapshot}</p>
              <p className="text-text-secondary">
                {item.variant_attributes_snapshot} &middot; Qty {item.quantity}
              </p>
            </div>
            <span className="font-semibold text-text-primary">{formatCurrency(item.line_total)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 text-base font-semibold text-text-primary">
          <span>Total</span>
          <span>{formatCurrency(order.grand_total)}</span>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border-subtle bg-surface-card p-4 text-sm shadow-card">
        <h3 className="mb-1 font-semibold text-text-primary">Shipping to</h3>
        <p className="text-text-secondary">
          {order.shipping_address_snapshot?.full_name}, {order.shipping_address_snapshot?.line1},{" "}
          {order.shipping_address_snapshot?.city}
        </p>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-text-primary">Update status</h2>
      <OrderStatusUpdateForm currentStatus={order.status} onUpdate={handleUpdateStatus} isUpdating={isUpdating} />

      {order.status_history?.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">History</h3>
          <ul className="space-y-1 text-sm text-text-secondary">
            {order.status_history.map((entry, index) => (
              <li key={index}>
                {new Date(entry.changed_at).toLocaleString()} — {entry.status}
                {entry.note && ` (${entry.note})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
