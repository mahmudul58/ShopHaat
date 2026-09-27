import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaBoxOpen, FaClipboardList, FaArrowLeft, FaStar } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { SELLER_STATUS_LABELS } from "../../utils/constants";
import {
  fetchAdminSellerDetail,
  fetchAdminSellerOrdersForSeller,
  fetchAdminSellerProducts,
  updateAdminSellerStatus,
} from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * Per-seller admin view: profile header, products tab, orders tab.
 * Approve/suspend actions are mirrored here for convenience.
 */
export function AdminSellerDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("products"); // products | orders
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [childLoading, setChildLoading] = useState(false);

  async function loadSeller() {
    setLoading(true);
    try {
      const data = await fetchAdminSellerDetail(id);
      setSeller(data);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load seller."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSeller();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!seller) return;
    let cancelled = false;
    setChildLoading(true);
    if (tab === "products") {
      fetchAdminSellerProducts(id)
        .then((d) => !cancelled && setProducts(d || []))
        .catch(() => !cancelled && setProducts([]))
        .finally(() => !cancelled && setChildLoading(false));
    } else {
      fetchAdminSellerOrdersForSeller(id)
        .then((d) => !cancelled && setOrders(d || []))
        .catch(() => !cancelled && setOrders([]))
        .finally(() => !cancelled && setChildLoading(false));
    }
    return () => {
      cancelled = true;
    };
  }, [tab, id, seller]);

  async function setStatus(next) {
    try {
      let reason = "";
      if (next === "REJECTED" || next === "SUSPENDED") {
        reason = window.prompt(`Reason for ${next.toLowerCase()}?`) || "";
        if (!reason) return;
      }
      await updateAdminSellerStatus(id, { status: next, reason });
      showToast({ type: "success", message: `Updated to ${SELLER_STATUS_LABELS[next]}` });
      loadSeller();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update.") });
    }
  }

  if (error) return <ErrorState title="Could not load" description={error} />;
  if (loading || !seller) return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <Link to="/admin/sellers" className="mb-2 inline-flex items-center gap-1 text-xs text-brand hover:underline">
        <FaArrowLeft className="h-3 w-3" /> Back to all sellers
      </Link>
      <Breadcrumbs
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Sellers", to: "/admin/sellers" },
          { label: seller.store_name },
        ]}
        className="mb-3"
      />

      <div className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card md:grid-cols-[auto_1fr_auto]">
        {seller.store_logo ? (
          <img src={seller.store_logo} alt="" className="h-16 w-16 rounded-xl border border-border-subtle object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-canvas-elevated text-text-muted"><FaBoxOpen /></div>
        )}
        <div>
          <h1 className="text-xl font-bold text-text-primary">{seller.store_name}</h1>
          <p className="text-xs text-text-secondary">/{seller.store_slug} · {seller.email}</p>
          {seller.description && <p className="mt-2 max-w-2xl text-sm text-text-secondary">{seller.description}</p>}
          <div className="mt-2 flex items-center gap-4 text-xs text-text-secondary">
            <span><FaStar className="inline text-state-warning" /> {Number(seller.average_rating || 0).toFixed(1)} ({seller.review_count})</span>
            <span>{seller.product_count} products</span>
            <span>{seller.seller_order_count} orders</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            seller.status === "APPROVED" ? "bg-state-success/15 text-state-success"
              : seller.status === "PENDING" ? "bg-state-warning/15 text-state-warning"
                : "bg-state-danger/15 text-state-danger"
          }`}>
            {SELLER_STATUS_LABELS[seller.status]}
          </span>
          <div className="flex flex-wrap gap-1">
            {seller.status !== "APPROVED" && (
              <Button size="sm" onClick={() => setStatus("APPROVED")}>Approve</Button>
            )}
            {seller.status === "APPROVED" && (
              <Button size="sm" variant="secondary" onClick={() => setStatus("SUSPENDED")}>Suspend</Button>
            )}
            {seller.status !== "REJECTED" && seller.status !== "APPROVED" && (
              <Button size="sm" variant="secondary" onClick={() => setStatus("REJECTED")}>Reject</Button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-border-subtle bg-surface-card p-2 shadow-card">
        <TabBtn icon={FaBoxOpen} label={`Products (${seller.product_count})`} active={tab === "products"} onClick={() => setTab("products")} />
        <TabBtn icon={FaClipboardList} label={`Orders (${seller.seller_order_count})`} active={tab === "orders"} onClick={() => setTab("orders")} />
      </div>

      {childLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : tab === "products" ? (
        products.length === 0 ? (
          <EmptyState icon={FaBoxOpen} title="No products" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-xl border border-border-subtle bg-surface-card p-3 shadow-card">
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt="" className="aspect-square w-full rounded-lg border border-border-subtle object-contain" />
                ) : (
                  <div className="aspect-square w-full rounded-lg border border-border-subtle bg-canvas-elevated" />
                )}
                <Link to={`/products/${p.slug}`} className="mt-2 line-clamp-2 font-semibold text-text-primary hover:text-brand">{p.name}</Link>
                <div className="mt-1 flex items-center justify-between">
                  <Money amount={p.min_price ?? p.base_price} className="text-sm font-semibold" />
                  <StatusBadge status={p.status || "ACTIVE"} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : orders.length === 0 ? (
        <EmptyState icon={FaClipboardList} title="No seller-orders" />
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
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-canvas-elevated/50">
                  <td className="px-4 py-3 font-semibold text-text-primary">#{o.order_number}</td>
                  <td className="px-4 py-3 text-text-secondary">{o.items?.length || 0}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} variant="seller_order" /></td>
                  <td className="px-4 py-3 text-right"><Money amount={o.subtotal} /></td>
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
      )}
    </div>
  );
}

function TabBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-brand text-white" : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
      }`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
