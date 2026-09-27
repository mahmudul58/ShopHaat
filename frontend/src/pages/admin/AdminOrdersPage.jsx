import { useEffect, useState } from "react";

import { OrderTable } from "../../components/admin/OrderTable";
import { EmptyState } from "../../components/common/EmptyState";
import { ORDER_STATUS_LABELS } from "../../utils/constants";
import { fetchAdminOrders } from "../../services/orderService";

const FILTER_OPTIONS = ["", ...Object.keys(ORDER_STATUS_LABELS)];

export function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Reset to page 1 when filter changes
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchAdminOrders(statusFilter || undefined, page)
      .then((data) => {
        setOrders(data.results || data);
        setTotalCount(data.count || (data.results || data).length);
        setHasNext(!!data.next);
        setHasPrev(!!data.previous);
      })
      .finally(() => setIsLoading(false));
  }, [statusFilter, page]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
          Orders
        </h1>
        <p className="text-xs text-text-secondary">
          {totalCount} order{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((value) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === value
                ? "border-brand bg-brand/15 text-brand"
                : "border-border-subtle text-text-secondary hover:border-brand"
            }`}
          >
            {value ? ORDER_STATUS_LABELS[value] : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <OrderTable orders={[]} isLoading />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No orders match this filter yet."
        />
      ) : (
        <div className="space-y-4">
          <OrderTable orders={orders} />
          
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!hasPrev || isLoading}
              className="rounded-lg border border-border-subtle bg-canvas px-4 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-elevated disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-text-secondary">
              Page {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || isLoading}
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

