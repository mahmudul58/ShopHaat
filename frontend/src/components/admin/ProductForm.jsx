import { useEffect, useState } from "react";

import { fetchBrands, fetchCategories } from "../../services/catalogService";
import { Button } from "../common/Button";
import { Input } from "../common/Input";

const EMPTY_PRODUCT = {
  name: "", slug: "", description: "", subcategory: "", brand: "", base_price: "", is_active: true,
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProductForm({ initialValues, onSubmit, isSaving }) {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, ...initialValues });
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues?.slug));

  useEffect(() => {
    fetchCategories().then((categories) => {
      setSubcategories(categories.flatMap((category) => category.subcategories.map((sub) => ({ ...sub, categoryName: category.name }))));
    });
    fetchBrands().then(setBrands);
  }, []);

  function handleNameChange(event) {
    const name = event.target.value;
    setForm((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }));
  }

  function handleChange(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
      className="max-w-xl space-y-4"
    >
      <Input label="Product name" required value={form.name} onChange={handleNameChange} />
      <Input
        label="Slug"
        required
        value={form.slug}
        onChange={(event) => {
          setSlugTouched(true);
          setForm({ ...form, slug: event.target.value });
        }}
      />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text-secondary">Subcategory</span>
        <select
          required
          value={form.subcategory}
          onChange={handleChange("subcategory")}
          className="w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Select a subcategory</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.categoryName} / {sub.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text-secondary">Brand</span>
        <select
          value={form.brand}
          onChange={handleChange("brand")}
          className="w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">No brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text-secondary">Description</span>
        <textarea
          value={form.description}
          onChange={handleChange("description")}
          rows={4}
          className="w-full rounded-xl border border-border-subtle bg-canvas-elevated p-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <Input
        label="Base price"
        type="number"
        step="0.01"
        min="0"
        required
        value={form.base_price}
        onChange={handleChange("base_price")}
      />

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          className="h-4 w-4 rounded border-border-subtle bg-canvas-elevated text-brand focus:ring-brand"
        />
        Visible to customers
      </label>

      <Button type="submit" isLoading={isSaving}>
        Save product
      </Button>
    </form>
  );
}
