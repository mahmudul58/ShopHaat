import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaClipboardList } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { SELLER_ORDER_STATUS_LABELS } from "../../utils/constants";
import { fetchAdminSellerOrders } from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * Admin-side marketplace order dashboard. Lists every SellerOrder across
 * the platform with status, seller, customer, amount. Used by ops to drive
 * shipments to DELIVERED, manage returns, etc.
 */
export function AdminSellerOrdersPage() {
  const [status, setStatus] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdminSellerOrders({ 
      status: status === "ALL" ? undefined : status,
      page,
      page_size: 12
    })
      .then((d) => {
        if (!cancelled) {
          setOrders(d.results || d || []);
          setTotalCount(d.count || (d.results || d || []).length);
          setHasNext(!!d.next);
          setHasPrev(!!d.previous);
        }
      })
      .catch((err) => !cancelled && setError(extractErrorMessage(err, "Could not load seller-orders.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  const tabs = ["ALL", ...Object.keys(SELLER_ORDER_STATUS_LABELS)];

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Admin" }, { label: "Marketplace Orders" }]}
        className="mb-3"
      />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Marketplace orders</h1>
          <p className="text-xs text-text-secondary">{totalCount} total orders.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border-subtle bg-surface-card p-2 shadow-card">
        {tabs.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === s ? "bg-brand text-white" : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
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
          title="No seller-orders"
          description={status === "ALL" ? "Nothing yet." : `No ${SELLER_ORDER_STATUS_LABELS[status]} orders.`}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-canvas-elevated/50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/seller-orders/${o.id}`} className="font-semibold text-text-primary hover:text-brand">
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/sellers/${o.seller}`} className="text-text-secondary hover:text-brand">
                        {o.seller_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-text-secondary">{o.customer_name}</p>
                      <p className="text-text-muted">{o.customer_email}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} variant="seller_order" /></td>
                    <td className="px-4 py-3 text-right text-text-secondary">{o.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary"><Money amount={o.subtotal} /></td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{new Date(o.placed_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/seller-orders/${o.id}`} className="rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:border-brand hover:text-brand">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
              className="rounded-lg border border-border-subtle bg-canvas px-4 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-elevated disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-text-secondary">
              Page {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || loading}
              className="rounded-lg border border-border-subtle bg-canvas px-4 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-elevated disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
