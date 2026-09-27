import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ImageManager } from "../../components/admin/ImageManager";
import { ProductForm } from "../../components/admin/ProductForm";
import { VariantEditor } from "../../components/admin/VariantEditor";
import { Skeleton } from "../../components/common/Skeleton";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { createProduct, fetchProductBySlug, updateProduct } from "../../services/catalogService";

export function AdminProductFormPage() {
  const { slug } = useParams();
  const isEditMode = Boolean(slug);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      fetchProductBySlug(slug)
        .then(setProduct)
        .finally(() => setIsLoading(false));
    }
  }, [slug, isEditMode]);

  async function handleSubmit(formValues) {
    setIsSaving(true);
    const payload = { ...formValues, brand: formValues.brand || null };
    try {
      if (isEditMode) {
        const updated = await updateProduct(slug, payload);
        showToast("Product updated.", "success");
        // The slug may have changed — refresh from the (possibly new) slug.
        navigate(`/admin/products/${updated.slug}/edit`, { replace: true });
      } else {
        const created = await createProduct(payload);
        showToast("Product created — now add variants and images below.", "success");
        navigate(`/admin/products/${created.slug}/edit`, { replace: true });
      }
    } catch (error) {
      showToast(extractErrorMessage(error, "Could not save this product."), "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditMode && isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const initialValues = product
    ? {
        name: product.name,
        slug: product.slug,
        description: product.description,
        subcategory: product.subcategory?.id ?? "",
        brand: product.brand?.id ?? "",
        base_price: product.base_price,
        is_active: product.is_active,
      }
    : undefined;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">{isEditMode ? "Edit product" : "New product"}</h1>

      <ProductForm initialValues={initialValues} onSubmit={handleSubmit} isSaving={isSaving} />

      {isEditMode && product && (
        <>
          <div className="mt-10 max-w-xl">
            <h2 className="mb-3 text-lg font-semibold text-text-primary">Variants</h2>
            <VariantEditor
              productSlug={slug}
              variants={product.variants}
              onChange={(variants) => setProduct({ ...product, variants })}
            />
          </div>

          <div className="mt-10 max-w-xl">
            <h2 className="mb-3 text-lg font-semibold text-text-primary">Images</h2>
            <ImageManager
              productSlug={slug}
              images={product.images}
              onChange={(images) => setProduct({ ...product, images })}
            />
          </div>
        </>
      )}
    </div>
  );
}
