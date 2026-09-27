import { useEffect, useState } from "react";
import { FaCheckCircle, FaStar } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Skeleton } from "../../components/common/Skeleton";
import { useToast } from "../../hooks/useToast";
import {
  fetchSellerProfile,
  updateSellerProfile,
} from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * Edit form for the seller's store profile. Mirrors the fields exposed
 * by SellerProfileUpdateSerializer: store branding, address, payout.
 *
 * Read-only summary at the top surfaces status & rating so the seller
 * always knows the public-facing facts about their shop.
 */
export function SellerStoreProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSellerProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setForm({
          store_name: data.store_name || "",
          description: data.description || "",
          store_logo: data.store_logo || "",
          store_banner: data.store_banner || "",
          business_name: data.business_name || "",
          business_type: data.business_type || "",
          trade_license_no: data.trade_license_no || "",
          address_line1: data.address_line1 || "",
          address_line2: data.address_line2 || "",
          city: data.city || "",
          district: data.district || "",
          area: data.area || "",
          country: data.country || "Bangladesh",
          bank_name: data.bank_name || "",
          bank_account_name: data.bank_account_name || "",
          bank_account_number: data.bank_account_number || "",
          mobile_banking_provider: data.mobile_banking_provider || "",
          mobile_banking_number: data.mobile_banking_number || "",
        });
      })
      .catch((err) => showToast({ type: "error", message: extractErrorMessage(err, "Could not load profile.") }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateSellerProfile(form);
      setProfile((prev) => ({ ...prev, ...updated }));
      showToast({ type: "success", message: "Store profile updated" });
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not save your profile.") });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Seller Center", to: "/seller" },
          { label: "Store Profile" },
        ]}
        className="mb-3"
      />
      <h1 className="mb-4 text-xl font-bold text-text-primary">Store profile</h1>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Status</p>
          <p className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-state-success">
            <FaCheckCircle /> {profile.status}
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Rating</p>
          <p className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-state-warning">
            <FaStar /> {Number(profile.average_rating || 0).toFixed(1)}{" "}
            <span className="text-xs text-text-secondary">({profile.review_count})</span>
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Followers</p>
          <p className="mt-1 text-base font-semibold text-text-primary">{profile.followers_count}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Products</p>
          <p className="mt-1 text-base font-semibold text-text-primary">{profile.product_count}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Storefront branding">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Store name" required value={form.store_name}
              onChange={(e) => set("store_name", e.target.value)} />
            <Input label="Store slug" disabled value={profile.store_slug}
              helper="Contact admin to change your slug" />
            <Input label="Logo URL" value={form.store_logo}
              onChange={(e) => set("store_logo", e.target.value)} />
            <Input label="Banner URL" value={form.store_banner}
              onChange={(e) => set("store_banner", e.target.value)} />
          </div>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-text-secondary">Description</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
        </Section>

        <Section title="Business information">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Business name" value={form.business_name}
              onChange={(e) => set("business_name", e.target.value)} />
            <Input label="Business type" value={form.business_type}
              onChange={(e) => set("business_type", e.target.value)} />
            <Input label="Trade license" value={form.trade_license_no}
              onChange={(e) => set("trade_license_no", e.target.value)} />
          </div>
        </Section>

        <Section title="Address">
          <Input label="Address line 1" value={form.address_line1}
            onChange={(e) => set("address_line1", e.target.value)} />
          <Input className="mt-3" label="Address line 2" value={form.address_line2}
            onChange={(e) => set("address_line2", e.target.value)} />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <Input label="District" value={form.district} onChange={(e) => set("district", e.target.value)} />
            <Input label="Area" value={form.area} onChange={(e) => set("area", e.target.value)} />
            <Input label="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
        </Section>

        <Section title="Payout">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Bank name" value={form.bank_name}
              onChange={(e) => set("bank_name", e.target.value)} />
            <Input label="Account name" value={form.bank_account_name}
              onChange={(e) => set("bank_account_name", e.target.value)} />
            <Input label="Account number" value={form.bank_account_number}
              onChange={(e) => set("bank_account_number", e.target.value)} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Mobile banking provider" placeholder="bKash / Nagad"
              value={form.mobile_banking_provider}
              onChange={(e) => set("mobile_banking_provider", e.target.value)} />
            <Input label="Mobile banking number" value={form.mobile_banking_number}
              onChange={(e) => set("mobile_banking_number", e.target.value)} />
          </div>
        </Section>

        <div className="flex justify-end">
          <Button type="submit" isLoading={saving}>Save store profile</Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-card">
      <h2 className="mb-3 text-base font-bold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}
