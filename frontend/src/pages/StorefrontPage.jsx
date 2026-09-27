import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaStar, FaStore, FaMapMarkerAlt, FaUsers } from "react-icons/fa";

import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ErrorState } from "../components/common/ErrorState";
import { FilterSidebar } from "../components/product/FilterSidebar";
import { ProductGrid } from "../components/product/ProductGrid";
import { RatingStars } from "../components/product/RatingStars";
import { Skeleton } from "../components/common/Skeleton";
import { fetchStorefront, fetchStorefrontProducts } from "../services/marketplaceService";
import { extractErrorMessage } from "../services/apiClient";

/**
 * Public storefront page. Shows the seller profile + their product catalog
 * filtered through the same FilterSidebar/SortDropdown the catalog uses.
 */
export function StorefrontPage() {
  const { slug: storeSlug } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingStore, setLoadingStore] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState("-created_at");

  useEffect(() => {
    let cancelled = false;
    setLoadingStore(true);
    setError(null);
    fetchStorefront(storeSlug)
      .then((data) => !cancelled && setStore(data))
      .catch((err) => !cancelled && setError(extractErrorMessage(err, "Could not load this store.")))
      .finally(() => !cancelled && setLoadingStore(false));
    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  // Build product listing params from the same shape FilterSidebar uses.
  const productParams = useMemo(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v == null || v === "" || v === false) return;
      params[k] = v;
    });
    if (sort) params.ordering = sort;
    return params;
  }, [filters, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    fetchStorefrontProducts(storeSlug, productParams)
      .then((data) => !cancelled && setProducts(data.results ?? data))
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoadingProducts(false));
    return () => {
      cancelled = true;
    };
  }, [storeSlug, productParams]);

  if (error) {
    return (
      <ErrorState
        title="Store not found"
        description={error}
        action={
          <Link to="/" className="mt-2 inline-block">
            Back to home
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs
        items={[{ label: "Home", to: "/" }, { label: "Stores", to: "/" }, { label: store?.store_name || "Storefront" }]}
        className="mb-3"
      />

      {loadingStore || !store ? (
        <div className="mb-6 space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      ) : (
        <div className="mb-6 overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card">
          {/* Banner */}
          {store.store_banner ? (
            <img src={store.store_banner} alt={`${store.store_name} banner`} className="h-32 w-full object-cover sm:h-44" />
          ) : (
            <div className="h-32 w-full bg-hero-navy sm:h-44" />
          )}

          {/* Logo + heading */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
            {store.store_logo ? (
              <img
                src={store.store_logo}
                alt={store.store_name}
                className="h-20 w-20 shrink-0 rounded-2xl border-4 border-surface-card bg-surface-card object-cover shadow-card"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand shadow-card">
                <FaStore className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-text-primary">{store.store_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1">
                  <FaStar className="text-state-warning" />
                  <strong className="text-text-primary">{Number(store.average_rating || 0).toFixed(2)}</strong>
                  <span>({store.review_count} reviews)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <FaUsers /> {store.followers_count} followers
                </span>
                <span>{store.product_count} products</span>
                {store.city && (
                  <span className="inline-flex items-center gap-1">
                    <FaMapMarkerAlt /> {store.city}
                  </span>
                )}
              </div>
              {store.description && (
                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{store.description}</p>
              )}
            </div>
            <RatingStars rating={Number(store.average_rating || 0)} size={20} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <FilterSidebar filters={filters} onChange={setFilters} sort={sort} onSortChange={setSort} />
        <div>
          <h2 className="mb-4 text-lg font-bold text-text-primary">Products</h2>
          <ProductGrid products={products} isLoading={loadingProducts} />
        </div>
      </div>
    </div>
  );
}
