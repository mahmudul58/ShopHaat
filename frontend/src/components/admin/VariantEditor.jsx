import { useState } from "react";

import { createVariant, deleteVariant } from "../../services/catalogService";
import { extractErrorMessage } from "../../services/apiClient";
import { useToast } from "../../hooks/useToast";
import { Button } from "../common/Button";
import { Input } from "../common/Input";

const EMPTY_VARIANT = { sku: "", size: "", color: "", price_override: "", stock: 0 };

export function VariantEditor({ productSlug, variants, onChange }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_VARIANT);
  const [isSaving, setIsSaving] = useState(false);

  async function handleAdd(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...form, price_override: form.price_override || null };
      const created = await createVariant(productSlug, payload);
      onChange([...variants, created]);
      setForm(EMPTY_VARIANT);
    } catch (error) {
      showToast(extractErrorMessage(error, "Could not add this variant."), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(variantId) {
    try {
      await deleteVariant(productSlug, variantId);
      onChange(variants.filter((variant) => variant.id !== variantId));
    } catch (error) {
      showToast(extractErrorMessage(error, "Could not remove this variant."), "error");
    }
  }

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase text-text-muted">
              <th className="py-2">SKU</th>
              <th className="py-2">Size</th>
              <th className="py-2">Color</th>
              <th className="py-2">Stock</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id} className="border-b border-border-subtle/50">
                <td className="py-2 text-text-primary">{variant.sku}</td>
                <td className="py-2 text-text-secondary">{variant.size || "—"}</td>
                <td className="py-2 text-text-secondary">{variant.color || "—"}</td>
                <td className="py-2 text-text-secondary">{variant.stock}</td>
                <td className="py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(variant.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 rounded-xl border border-border-subtle bg-canvas-elevated p-4 sm:grid-cols-3">
        <Input label="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <Input label="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
        <Input label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        <Input
          label="Price override"
          type="number"
          step="0.01"
          value={form.price_override}
          onChange={(e) => setForm({ ...form, price_override: e.target.value })}
        />
        <Input
          label="Stock"
          type="number"
          min="0"
          required
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <div className="flex items-end">
          <Button type="submit" isLoading={isSaving} className="w-full">
            Add variant
          </Button>
        </div>
      </form>
    </div>
  );
}
