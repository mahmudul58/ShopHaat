import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";

import { AdminOnly } from "../../components/admin/AdminOnly";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { Input, Select } from "../../components/common/Input";
import { Modal } from "../../components/common/Modal";
import { EmptyState } from "../../components/common/EmptyState";
import { confirm } from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { fetchCategories } from "../../services/catalogService";
import {
  createMarketplaceCommission,
  deleteMarketplaceCommission,
  fetchAdminSellers,
  fetchEffectiveCommissionRate,
  fetchMarketplaceCommissions,
  fetchPlatformSettings,
  updateMarketplaceCommission,
} from "../../services/marketplaceService";

const TABS = [
  { key: "GLOBAL", label: "Global" },
  { key: "CATEGORY", label: "Category" },
  { key: "SELLER", label: "Seller" },
];

const EMPTY_FORM = {
  scope: "GLOBAL",
  category: "",
  seller: "",
  rate_percent: "",
  is_active: true,
};

/**
 * Admin Commissions page. Three tabs (Global | Category | Seller). The
 * global rule is a singleton — only one row allowed. Category and Seller
 * tabs support inline rate edit + a Modal for create/FK changes. The
 * preview panel at the bottom calls the `effective` action so admins
 * can verify which rule wins for a given (seller, category) pair.
 *
 * Note: the per-seller override on SellerProfile.commission_rate is
 * higher priority than any rule here — that's documented in the header.
 */
