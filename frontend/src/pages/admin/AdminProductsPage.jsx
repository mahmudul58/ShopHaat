import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ProductTable } from "../../components/admin/ProductTable";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { confirm } from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { deleteProduct, fetchProducts } from "../../services/catalogService";

export function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadProducts(page);
  }, [page]);

  function loadProducts(pageNumber) {
    setIsLoading(true);
    fetchProducts({ page: pageNumber, page_size: 12 })
      .then((data) => {
        setProducts(data.results || data);
        setTotalCount(data.count || (data.results || data).length);
        setHasNext(!!data.next);
        setHasPrev(!!data.previous);
      })
      .finally(() => setIsLoading(false));
  }

  async function handleDelete(slug, name) {
    const ok = await confirm({
      title: "Delete product?",
      message: `Permanently delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteProduct(slug);
      setProducts((current) => current.filter((product) => product.slug !== slug));
      showToast({ type: "success", message: "Product deleted" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not delete this product."),
      });
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
            Products
          </h1>
          <p className="text-xs text-text-secondary">
            {totalCount} product{totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button>New product</Button>
        </Link>
      </div>

      {isLoading ? (
        <ProductTable products={[]} isLoading />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create your first product to populate the catalog."
        />
      ) : (
        <div className="space-y-4">
          <ProductTable products={products} onDelete={handleDelete} />
          
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

