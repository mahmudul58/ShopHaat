import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaTrash, FaUpload, FaStar } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Skeleton } from "../../components/common/Skeleton";
import { Money } from "../../components/common/Money";
import { useToast } from "../../hooks/useToast";
import * as catalogService from "../../services/catalogService";
import { fetchCategories, fetchBrands } from "../../services/catalogService";
import { apiClient, extractErrorMessage } from "../../services/apiClient";

/**
 * Seller product create/edit form. Includes multi-image upload with
 * primary-image selection and reorder.
 *
 * Reuses the staff/admin's /products/ + nested /variants/ + /images/
 * endpoints — sellers are authorised by the backend as owners.
 */
export function SellerProductFormPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { showToast } = useToast();
  const isEditing = Boolean(slug);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    base_price: "",
    discount_percent: "0",
    sku: "",
    subcategory: "",
    brand: "",
    status: "ACTIVE",
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  useEffect(() => {
    Promise.all([fetchCategories(), fetchBrands()]).then(([c, b]) => {
      setCategories(c.results || c);
      setBrands(b.results || b);
    });
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setLoading(false);
      return;
    }
    setLoading(true);
    catalogService
      .fetchProductBySlug(slug)
      .then((data) => {
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          description: data.description || "",
          short_description: data.short_description || "",
          base_price: data.base_price || "",
          discount_percent: data.discount_percent || "0",
          sku: data.sku || "",
          subcategory: data.subcategory?.id || "",
          brand: data.brand?.id || "",
          status: data.status || "ACTIVE",
        });
        setVariants(data.variants || []);
        setImages(data.images || []);
      })
      .catch((err) => showToast({ type: "error", message: extractErrorMessage(err, "Could not load.") }))
      .finally(() => setLoading(false));
  }, [slug, isEditing, showToast]);

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 280);
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let brandId = form.brand;
      const selectedCategoryId = categories.find(c => c.subcategories.some(s => s.id === Number(form.subcategory)))?.id;
      
      if (brandId === "other" && newBrandName.trim()) {
        const brandPayload = {
          name: newBrandName,
          slug: slugify(newBrandName),
          categories: selectedCategoryId ? [selectedCategoryId] : []
        };
        const createdBrand = await apiClient.post("/brands/", brandPayload);
        brandId = createdBrand.id;
        setBrands(prev => [...prev, createdBrand]);
        set("brand", String(brandId));
      }

      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description,
        short_description: form.short_description,
        base_price: form.base_price,
        discount_percent: form.discount_percent || "0",
        sku: form.sku,
        subcategory: form.subcategory ? Number(form.subcategory) : null,
        brand: brandId && brandId !== "other" ? Number(brandId) : null,
        status: form.status,
      };
      let productSlug;
      if (isEditing) {
        await catalogService.updateProduct(slug, payload);
        productSlug = payload.slug || slug;
      } else {
        const created = await catalogService.createProduct(payload);
        productSlug = created.slug;
      }
      showToast({ type: "success", message: "Product saved" });
      navigate(`/seller/products/${productSlug}/edit`);
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not save product.") });
    } finally {
      setSaving(false);
    }
  }

  // ──── variants ────
  async function addVariant() {
    const productSlug = form.slug || slug;
    if (!productSlug) {
      showToast({ type: "error", message: "Save the product first to add variants." });
      return;
    }
    const sku = `${slugify(form.name || "variant").slice(0, 12)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    try {
      const created = await catalogService.createVariant(productSlug, {
        sku,
        size: "",
        color: "",
        price_override: null,
        stock: 0,
      });
      setVariants((prev) => [...prev, created]);
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not add variant.") });
    }
  }

  async function updateVariant(variantId, patch) {
    try {
      const updated = await catalogService.updateVariant(form.slug || slug, variantId, patch);
      setVariants((prev) => prev.map((v) => (v.id === variantId ? updated : v)));
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update variant.") });
    }
  }

  async function deleteVariant(variantId) {
    if (!window.confirm("Delete this variant?")) return;
    try {
      await catalogService.deleteVariant(form.slug || slug, variantId);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not delete variant.") });
    }
  }

  // ──── images ────
  async function handleImageUpload(e) {
    let files = Array.from(e.target.files || []);
    if (!files.length) return;
    const productSlug = form.slug || slug;
    if (!productSlug) {
      showToast({ type: "error", message: "Save the product first to add images." });
      return;
    }
    
    if (images.length >= 5) {
      showToast({ type: "error", message: "Maximum of 5 images allowed." });
      e.target.value = "";
      return;
    }

    if (images.length + files.length > 5) {
      showToast({ type: "warning", message: "Only up to 5 images can be added. The rest will be ignored." });
      files = files.slice(0, 5 - images.length);
    }

    for (const file of files) {
      try {
        const created = await catalogService.uploadProductImage(productSlug, file);
        setImages((prev) => [...prev, created]);
      } catch (err) {
        showToast({ type: "error", message: extractErrorMessage(err, "Image upload failed.") });
      }
    }
    e.target.value = "";
  }

  async function deleteImage(imageId) {
    if (!window.confirm("Delete this image?")) return;
    try {
      await catalogService.deleteProductImage(form.slug || slug, imageId);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not delete image.") });
    }
  }

  async function markPrimary(imageId) {
    try {
      const updated = await apiClient.patch(
        `/products/${form.slug || slug}/images/${imageId}/`,
        { is_primary: true }
      );
      setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.id === imageId })));
      void updated;
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not mark primary.") });
    }
  }

  // ──── render ────
  // useMemo MUST run before any early return, otherwise React's rules of
  // hooks are violated on the render where `loading` flips and the
  // component throws "Rendered fewer hooks than expected". This was the
  // cause of the seller add-product page crash on first visit.
  const allSubcategories = useMemo(
    () => categories.flatMap((c) => (c.subcategories || []).map((s) => ({ ...s, category: c }))),
    [categories]
  );

  const selectedCategoryId = useMemo(() => {
    if (!form.subcategory) return null;
    return categories.find(c => c.subcategories.some(s => s.id === Number(form.subcategory)))?.id || null;
  }, [categories, form.subcategory]);

  const filteredBrands = useMemo(() => {
    if (!selectedCategoryId) return [];
    return brands.filter(b => b.categories?.includes(selectedCategoryId));
  }, [brands, selectedCategoryId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Seller Center", to: "/seller" },
          { label: "Products", to: "/seller/products" },
          { label: isEditing ? form.name || slug : "New product" },
        ]}
        className="mb-3"
      />

      <h1 className="mb-4 text-xl font-bold text-text-primary">
        {isEditing ? `Edit · ${form.name}` : "New product"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Basic info">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Name" required value={form.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!isEditing) set("slug", slugify(e.target.value));
              }}
            />
            <Input label="Slug" required value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
            <Input label="SKU" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            <Input label="Base price" type="number" step="0.01" required value={form.base_price}
              onChange={(e) => set("base_price", e.target.value)}
            />
            <Input label="Discount (%)" type="number" step="0.01" value={form.discount_percent}
              onChange={(e) => set("discount_percent", e.target.value)}
            />
            <label className="block">
              <span className="text-sm font-medium text-text-secondary">Status</span>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text-secondary">Subcategory</span>
              <select
                required
                value={form.subcategory}
                onChange={(e) => set("subcategory", e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">Select…</option>
                {allSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.category.name} / {s.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text-secondary">Brand</span>
              <select
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">None</option>
                {filteredBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                <option value="other">Other...</option>
              </select>
              {form.brand === "other" && (
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  required
                />
              )}
            </label>
          </div>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-text-secondary">Short summary (Optional)</span>
            <span className="text-xs text-text-muted block mb-1">A quick highlight shown in product cards and search results.</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              placeholder="e.g. Ultra-fast charging cable with braided design."
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-text-secondary">Detailed description</span>
            <span className="text-xs text-text-muted block mb-1">Full product specifications, features, and details.</span>
            <textarea
              rows={5}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Enter comprehensive product details here..."
            />
          </label>
          <div className="mt-3 flex justify-end">
            <Button type="submit" isLoading={saving}>{isEditing ? "Save changes" : "Create product"}</Button>
          </div>
        </Section>

        {/* Variants */}
        <Section
          title="Variants"
          action={isEditing && <Button size="sm" type="button" onClick={addVariant}>+ Add variant</Button>}
        >
          {!isEditing ? (
            <p className="text-sm text-text-secondary">Please save the product first to add variants.</p>
          ) : variants.length === 0 ? (
            <p className="text-sm text-text-secondary">No variants yet. Add one to start selling.</p>
          ) : (
            <ul className="space-y-2">
              {variants.map((v) => (
                <li key={v.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border-subtle bg-canvas-elevated p-3 sm:grid-cols-6">
                  <input
                    className="rounded border border-border-subtle bg-surface-card px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                    placeholder="SKU"
                    defaultValue={v.sku}
                    onBlur={(e) => updateVariant(v.id, { sku: e.target.value })}
                  />
                  <input
                    className="rounded border border-border-subtle bg-surface-card px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                    placeholder="Size"
                    defaultValue={v.size || ""}
                    onBlur={(e) => updateVariant(v.id, { size: e.target.value })}
                  />
                  <input
                    className="rounded border border-border-subtle bg-surface-card px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                    placeholder="Color"
                    defaultValue={v.color || ""}
                    onBlur={(e) => updateVariant(v.id, { color: e.target.value })}
                  />
                  <input
                    type="number"
                    className="rounded border border-border-subtle bg-surface-card px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                    placeholder="Stock"
                    defaultValue={v.stock}
                    onBlur={(e) => updateVariant(v.id, { stock: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="rounded border border-border-subtle bg-surface-card px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                    placeholder="Extra Price"
                    defaultValue={v.price_override || ""}
                    onBlur={(e) => updateVariant(v.id, { price_override: e.target.value ? Number(e.target.value) : null })}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => deleteVariant(v.id)}
                      className="rounded p-1 text-state-danger hover:bg-state-danger/15"
                      aria-label="Delete variant"
                    >
                      <FaTrash className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Images */}
        <Section title="Images">
          {!isEditing ? (
            <p className="text-sm text-text-secondary">Please save the product first to upload images.</p>
          ) : (
            <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border-subtle bg-canvas-elevated p-6 transition-colors hover:border-brand">
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              <div className="flex flex-col items-center gap-2 text-text-secondary">
                <FaUpload />
                <span className="text-sm font-medium">Click to upload images</span>
                <span className="text-xs text-text-muted">First uploaded is primary by default.</span>
              </div>
            </label>
          )}
          {images.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {images.map((img) => (
                <li key={img.id} className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-card">
                  <img src={img.url} alt="" className="aspect-square w-full object-contain" />
                  {img.is_primary && (
                    <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                      <FaStar className="h-2 w-2" /> Primary
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-1 p-1">
                    {!img.is_primary && (
                      <button type="button" onClick={() => markPrimary(img.id)} className="rounded p-1 text-xs text-brand hover:bg-brand/15">
                        Set primary
                      </button>
                    )}
                    <button type="button" onClick={() => deleteImage(img.id)} className="ml-auto rounded p-1 text-state-danger hover:bg-state-danger/15">
                      <FaTrash className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </form>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
