import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaPlus, FaEdit, FaTrash, FaImage, FaBox } from "react-icons/fa";

import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import * as catalogService from "../../services/catalogService";
import { fetchMySellerStatus } from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

function clipName(value, max = 40) {
  if (!value) return "";
  return value.length > max ? value.slice(0, max).trimEnd() + "…" : value;
}

/**
 * Seller's own product list. Dark ShopHaat variant.
 */
export function SellerProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [store, setStore] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const profile = await fetchMySellerStatus();
      setStore(profile);
      const data = await catalogService.fetchProducts({
        seller: profile.store_slug,
        ordering: "-created_at",
        page_size: 100,
      });
      const list = data.results || data;
      setProducts(list);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load your products."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(p) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeleting(p.id);
    try {
      await catalogService.deleteProduct(p.slug);
      showToast({ type: "success", message: "Product deleted" });
      await load();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not delete.") });
    } finally {
      setDeleting(null);
    }
  }

  if (error) return <ErrorState title="Could not load" description={error} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">My Products</h1>
          <p className="text-xs text-text-secondary">{products.length} listed</p>
        </div>
        <Link to="/seller/products/new">
          <Button><FaPlus className="h-3 w-3" /> Add product</Button>
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={FaBox}
          title="No products yet"
          description="Get started by adding your first product."
          action={
            <Link to="/seller/products/new">
              <Button><FaPlus className="h-3 w-3" /> Add product</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {products.map((p) => {
                const shortName = clipName(p.name, 30);
                const shortSlug = clipName(p.slug, 36);
                const totalStock =
                  p.total_stock ??
                  (p.variants || []).reduce(
                    (s, v) => s + Number(v.stock || 0),
                    0
                  );
                return (
                  <tr key={p.id} className="hover:bg-canvas-elevated/50">
                    <td className="w-full max-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt={p.name}
                            className="h-10 w-10 shrink-0 rounded-lg border border-border-subtle object-contain"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-canvas-elevated">
                            <FaImage className="text-text-muted" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-semibold text-text-primary"
                            title={p.name}
                          >
                            {shortName}
                          </p>
                          <p
                            className="truncate text-xs text-text-secondary"
                            title={p.slug}
                          >
                            {shortSlug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          totalStock === 0
                            ? "bg-state-danger/15 text-state-danger"
                            : totalStock < 10
                            ? "bg-state-warning/15 text-state-warning"
                            : "bg-state-success/15 text-state-success"
                        }`}
                        title={`${totalStock} units in stock`}
                      >
                        {totalStock}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Money amount={p.min_price ?? p.base_price} className="font-semibold" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={p.status || "ACTIVE"} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        to={`/seller/products/${p.slug}/edit`}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:border-brand hover:text-brand"
                      >
                        <FaEdit className="h-3 w-3" /> Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        disabled={deleting === p.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-state-danger/30 bg-state-danger/10 px-2 py-1 text-xs text-state-danger hover:bg-state-danger/15"
                      >
                        <FaTrash className="h-3 w-3" /> Delete
                      </button>
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
