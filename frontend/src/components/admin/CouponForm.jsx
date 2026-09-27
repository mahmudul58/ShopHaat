import { useState } from "react";

import { Button } from "../common/Button";
import { Input } from "../common/Input";

const EMPTY_COUPON = {
  code: "", discount_type: "PERCENTAGE", discount_value: "", max_discount_amount: "",
  min_order_amount: "0", usage_limit_total: "", usage_limit_per_user: "",
  valid_from: "", valid_to: "", is_active: true,
};

export function CouponForm({ onSubmit, isSaving }) {
  const [form, setForm] = useState(EMPTY_COUPON);

  function handleChange(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      max_discount_amount: form.max_discount_amount || null,
      usage_limit_total: form.usage_limit_total || null,
      usage_limit_per_user: form.usage_limit_per_user || null,
    });
    setForm(EMPTY_COUPON);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-border-subtle bg-canvas-elevated p-4 sm:grid-cols-2">
      <Input label="Code" required value={form.code} onChange={handleChange("code")} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text-secondary">Discount type</span>
        <select
          value={form.discount_type}
          onChange={handleChange("discount_type")}
          className="w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED_AMOUNT">Fixed amount</option>
        </select>
      </label>

      <Input label="Discount value" type="number" step="0.01" required value={form.discount_value} onChange={handleChange("discount_value")} />
      <Input label="Max discount (percentage only)" type="number" step="0.01" value={form.max_discount_amount} onChange={handleChange("max_discount_amount")} />
      <Input label="Minimum order amount" type="number" step="0.01" value={form.min_order_amount} onChange={handleChange("min_order_amount")} />
      <Input label="Total usage limit" type="number" min="0" value={form.usage_limit_total} onChange={handleChange("usage_limit_total")} />
      <Input label="Per-user usage limit" type="number" min="0" value={form.usage_limit_per_user} onChange={handleChange("usage_limit_per_user")} />
      <Input label="Valid from" type="datetime-local" required value={form.valid_from} onChange={handleChange("valid_from")} />
      <Input label="Valid to" type="datetime-local" required value={form.valid_to} onChange={handleChange("valid_to")} />

      <label className="flex items-center gap-2 text-sm text-text-secondary sm:col-span-2">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-border-subtle bg-canvas-elevated text-brand focus:ring-brand" />
        Active
      </label>

      <div className="sm:col-span-2">
        <Button type="submit" isLoading={isSaving}>Create coupon</Button>
      </div>
    </form>
  );
}
