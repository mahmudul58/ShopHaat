import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

import { FaStore, FaStar } from "react-icons/fa";

import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ErrorState } from "../components/common/ErrorState";
import { ProductDetailSkeleton } from "../components/common/Skeleton";
import { SEO } from "../components/common/SEO";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductInfo } from "../components/product/ProductInfo";
import { ProductTabs } from "../components/product/ProductTabs";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useToast } from "../hooks/useToast";
import { extractErrorMessage } from "../services/apiClient";
import * as catalogService from "../services/catalogService";

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingProduct(true);
    setLoadError(null);
    setProduct(null);
    setSelectedVariant(null);
    setReviews([]);

    catalogService
      .fetchProductBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
          setSelectedVariant(data.variants?.[0] || null);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, "Could not load this product."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProduct(false);
      });

    setIsLoadingReviews(true);
    catalogService
      .fetchProductReviews(slug)
      .then((data) => {
        if (!cancelled) setReviews(data.results || data || []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReviews(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setIsAdding(true);
    try {
      await addItem(selectedVariant.id, quantity);
      showToast({ type: "success", message: "Item added to the cart" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not add to cart."),
      });
    } finally {
      setIsAdding(false);
    }
  }

  async function handleBuyNow() {
    if (!selectedVariant) return;
    try {
      await addItem(selectedVariant.id, quantity);
      navigate("/checkout");
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not proceed to checkout."),
      });
    }
  }

  async function handleSubmitReview(payload) {
    await catalogService.submitProductReview(slug, payload);
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <ErrorState
          title="Product not found"
          description={loadError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (isLoadingProduct || !product) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <ProductDetailSkeleton />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Home", to: "/" },
    { label: "Catalog", to: "/catalog" },
  ];
  if (product.subcategory?.category?.name) {
    breadcrumbItems.push({
      label: product.subcategory.category.name,
      to: `/catalog?category=${product.subcategory.category.slug}`,
    });
  }
  if (product.subcategory?.name) {
    breadcrumbItems.push({
      label: product.subcategory.name,
      to: `/catalog?subcategory=${product.subcategory.slug}`,
    });
  }
  breadcrumbItems.push({ label: product.name });

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <SEO 
        title={product.name} 
        description={product.short_description || product.description?.substring(0, 150)} 
      />
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <ProductGallery
          images={product.images}
          selectedVariantId={selectedVariant?.id}
        />
        <ProductInfo
          product={product}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
          quantity={quantity}
          onQuantityChange={setQuantity}
          isAdding={isAdding}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      </div>

      <div className="mt-12">
        <ProductTabs
          product={product}
          reviews={reviews}
          isLoadingReviews={isLoadingReviews}
          onSubmitReview={handleSubmitReview}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Seller card */}
      {product.seller?.store_slug && (
        <div className="mt-12">
          <Link
            to={`/stores/${product.seller.store_slug}`}
            className="flex items-center gap-3 rounded-xl border border-border-subtle bg-canvas-elevated p-4 transition-colors hover:border-brand/50"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
              {product.seller.store_logo ? (
                <img src={product.seller.store_logo} alt="" className="h-full w-full object-cover" />
              ) : (
                <FaStore className="text-brand text-2xl" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold uppercase tracking-wider text-text-muted">
                Sold by
              </p>
              <p className="truncate text-lg font-bold text-text-primary">
                {product.seller.store_name}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-secondary">
                <FaStar className="text-amber-400" />
                {Number(product.seller.average_rating || 0).toFixed(1)} ({product.seller.review_count})
              </p>
            </div>
            <span className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
              Visit store
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}