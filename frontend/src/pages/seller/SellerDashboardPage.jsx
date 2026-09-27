import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBoxOpen,
  FaShoppingCart,
  FaDollarSign,
  FaExclamationTriangle,
} from "react-icons/fa";

import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Sparkline } from "../../components/admin/Sparkline";
import { StatCard } from "../../components/admin/StatCard";
import { fetchSellerDashboard, fetchSellerDashboardCharts, fetchSellerOrders } from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * Seller Center dashboard. Real data, no hardcoded numbers.
 *
 * Dark-theme variant.
 */
export function SellerDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchSellerDashboard(),
      fetchSellerDashboardCharts(),
      fetchSellerOrders(),
    ])
      .then(([s, c, orders]) => {
        if (cancelled) return;
        setSummary(s);
        setCharts(c);
        setRecentOrders((orders || []).slice(0, 5));
      })
      .catch((err) => !cancelled && setError(extractErrorMessage(err, "Could not load the dashboard.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <ErrorState title="Could not load" description={error} />;
  }
  if (loading || !summary) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Welcome back, {summary.store_name}</h1>
        <p className="text-xs sm:text-sm text-text-secondary">Here's how your store is doing today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={FaDollarSign}
          label="Total Sales"
          value={<Money amount={summary.total_sales} />}
          accent="text-state-success"
        />
        <StatCard
          icon={FaShoppingCart}
          label="Total Orders"
          value={summary.total_orders}
          accent="text-state-info"
        />
        <StatCard
          icon={FaBoxOpen}
          label="Products"
          value={summary.total_products}
          accent="text-brand"
        />
        <StatCard
          icon={FaExclamationTriangle}
          label="Low stock"
          value={summary.low_stock_count}
          accent={summary.low_stock_count > 0 ? "text-state-danger" : "text-text-secondary"}
        />
      </div>

      <div className="mt-4">
        <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary">Sales overview (90 days)</h2>
            <span className="text-[10px] sm:text-xs text-text-secondary">Last 90 days</span>
          </div>
          <Sparkline
            data={(charts?.revenue_by_day || []).map((row) => parseFloat(row.revenue || 0))}
            width={800}
            height={60}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-surface-card shadow-card">
          <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <h2 className="text-base font-bold text-text-primary">Recent orders</h2>
            <Link to="/seller/orders" className="text-xs font-semibold text-brand">View all</Link>
          </header>
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="When customers buy your products, they'll show up here." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-text-primary">#{o.order_number}</p>
                    <p className="text-xs text-text-secondary">{new Date(o.placed_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money amount={o.subtotal} className="font-semibold" />
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-card shadow-card">
          <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <h2 className="text-base font-bold text-text-primary">Low stock alerts</h2>
            <Link to="/seller/inventory" className="text-xs font-semibold text-brand">Manage inventory</Link>
          </header>
          {(summary.low_stock_products || []).length === 0 ? (
            <EmptyState title="Stock is healthy" description="No products are below the low-stock threshold." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {summary.low_stock_products.map((p) => (
                <li key={p.variant_id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <Link to={`/seller/products/${p.product_slug}/edit`} className="font-semibold text-text-primary hover:text-brand">
                      {p.product_name}
                    </Link>
                    <p className="text-xs text-text-secondary">SKU: {p.sku}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.is_out_of_stock ? "bg-state-danger/15 text-state-danger" : "bg-state-warning/15 text-state-warning"}`}>
                    {p.is_out_of_stock ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
