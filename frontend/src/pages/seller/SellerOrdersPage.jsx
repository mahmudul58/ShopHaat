import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaClipboardList, FaSearch } from "react-icons/fa";

import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { SELLER_ORDER_STATUS_LABELS, SELLER_ORDER_TRANSITIONS } from "../../utils/constants";
import { fetchSellerOrders } from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * Seller order inbox — dark ShopHaat variant.
 */
export function SellerOrdersPage() {
  const [tab, setTab] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSellerOrders(tab === "ALL" ? undefined : tab)
      .then((data) => !cancelled && setOrders(data || []))
      .catch((err) => !cancelled && setError(extractErrorMessage(err, "Could not load orders.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const tabs = ["ALL", ...Object.keys(SELLER_ORDER_STATUS_LABELS)];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Orders</h1>
          <p className="text-xs text-text-secondary">
            Manage incoming orders from each store. Click an order to update status.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border-subtle bg-surface-card p-2 shadow-card">
        {tabs.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === s
                ? "bg-brand text-white"
                : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
            }`}
          >
            {s === "ALL" ? "All" : SELLER_ORDER_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState title="Could not load" description={error} />
      ) : loading ? (
        <Skeleton className="h-64 w-full" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={FaClipboardList}
          title="No orders"
          description={tab === "ALL" ? "No orders yet." : `No ${SELLER_ORDER_STATUS_LABELS[tab]} orders.`}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {orders.map((o) => {
                const allowed = SELLER_ORDER_TRANSITIONS[o.status] || [];
                const itemCount = o.items?.length || 0;
                return (
                  <tr key={o.id} className="hover:bg-canvas-elevated/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/seller/orders/${o.id}`}
                        className="font-semibold text-text-primary hover:text-brand"
                      >
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
                      <p className="truncate text-xs text-text-secondary">{o.customer_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} variant="seller_order" />
                      {allowed.length > 0 && (
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-state-warning">
                          Action needed
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <Money amount={o.subtotal} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {new Date(o.placed_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/seller/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:border-brand hover:text-brand"
                      >
                        <FaSearch className="h-3 w-3" /> Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
