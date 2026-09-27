import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBoxOpen, FaSearch } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { useToast } from "../../hooks/useToast";
import { fetchMySellerStatus } from "../../services/marketplaceService";
import { fetchProducts, updateVariant } from "../../services/catalogService";
import { extractErrorMessage } from "../../services/apiClient";

const LOW_STOCK_THRESHOLD = 5;

/**
 * Inventory view across all of the seller's products/variants.
 * Dark ShopHaat variant.
 */
export function SellerInventoryPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMySellerStatus()
      .then((profile) =>
        fetchProducts({ ordering: "-updated_at", page_size: 100 }).then((data) => {
          if (cancelled) return;
          const list = (data.results || data).filter(
            (p) => p.seller?.store_slug === profile.store_slug
          );
          const flat = [];
          for (const p of list) {
            if (!p.variants || p.variants.length === 0) {
              flat.push({
                product_id: p.id,
                product_name: p.name,
                product_slug: p.slug,
                variant_id: null,
                sku: p.sku || "—",
                size: "",
                color: "",
                stock: p.total_stock ?? 0,
                price: p.min_price ?? p.base_price,
                thumbnail: p.thumbnail,
              });
            } else {
              for (const v of p.variants) {
                flat.push({
                  product_id: p.id,
                  product_name: p.name,
                  product_slug: p.slug,
                  variant_id: v.id,
                  sku: v.sku || "—",
                  size: v.size || "",
                  color: v.color || "",
                  stock: v.stock ?? 0,
                  price: v.effective_price ?? p.base_price,
                  thumbnail: p.thumbnail,
                });
              }
            }
          }
          setRows(flat);
        })
      )
      .catch((err) => !cancelled && setError(extractErrorMessage(err, "Could not load inventory.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveStock(row, value) {
    if (!row.variant_id) {
      showToast({ type: "error", message: "Save variants first to track stock." });
      return;
    }
    const stock = Math.max(0, parseInt(value, 10) || 0);
    setSaving(row.variant_id);
    try {
      await updateVariant(row.product_slug, row.variant_id, { stock });
      setRows((prev) => prev.map((r) => (r.variant_id === row.variant_id ? { ...r, stock } : r)));
      showToast({ type: "success", message: "Stock updated" });
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update stock.") });
    } finally {
      setSaving(null);
    }
  }

  const filtered = rows
    .filter((r) => {
      if (filter === "low") return r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD;
      if (filter === "out") return r.stock === 0;
      return true;
    })
    .filter((r) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        r.product_name.toLowerCase().includes(s) ||
        r.sku.toLowerCase().includes(s)
      );
    });

  const lowCount = rows.filter((r) => r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD).length;
  const outCount = rows.filter((r) => r.stock === 0).length;

  if (error) return <ErrorState title="Could not load" description={error} />;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Seller Center", to: "/seller" },
          { label: "Inventory" },
        ]}
        className="mb-3"
      />
      <h1 className="mb-4 text-xl font-bold text-text-primary">Inventory</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill label={`All (${rows.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterPill label={`Low (${lowCount})`} active={filter === "low"} onClick={() => setFilter("low")} tone="warning" />
        <FilterPill label={`Out (${outCount})`} active={filter === "out"} onClick={() => setFilter("out")} tone="danger" />
        <div className="relative ml-auto flex-1 sm:max-w-xs">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or SKU"
            className="w-full rounded-lg border border-border-subtle bg-canvas-elevated py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState icon={FaBoxOpen} title="No products yet" description="Add a product to manage its inventory." />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing matches" description="Try a different filter." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-4 py-3">Product / Variant</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((r, i) => {
                const tone =
                  r.stock === 0
                    ? "bg-state-danger/15 text-state-danger"
                    : r.stock <= LOW_STOCK_THRESHOLD
                    ? "bg-state-warning/15 text-state-warning"
                    : "bg-state-success/15 text-state-success";
                return (
                  <tr key={`${r.variant_id || r.product_id}-${i}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.thumbnail ? (
                          <img src={r.thumbnail} alt="" className="h-10 w-10 rounded-lg border border-border-subtle object-contain" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg border border-border-subtle bg-canvas-elevated" />
                        )}
                        <div>
                          <Link to={`/seller/products/${r.product_slug}/edit`} className="font-semibold text-text-primary hover:text-brand">
                            {r.product_name}
                          </Link>
                          {(r.size || r.color) && (
                            <p className="text-xs text-text-secondary">
                              {[r.size, r.color].filter(Boolean).join(" / ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{r.sku}</td>
                    <td className="px-4 py-3"><Money amount={r.price} /></td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        defaultValue={r.stock}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== r.stock) saveStock(r, e.target.value);
                        }}
                        disabled={saving === r.variant_id || !r.variant_id}
                        className="w-20 rounded border border-border-subtle bg-canvas-elevated px-2 py-1 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
                        {r.stock === 0 ? "Out" : r.stock <= LOW_STOCK_THRESHOLD ? `${r.stock} left` : "In stock"}
                      </span>
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

function FilterPill({ label, active, onClick, tone = "default" }) {
  const palette = {
    default: active ? "bg-canvas text-text-primary" : "bg-canvas-elevated text-text-secondary hover:bg-surface-card",
    warning: active ? "bg-state-warning text-canvas" : "bg-state-warning/15 text-state-warning hover:bg-state-warning/25",
    danger: active ? "bg-state-danger text-white" : "bg-state-danger/15 text-state-danger hover:bg-state-danger/25",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${palette[tone]}`}
    >
      {label}
    </button>
  );
}
