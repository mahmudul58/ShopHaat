import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";

import { AdminOnly } from "../../components/admin/AdminOnly";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { Input, Select } from "../../components/common/Input";
import { Modal } from "../../components/common/Modal";
import { EmptyState } from "../../components/common/EmptyState";
import { confirm } from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import {
  createBrand,
  createCategory,
  createSubcategory,
  deleteBrand,
  deleteCategory,
  deleteSubcategory,
  fetchBrands,
  fetchCategories,
  fetchSubcategories,
  updateBrand,
  updateCategory,
  updateSubcategory,
} from "../../services/catalogService";

const TABS = [
  { key: "CATEGORY", label: "Categories" },
  { key: "SUBCATEGORY", label: "Subcategories" },
  { key: "BRAND", label: "Brands" },
];

/**
 * Admin Catalog page. Three sub-tabs (Categories | Subcategories |
 * Brands), each with a simple list-and-create pattern. Image upload
 * UX is intentionally URL-only for v1 (image/logo fields accept a URL).
 *
 * Note on cascade behavior:
 * - Deleting a Category cascades to its SubCategories and PROTECTs Products.
 * - Deleting a SubCategory PROTECTs Products that use it.
 * - Deleting a Brand PROTECTs Products that use it.
 * Backend error messages are surfaced verbatim — admins need to see
 * "products reference this" so they can clean up before retrying.
 */