export function AdminCommissionsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("GLOBAL");
  const [commissions, setCommissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // rule being edited (FK change only)
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Inline rate edit state (separate from modal/form to keep interactions simple)
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineRate, setInlineRate] = useState("");

  // Preview panel state
  const [previewSellerId, setPreviewSellerId] = useState("");
  const [previewCategoryId, setPreviewCategoryId] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rules, cats, sels, settings] = await Promise.all([
        fetchMarketplaceCommissions(),
        fetchCategories(),
        fetchAdminSellers().catch(() => []),
        fetchPlatformSettings().catch(() => null),
      ]);
      setCommissions(Array.isArray(rules) ? rules : (rules?.results ?? []));
      setCategories(Array.isArray(cats) ? cats : (cats?.results ?? []));
      // `fetchAdminSellers` returns the array directly, but be defensive
      // in case the API ever returns a paginated envelope.
      setSellers(Array.isArray(sels) ? sels : (sels?.results ?? []));
      setPlatformSettings(settings);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load commissions."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rulesByScope = useMemo(() => {
    const grouped = { GLOBAL: [], CATEGORY: [], SELLER: [] };
    commissions.forEach((c) => {
      if (grouped[c.scope]) grouped[c.scope].push(c);
    });
    return grouped;
  }, [commissions]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, scope: tab });
    setModalOpen(true);
  }

  function openEdit(rule) {
    setEditing(rule);
    setForm({
      scope: rule.scope,
      category: rule.category ?? "",
      seller: rule.seller ?? "",
      rate_percent: rule.rate_percent,
      is_active: rule.is_active,
    });
    setModalOpen(true);
  }

  function handleFormChange(key) {
    return (event) => {
      const value = key === "is_active" ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };
  }

  async function handleSubmitForm(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = buildPayload(form);
      if (editing) {
        await updateMarketplaceCommission(editing.id, payload);
        showToast({ type: "success", message: "Rule updated." });
      } else {
        await createMarketplaceCommission(payload);
        showToast({ type: "success", message: "Rule created." });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not save rule.") });
    } finally {
      setIsSaving(false);
    }
  }

  function startInlineEdit(rule) {
    setInlineEditingId(rule.id);
    setInlineRate(rule.rate_percent);
  }

  function cancelInlineEdit() {
    setInlineEditingId(null);
    setInlineRate("");
  }

  async function commitInlineEdit(rule) {
    if (inlineRate === rule.rate_percent) {
      cancelInlineEdit();
      return;
    }
    try {
      await updateMarketplaceCommission(rule.id, { rate_percent: inlineRate });
      showToast({ type: "success", message: "Rate updated." });
      await load();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update rate.") });
    } finally {
      setInlineEditingId(null);
    }
  }

  async function handleDelete(rule) {
    const label = ruleLabel(rule);
    const ok = await confirm({
      title: "Delete rule?",
      message: `Permanently delete the ${rule.scope} rule "${label}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMarketplaceCommission(rule.id);
      showToast({ type: "success", message: "Rule deleted." });
      await load();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not delete rule.") });
    }
  }

  async function runPreview() {
    if (!previewSellerId) {
      showToast({ type: "info", message: "Pick a seller to preview." });
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await fetchEffectiveCommissionRate({
        sellerId: previewSellerId,
        categoryId: previewCategoryId || null,
      });
      setPreview(result);
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not load preview.") });
    } finally {
      setPreviewLoading(false);
    }
  }

  const tabRules = rulesByScope[tab] || [];

  return (
    <AdminOnly>
      <div>
        <Breadcrumbs items={[{ label: "Admin" }, { label: "Commissions" }]} className="mb-3" />
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Commissions</h1>
            <p className="text-xs text-text-secondary">
              Define the marketplace fee rules. A seller's profile commission rate (set on
              their store profile) overrides every rule below.
            </p>
          </div>
          <Button onClick={openCreate} size="sm">
            <FaPlus className="h-3 w-3" /> Add rule
          </Button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-state-danger/30 bg-state-danger/10 p-3 text-sm text-state-danger">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border-subtle bg-surface-card p-2 shadow-card">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.key ? "bg-brand text-white" : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
              }`}
            >
              {t.label}{" "}
              <span className={`ml-1 rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-white/25 text-white" : "bg-canvas-elevated text-text-secondary"}`}>
                {rulesByScope[t.key]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <p className="text-sm text-text-secondary">Loading…</p>
          </div>
        ) : tab === "GLOBAL" ? (
          <GlobalTab
            rules={tabRules}
            fallbackRate={platformSettings?.default_commission_rate}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={handleDelete}
            inlineEditingId={inlineEditingId}
            inlineRate={inlineRate}
            setInlineRate={setInlineRate}
            startInlineEdit={startInlineEdit}
            commitInlineEdit={commitInlineEdit}
            cancelInlineEdit={cancelInlineEdit}
          />
        ) : (
          <RulesTable
            rules={tabRules}
            scope={tab}
            categories={categories}
            sellers={sellers}
            onEdit={openEdit}
            onDelete={handleDelete}
            onAdd={openCreate}
            inlineEditingId={inlineEditingId}
            inlineRate={inlineRate}
            setInlineRate={setInlineRate}
            startInlineEdit={startInlineEdit}
            commitInlineEdit={commitInlineEdit}
            cancelInlineEdit={cancelInlineEdit}
          />
        )}

        <PreviewPanel
          sellers={sellers}
          categories={categories}
          sellerId={previewSellerId}
          setSellerId={setPreviewSellerId}
          categoryId={previewCategoryId}
          setCategoryId={setPreviewCategoryId}
          preview={preview}
          loading={previewLoading}
          onRun={runPreview}
        />

        {modalOpen && (
          <Modal isOpen onClose={() => setModalOpen(false)} title={editing ? "Edit rule" : "New rule"} className="max-w-lg">
            <form onSubmit={handleSubmitForm} className="space-y-3">
              <Select
                label="Scope"
                name="scope"
                value={form.scope}
                onChange={handleFormChange("scope")}
                disabled={!!editing}
                hint={editing ? "Scope can't be changed after creation." : "Pick the rule's scope."}
              >
                <option value="GLOBAL">Global</option>
                <option value="CATEGORY">Category</option>
                <option value="SELLER">Seller</option>
              </Select>
              {form.scope === "CATEGORY" && (
                <Select
                  label="Category"
                  name="category"
                  value={form.category}
                  onChange={handleFormChange("category")}
                  required
                  placeholder="Pick a category…"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              )}
              {form.scope === "SELLER" && (
                <Select
                  label="Seller"
                  name="seller"
                  value={form.seller}
                  onChange={handleFormChange("seller")}
                  required
                  placeholder="Pick a seller…"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </Select>
              )}
              <Input
                label="Rate (%)"
                name="rate_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.rate_percent}
                onChange={handleFormChange("rate_percent")}
                required
              />
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleFormChange("is_active")}
                  className="h-4 w-4 rounded border-border-subtle bg-canvas-elevated text-brand focus:ring-brand"
                />
                <span>Active</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSaving}>
                  {editing ? "Save changes" : "Create rule"}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AdminOnly>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-views
// ──────────────────────────────────────────────────────────────────────────

function GlobalTab({
  rules, fallbackRate, onCreate, onEdit, onDelete,
  inlineEditingId, inlineRate, setInlineRate, startInlineEdit, commitInlineEdit, cancelInlineEdit,
}) {
  const rule = rules[0]; // at most one GLOBAL row (enforced by backend)
  if (!rule) {
    return (
      <EmptyState
        title="No global commission rule"
        description={
          fallbackRate
            ? `Fallback of ${fallbackRate}% is in use. Create an explicit rule to make it visible and editable.`
            : "Create a global rule to set the marketplace-wide commission."
        }
        action={
          <Button size="sm" onClick={onCreate}>
            <FaPlus className="h-3 w-3" /> Create global rule
          </Button>
        }
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
          <tr>
            <th className="px-4 py-3">Scope</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          <tr className="hover:bg-canvas-elevated/50">
            <td className="px-4 py-3 font-semibold text-text-primary">Global</td>
            <td className="px-4 py-3">
              {inlineEditingId === rule.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={inlineRate}
                    onChange={(e) => setInlineRate(e.target.value)}
                    className="w-24 rounded-lg border border-border-subtle bg-canvas-elevated px-2 py-1 text-sm text-text-primary focus:border-brand focus:outline-none"
                    autoFocus
                  />
                  <span className="text-xs text-text-secondary">%</span>
                </div>
              ) : (
                <span className="font-mono text-base font-bold text-text-primary">{rule.rate_percent}%</span>
              )}
            </td>
            <td className="px-4 py-3">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                rule.is_active ? "bg-state-success/15 text-state-success" : "bg-canvas-elevated text-text-secondary"
              }`}>
                {rule.is_active ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              {inlineEditingId === rule.id ? (
                <div className="inline-flex gap-1">
                  <Button size="xs" variant="secondary" onClick={() => commitInlineEdit(rule)}>Save</Button>
                  <Button size="xs" variant="ghost" onClick={cancelInlineEdit}>Cancel</Button>
                </div>
              ) : (
                <div className="inline-flex gap-1">
                  <Button size="xs" variant="secondary" onClick={() => startInlineEdit(rule)}>Edit rate</Button>
                  <Button size="xs" variant="ghost" onClick={() => onDelete(rule)}>Delete</Button>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RulesTable({
  rules, scope, categories, sellers, onEdit, onDelete, onAdd,
  inlineEditingId, inlineRate, setInlineRate, startInlineEdit, commitInlineEdit, cancelInlineEdit,
}) {
  if (rules.length === 0) {
    return (
      <EmptyState
        title={`No ${scope.toLowerCase()} rules`}
        description={`Create a ${scope.toLowerCase()} rule to override the default commission for ${scope === "CATEGORY" ? "products in a specific category" : "a specific seller"}.`}
        action={
          <Button size="sm" onClick={onAdd}>
            <FaPlus className="h-3 w-3" /> Add {scope.toLowerCase()} rule
          </Button>
        }
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
          <tr>
            <th className="px-4 py-3">{scope === "CATEGORY" ? "Category" : "Seller"}</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rules.map((rule) => {
            const targetName = scope === "CATEGORY"
              ? categories.find((c) => c.id === rule.category)?.name || rule.category
              : sellers.find((s) => s.id === rule.seller)?.store_name || rule.seller;
            return (
              <tr key={rule.id} className="hover:bg-canvas-elevated/50">
                <td className="px-4 py-3 font-semibold text-text-primary">{targetName}</td>
                <td className="px-4 py-3">
                  {inlineEditingId === rule.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={inlineRate}
                        onChange={(e) => setInlineRate(e.target.value)}
                        className="w-24 rounded-lg border border-border-subtle bg-canvas-elevated px-2 py-1 text-sm text-text-primary focus:border-brand focus:outline-none"
                        autoFocus
                      />
                      <span className="text-xs text-text-secondary">%</span>
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-text-primary">{rule.rate_percent}%</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    rule.is_active ? "bg-state-success/15 text-state-success" : "bg-canvas-elevated text-text-secondary"
                  }`}>
                    {rule.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {inlineEditingId === rule.id ? (
                    <div className="inline-flex gap-1">
                      <Button size="xs" variant="secondary" onClick={() => commitInlineEdit(rule)}>Save</Button>
                      <Button size="xs" variant="ghost" onClick={cancelInlineEdit}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="inline-flex gap-1">
                      <Button size="xs" variant="secondary" onClick={() => startInlineEdit(rule)}>Edit rate</Button>
                      <Button size="xs" variant="ghost" onClick={() => onEdit(rule)}>Edit FK</Button>
                      <Button size="xs" variant="ghost" onClick={() => onDelete(rule)}>Delete</Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PreviewPanel({
  sellers, categories, sellerId, setSellerId, categoryId, setCategoryId,
  preview, loading, onRun,
}) {
  return (
    <div className="mt-6 rounded-xl border border-border-subtle bg-surface-card p-5 shadow-card">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-secondary">
        Preview resolved rate
      </h2>
      <p className="mb-3 text-xs text-text-secondary">
        Pick a seller (and optionally a category) to see which commission rule wins and why.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Seller" name="preview_seller" value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="Pick a seller…">
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.store_name}</option>
          ))}
        </Select>
        <Select label="Category (optional)" name="preview_category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Any category">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button onClick={onRun} isLoading={loading}>
            <FaSearch className="h-3 w-3" /> Resolve
          </Button>
        </div>
      </div>
      {preview && !loading && (
        <div className="mt-4 rounded-xl border border-border-subtle bg-canvas-elevated p-4">
          <p className="text-sm text-text-secondary">
            Effective rate:{" "}
            <span className="font-mono text-2xl font-bold text-text-primary">{preview.rate_percent}%</span>
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {preview.seller_overrides
              ? "Won by: seller's profile commission rate (highest priority)"
              : "Won by: marketplace rule (category → seller → global → fallback)"}
          </p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function ruleLabel(rule) {
  if (rule.scope === "GLOBAL") return "Global";
  if (rule.scope === "CATEGORY") return `Category #${rule.category}`;
  if (rule.scope === "SELLER") return `Seller #${rule.seller}`;
  return `Rule #${rule.id}`;
}

function buildPayload(form) {
  const out = {
    scope: form.scope,
    rate_percent: form.rate_percent,
    is_active: form.is_active,
  };
  if (form.scope === "CATEGORY") {
    out.category = Number(form.category);
    out.seller = null;
  } else if (form.scope === "SELLER") {
    out.seller = Number(form.seller);
    out.category = null;
  } else {
    out.category = null;
    out.seller = null;
  }
  return out;
}
