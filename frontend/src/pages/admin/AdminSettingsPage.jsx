import { useEffect, useState } from "react";

import { AdminOnly } from "../../components/admin/AdminOnly";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { useToast } from "../../hooks/useToast";
import {
  fetchPlatformSettings,
  updatePlatformSettings,
} from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

const EMPTY_FORM = {
  default_commission_rate: "",
  shipping_fee_dhaka: "",
  shipping_fee_other: "",
  free_shipping_threshold: "",
  payout_minimum: "",
  currency_code: "BDT",
  currency_symbol: "৳",
  site_name: "",
  site_tagline: "",
  support_email: "",
  support_phone: "",
};

const FIELD_DEFS = [
  { key: "default_commission_rate", label: "Default commission rate (%)", type: "number", step: "0.01", min: "0", max: "100", section: "Commerce", hint: "Used as last-resort fallback when no seller/category/global rule applies.", required: true },
  { key: "shipping_fee_dhaka", label: "Shipping fee — Dhaka (BDT)", type: "number", step: "0.01", min: "0", section: "Commerce", required: true },
  { key: "shipping_fee_other", label: "Shipping fee — outside Dhaka (BDT)", type: "number", step: "0.01", min: "0", section: "Commerce", required: true },
  { key: "free_shipping_threshold", label: "Free shipping threshold (BDT)", type: "number", step: "0.01", min: "0", section: "Commerce", placeholder: "Leave blank to disable" },
  { key: "payout_minimum", label: "Minimum payout (BDT)", type: "number", step: "0.01", min: "0", section: "Commerce", hint: "Sellers can't withdraw less than this amount." },
  { key: "currency_code", label: "Currency code", section: "Display", required: true, maxLength: 8 },
  { key: "currency_symbol", label: "Currency symbol", section: "Display", required: true, maxLength: 8 },
  { key: "site_name", label: "Site name", section: "Display", required: true, maxLength: 120 },
  { key: "site_tagline", label: "Site tagline", section: "Display", maxLength: 255 },
  { key: "support_email", label: "Support email", type: "email", section: "Support" },
  { key: "support_phone", label: "Support phone", section: "Support", maxLength: 40 },
];

const SECTIONS = ["Commerce", "Display", "Support"];

/**
 * Admin Settings page. Drives the PlatformSettings singleton — defaults
 * for commission rate and shipping fees live here, plus site identity
 * and support contact info. The Settings page is intentionally read-mostly:
 * dirty-state guard prevents accidentally re-sending the same payload.
 */
export function AdminSettingsPage() {
  const { showToast } = useToast();
  const [loaded, setLoaded] = useState(null); // server snapshot for dirty-state comparison
  const [form, setForm] = useState(EMPTY_FORM);
  const [meta, setMeta] = useState({ updated_at: null, updated_by_email: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPlatformSettings()
      .then((data) => {
        if (cancelled) return;
        const flat = {
          default_commission_rate: data.default_commission_rate ?? "",
          shipping_fee_dhaka: data.shipping_fee_dhaka ?? "",
          shipping_fee_other: data.shipping_fee_other ?? "",
          free_shipping_threshold: data.free_shipping_threshold ?? "",
          payout_minimum: data.payout_minimum ?? "",
          currency_code: data.currency_code ?? "",
          currency_symbol: data.currency_symbol ?? "",
          site_name: data.site_name ?? "",
          site_tagline: data.site_tagline ?? "",
          support_email: data.support_email ?? "",
          support_phone: data.support_phone ?? "",
        };
        setLoaded(flat);
        setForm(flat);
        setMeta({
          updated_at: data.updated_at ?? null,
          updated_by_email: data.updated_by_email ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        showToast({ type: "error", message: extractErrorMessage(err, "Could not load settings.") });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function handleChange(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  }

  function isDirty() {
    if (!loaded) return false;
    return FIELD_DEFS.some((def) => String(form[def.key] ?? "") !== String(loaded[def.key] ?? ""));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      // Only send changed fields — keeps the payload small and avoids
      // wiping values the user didn't touch.
      const payload = {};
      FIELD_DEFS.forEach((def) => {
        const before = loaded?.[def.key] ?? "";
        const after = form[def.key] ?? "";
        if (String(after) !== String(before)) {
          payload[def.key] = def.type === "number" && after !== "" ? Number(after).toFixed(2) : after;
        }
      });
      const updated = await updatePlatformSettings(payload);
      const flat = {
        default_commission_rate: updated.default_commission_rate ?? "",
        shipping_fee_dhaka: updated.shipping_fee_dhaka ?? "",
        shipping_fee_other: updated.shipping_fee_other ?? "",
        free_shipping_threshold: updated.free_shipping_threshold ?? "",
        payout_minimum: updated.payout_minimum ?? "",
        currency_code: updated.currency_code ?? "",
        currency_symbol: updated.currency_symbol ?? "",
        site_name: updated.site_name ?? "",
        site_tagline: updated.site_tagline ?? "",
        support_email: updated.support_email ?? "",
        support_phone: updated.support_phone ?? "",
      };
      setLoaded(flat);
      setForm(flat);
      setMeta({
        updated_at: updated.updated_at ?? null,
        updated_by_email: updated.updated_by_email ?? null,
      });
      showToast({ type: "success", message: "Settings saved." });
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not save settings.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminOnly>
      <div>
        <Breadcrumbs items={[{ label: "Admin" }, { label: "Settings" }]} className="mb-3" />
        <div className="mb-4">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Platform Settings</h1>
          <p className="text-xs text-text-secondary">
            Default commission rate, shipping fees, currency, and support contact info.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <p className="text-sm text-text-secondary">Loading…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {SECTIONS.map((section) => (
              <section
                key={section}
                className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-card"
              >
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-text-secondary">
                  {section}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {FIELD_DEFS.filter((f) => f.section === section).map((def) => (
                    <Input
                      key={def.key}
                      label={def.label}
                      name={def.key}
                      value={form[def.key] ?? ""}
                      onChange={handleChange(def.key)}
                      type={def.type || "text"}
                      step={def.step}
                      min={def.min}
                      max={def.max}
                      required={def.required}
                      maxLength={def.maxLength}
                      placeholder={def.placeholder}
                      hint={def.hint}
                    />
                  ))}
                </div>
              </section>
            ))}

            <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
              <p className="text-xs text-text-secondary">
                {meta.updated_at
                  ? `Last updated ${new Date(meta.updated_at).toLocaleString()}${meta.updated_by_email ? ` by ${meta.updated_by_email}` : ""}`
                  : "No previous save on record."}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!isDirty() || saving}
                  onClick={() => setForm(loaded || EMPTY_FORM)}
                >
                  Discard
                </Button>
                <Button type="submit" size="sm" isLoading={saving} disabled={!isDirty()}>
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AdminOnly>
  );
}
