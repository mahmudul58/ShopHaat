import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaFilter, FaTimes } from "react-icons/fa";

import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Button } from "../components/common/Button";
import { MobileDrawer } from "../components/common/MobileDrawer";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { FilterSidebar } from "../components/product/FilterSidebar";
import { ProductGrid } from "../components/product/ProductGrid";
import { SortDropdown } from "../components/product/SortDropdown";
import { fetchBrands, fetchCategories, fetchProducts } from "../services/catalogService";

const PAGE_SIZE = 12;

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const filters = Object.fromEntries(searchParams.entries());
  const page = Number(filters.page || 1);
  const sort = filters.ordering || "-created_at";
  const search = filters.search || "";
  const categorySlug = filters.category || "";
  const subcategorySlug = filters.subcategory || "";

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const activeSubcategory = activeCategory?.subcategories?.find(
    (s) => s.slug === subcategorySlug
  );

  useEffect(() => {
    fetchBrands().then(setBrands).catch(() => setBrands([]));
    fetchCategories().then((data) => setCategories(data.results || data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchProducts({ ...filters, page, page_size: PAGE_SIZE })
      .then((data) => {
        setProducts(data.results || []);
        setCount(data.count || 0);
      })
      .catch((err) => {
        setProducts([]);
        setCount(0);
        setLoadError(err?.message || "Could not load products.");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  function updateFilters(nextFilters) {
    const cleaned = Object.fromEntries(
      Object.entries(nextFilters).filter(
        ([, value]) => value !== "" && value !== undefined && value !== false
      )
    );
    setSearchParams({ ...cleaned, page: "1" });
  }

  function updateSort(value) {
    setSearchParams({ ...filters, ordering: value, page: "1" });
  }

  function updatePage(nextPage) {
    setSearchParams({ ...filters, page: String(nextPage) });
  }

  function clearSearch() {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("search");
      p.set("page", "1");
      return p;
    });
  }

  const breadcrumbItems = [{ label: "Home", to: "/" }, { label: "Catalog", to: "/catalog" }];
  let pageTitle = "All Products";
  let pageSubtitle = "";
  if (search) {
    pageTitle = `Search results for "${search}"`;
    pageSubtitle = `${count} product${count === 1 ? "" : "s"} found`;
  } else if (activeSubcategory) {
    pageTitle = activeSubcategory.name;
    breadcrumbItems.push(
      { label: activeCategory.name, to: `/catalog?category=${activeCategory.slug}` },
      { label: activeSubcategory.name }
    );
  } else if (activeCategory) {
    pageTitle = activeCategory.name;
    breadcrumbItems.push({ label: activeCategory.name });
  } else {
    pageSubtitle = `${count} product${count === 1 ? "" : "s"} available`;
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const activeFilterCount = [
    filters.brand,
    filters.min_price,
    filters.max_price,
    filters.min_rating,
    filters.in_stock,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Breadcrumbs items={breadcrumbItems} className="mb-3" />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="mt-1 text-sm text-text-secondary">{pageSubtitle}</p>
          )}
        </div>
        {search && (
          <Button variant="secondary" size="sm" onClick={clearSearch}>
            <FaTimes className="h-3 w-3" /> Clear search
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Desktop filters */}
        <div className="hidden w-64 shrink-0 lg:block">
          <FilterSidebar filters={filters} onChange={updateFilters} brands={brands} />
        </div>

        {/* Mobile filter trigger */}
        <div className="lg:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
          >
            <FaFilter /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-text-secondary">
              {isLoading ? "Loading..." : `${count} products`}
            </p>
            <SortDropdown value={sort} onChange={updateSort} />
          </div>

          {loadError ? (
            <ErrorState
              title="Couldn't load products"
              description={loadError}
              onRetry={() => {
                setSearchParams(searchParams);
              }}
            />
          ) : !isLoading && products.length === 0 ? (
            <EmptyState
              title="No products match your filters"
              description="Try removing some filters or searching for something else."
              action={
                <Button variant="secondary" onClick={() => updateFilters({
                  brand: "",
                  min_price: "",
                  max_price: "",
                  min_rating: "",
                  in_stock: "",
                })}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <ProductGrid products={products} isLoading={isLoading} />
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={updatePage}
                />
              )}
            </>
          )}
        </div>
      </div>

      <MobileDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filters"
      >
        <div className="p-4">
          <FilterSidebar
            filters={filters}
            onChange={(next) => {
              updateFilters(next);
              setIsMobileFilterOpen(false);
            }}
            brands={brands}
          />
        </div>
      </MobileDrawer>
    </div>
  );
}