export function AdminCatalogPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("CATEGORY");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [cats, subs, brs] = await Promise.all([
        fetchCategories(),
        fetchSubcategories(),
        fetchBrands(),
      ]);
      setCategories(cats || []);
      setSubcategories(subs || []);
      setBrands(brs || []);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load catalog."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyFormFor(tab));
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm(itemToForm(tab, item));
    setModalOpen(true);
  }

  function handleFormChange(key) {
    return (event) => {
      const value = key === "is_active" ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = formToPayload(tab, form);
      if (editing) {
        await updateFnFor(tab)(form.slug, payload);
        showToast({ type: "success", message: "Updated." });
      } else {
        await createFnFor(tab)(payload);
        showToast({ type: "success", message: "Created." });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not save.") });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item, label) {
    const ok = await confirm({
      title: `Delete ${label}?`,
      message: `Permanently delete "${item.name}"? If anything references it, the backend will refuse.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteFnFor(tab)(item.slug);
      showToast({ type: "success", message: "Deleted." });
      await load();
    } catch (err) {
      // Cascade errors come back as DRF 400 with helpful messages — let
      // them surface verbatim so admins know what to clean up first.
      showToast({ type: "error", message: extractErrorMessage(err, "Could not delete.") });
    }
  }

  return (
    <AdminOnly>
      <div>
        <Breadcrumbs items={[{ label: "Admin" }, { label: "Catalog" }]} className="mb-3" />
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Catalog</h1>
            <p className="text-xs text-text-secondary">
              Categories, subcategories, and brands that organize the storefront.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <FaPlus className="h-3 w-3" /> Add {tabLabel(tab).toLowerCase()}
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
                {countFor(t.key, categories, subcategories, brands)}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-card">
            <p className="text-sm text-text-secondary">Loading…</p>
          </div>
        ) : tab === "CATEGORY" ? (
          <SimpleTable
            items={categories}
            columns={[
              { key: "name", label: "Name", render: (c) => <span className="font-semibold text-text-primary">{c.name}</span> },
              { key: "subcategories", label: "Subcategories", render: (c) => <span className="text-xs text-text-secondary">{(c.subcategories ?? []).length}</span> },
              { key: "is_active", label: "Status", render: (c) => <StatusPill value={c.is_active} /> },
            ]}
            onEdit={openEdit}
            onDelete={(c) => handleDelete(c, "category")}
          />
        ) : tab === "SUBCATEGORY" ? (
          <SimpleTable
            items={subcategories}
            columns={[
              { key: "name", label: "Name", render: (s) => <span className="font-semibold text-text-primary">{s.name}</span> },
              { key: "slug", label: "Slug", render: (s) => <span className="font-mono text-xs text-text-secondary">{s.slug}</span> },
            ]}
            onEdit={openEdit}
            onDelete={(s) => handleDelete(s, "subcategory")}
          />
        ) : (
          <SimpleTable
            items={brands}
            columns={[
              { key: "name", label: "Name", render: (b) => <span className="font-semibold text-text-primary">{b.name}</span> },
              { key: "slug", label: "Slug", render: (b) => <span className="font-mono text-xs text-text-secondary">{b.slug}</span> },
            ]}
            onEdit={openEdit}
            onDelete={(b) => handleDelete(b, "brand")}
          />
        )}

        {modalOpen && (
          <Modal isOpen onClose={() => setModalOpen(false)} title={editing ? `Edit ${tabLabel(tab).toLowerCase()}` : `New ${tabLabel(tab).toLowerCase()}`} className="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                label="Name"
                name="name"
                value={form.name ?? ""}
                onChange={handleFormChange("name")}
                required
              />
              {!editing && (
                <Input
                  label="Slug"
                  name="slug"
                  value={form.slug ?? ""}
                  onChange={handleFormChange("slug")}
                  required
                  hint="URL-safe identifier (lowercase, dashes, no spaces)."
                />
              )}
              {tab === "CATEGORY" && (
                <Input
                  label="Image URL"
                  name="image"
                  value={form.image ?? ""}
                  onChange={handleFormChange("image")}
                  placeholder="https://…"
                />
              )}
              {tab === "CATEGORY" && (
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={handleFormChange("is_active")}
                    className="h-4 w-4 rounded border-border-subtle bg-canvas-elevated text-brand focus:ring-brand"
                  />
                  <span>Active</span>
                </label>
              )}
              {tab === "SUBCATEGORY" && (
                <Select
                  label="Parent category"
                  name="category"
                  value={form.category ?? ""}
                  onChange={handleFormChange("category")}
                  required
                  placeholder="Pick a category…"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              )}
              {tab === "BRAND" && (
                <Input
                  label="Logo URL"
                  name="logo"
                  value={form.logo ?? ""}
                  onChange={handleFormChange("logo")}
                  placeholder="https://…"
                />
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSaving}>
                  {editing ? "Save changes" : "Create"}
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
// Sub-components
// ──────────────────────────────────────────────────────────────────────────

function SimpleTable({ items, columns, onEdit, onDelete }) {
  if (!items || items.length === 0) {
    return <EmptyState title="Nothing here yet" description="Use the Add button to create your first item." />;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3">{c.label}</th>
            ))}
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-canvas-elevated/50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3">{c.render(item)}</td>
              ))}
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <Button size="xs" variant="secondary" onClick={() => onEdit(item)}>Edit</Button>
                  <Button size="xs" variant="ghost" onClick={() => onDelete(item)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ value }) {
  const cls = value
    ? "bg-state-success/15 text-state-success"
    : "bg-canvas-elevated text-text-secondary";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {value ? "Active" : "Inactive"}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function tabLabel(key) {
  return TABS.find((t) => t.key === key)?.label ?? key;
}

function countFor(key, cats, subs, brs) {
  if (key === "CATEGORY") return cats.length;
  if (key === "SUBCATEGORY") return subs.length;
  return brs.length;
}

function emptyFormFor(tab) {
  if (tab === "CATEGORY") return { name: "", slug: "", image: "", is_active: true };
  if (tab === "SUBCATEGORY") return { name: "", slug: "", category: "" };
  return { name: "", slug: "", logo: "" };
}

function itemToForm(tab, item) {
  if (tab === "CATEGORY") {
    return { name: item.name ?? "", image: item.image ?? "", is_active: item.is_active ?? true };
  }
  if (tab === "SUBCATEGORY") {
    return { name: item.name ?? "", category: item.category ?? "" };
  }
  return { name: item.name ?? "", logo: item.logo ?? "" };
}

function formToPayload(tab, form) {
  if (tab === "CATEGORY") {
    return {
      name: form.name,
      slug: form.slug || slugify(form.name),
      image: form.image || null,
      is_active: !!form.is_active,
    };
  }
  if (tab === "SUBCATEGORY") {
    return {
      name: form.name,
      slug: form.slug || slugify(form.name),
      category: Number(form.category),
    };
  }
  return {
    name: form.name,
    slug: form.slug || slugify(form.name),
    logo: form.logo || null,
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createFnFor(tab) {
  if (tab === "CATEGORY") return createCategory;
  if (tab === "SUBCATEGORY") return createSubcategory;
  return createBrand;
}

function updateFnFor(tab) {
  if (tab === "CATEGORY") return updateCategory;
  if (tab === "SUBCATEGORY") return updateSubcategory;
  return updateBrand;
}

function deleteFnFor(tab) {
  if (tab === "CATEGORY") return deleteCategory;
  if (tab === "SUBCATEGORY") return deleteSubcategory;
  return deleteBrand;
}
