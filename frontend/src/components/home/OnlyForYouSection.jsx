import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaRegHeart, FaStar, FaCartPlus, FaChevronDown } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";

import { Skeleton } from "../common/Skeleton";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { fetchProducts } from "../../services/catalogService";
import { ProductCard } from "../product/ProductCard";

/**
 * "Only For You" — matches the ShopHaat reference exactly.
 *
 * Layout:
 *   • Section header: ✨ "Only For You" + subtitle
 *   • 4 filter pills: Trending Now (active saffron) · Best Rated · Newly Added · Under ৳1,500
 *   • 5-col × 3-row grid (15 product cards) on desktop
 *   • Each card: edge-to-edge image · -XX% pill · heart · merchant with
 *     verified tick · bold white price · strikethrough original · Free / Fast
 *     Delivery chip · add-to-cart icon button
 *   • Load more button at the bottom — appends the next page inline
 *     (Daraz/Amazon style). Hides itself when all products are loaded.
 */
const FILTERS = [
  { id: "trending", label: "Trending Now" },
  { id: "rating", label: "Best Rated" },
  { id: "new", label: "Newly Added" },
  { id: "under-1500", label: "Under ৳1,500" },
];

const PAGE_SIZE = 24;

export function OnlyForYouSection({ products = [], isLoading = false }) {
  const { showToast } = useToast();

  // Local pagination state. The first page is seeded from the `products`
  // prop (so the parent's loading flag still drives the initial skeleton),
  // and subsequent pages are fetched internally.
  const [items, setItems] = useState(products);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track whether the initial prop-based seed has already been applied,
  // so we don't re-seed on every render.
  const seededRef = useRef(false);

  // Seed local state from the prop the first time the parent provides it.
  useEffect(() => {
    if (seededRef.current) return;
    if (isLoading) return;
    if (!products || products.length === 0) return;
    seededRef.current = true;
    setItems(products);
    // If the initial page came back smaller than the page size, there are
    // no more products to fetch.
    setHasMore(products.length >= PAGE_SIZE);
  }, [products, isLoading]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const data = await fetchProducts({
        ordering: "-sales_count",
        page: nextPage,
        page_size: PAGE_SIZE,
      });
      const newResults = data.results || [];
      setItems((prev) => [...prev, ...newResults]);
      setPage(nextPage);
      // No more pages when the API says there's no `next` link, or when the
      // page came back short of the requested size.
      if (!data.next || newResults.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      // Closes BUG-FE-002: the global api:error interceptor already fires
      // a toast via ToastProvider. Keep this explicit toast for the
      // pagination case where the page already has content on screen
      // and the generic "Something went wrong" copy is too vague.
      showToast({ type: "error", message: "Could not load more products" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <section id="recommendations" className="bg-canvas py-16">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header + filter pills */}
        <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl text-brand">✨</span>
              <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
                Only For You
              </h2>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Personalized finds based on your browsing and verified seller
              ratings
            </p>
          </div>


        </div>

        {/* 6-col product grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
          {isLoading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <OnlyForYouSkeleton key={i} />
              ))
            : items.map((product) => (
                <ProductCard
                  key={product.id ?? product.slug}
                  product={product}
                />
              ))}
        </div>

        {/* Load more — appends next page inline; hidden when all loaded */}
        {hasMore && (
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-border-subtle bg-canvas-elevated px-9 py-3 text-sm font-bold text-text-primary transition-all hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? (
                <>
                  <span
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-subtle border-t-brand"
                    aria-hidden="true"
                  />
                  <span>Loading…</span>
                </>
              ) : (
                <>
                  <span>Load more</span>
                  <FaChevronDown className="text-xs text-brand" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}



function OnlyForYouSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
