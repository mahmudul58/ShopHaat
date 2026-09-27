import { useEffect, useState } from "react";
import { FaPlus, FaMapMarkerAlt, FaCheck, FaEdit, FaTrash } from "react-icons/fa";

import { Modal } from "../../common/Modal";
import { Skeleton } from "../../common/Skeleton";
import { Button } from "../../common/Button";
import { AddressForm } from "../../dashboard/AddressForm";
import { confirm } from "../../common/ConfirmDialog";
import { extractErrorMessage } from "../../../services/apiClient";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from "../../../services/authService";
import { useToast } from "../../../hooks/useToast";

/**
 * Step 1 — Delivery Address.
 *
 * Dark-theme variant: surface-card rows with saffron selected state.
 */
export function AddressStep({ selectedAddress, onSelect, onChange }) {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAddresses()
      .then((data) => {
        setAddresses(data);
        if (data.length > 0 && !selectedAddress) {
          const def = data.find((a) => a.is_default) || data[0];
          onSelect(def);
        }
        onChange?.(data);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditingAddress(null);
    setIsModalOpen(true);
  }

  function openEdit(addr) {
    setEditingAddress(addr);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingAddress(null);
  }

  async function handleDelete(addr) {
    const ok = await confirm({
      title: "Delete address?",
      message: `Remove "${addr.label || "this address"}" from your saved addresses?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteAddress(addr.id);
      const next = addresses.filter((a) => a.id !== addr.id);
      setAddresses(next);
      onChange?.(next);
      if (selectedAddress?.id === addr.id) {
        onSelect(next[0] || null);
      }
      showToast({ type: "success", message: "Address deleted" });
    } catch (err) {
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Could not delete this address."),
      });
    }
  }

  async function handleSave(form) {
    setIsSaving(true);
    try {
      let saved;
      if (editingAddress) {
        saved = await updateAddress(editingAddress.id, form);
        showToast({ type: "success", message: "Address updated" });
      } else {
        saved = await createAddress(form);
        showToast({ type: "success", message: "Address added" });
      }
      const next = (() => {
        const exists = addresses.some((a) => a.id === saved.id);
        return exists
          ? addresses.map((a) => (a.id === saved.id ? saved : a))
          : [...addresses, saved];
      })();
      setAddresses(next);
      onSelect(saved);
      onChange?.(next);
      closeModal();
    } catch (err) {
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Could not save address."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Delivery Address
          </h3>
          <p className="text-xs text-text-secondary">
            {selectedAddress
              ? "Delivering to the address below."
              : "Pick or add an address to continue."}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={openAdd}>
          <FaPlus className="h-3 w-3" /> Add new
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-canvas-elevated p-8 text-center">
          <FaMapMarkerAlt className="mx-auto h-10 w-10 text-text-muted" />
          <p className="mt-3 text-sm font-medium text-text-secondary">
            No saved addresses yet
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Add one now to continue to checkout.
          </p>
          <Button onClick={openAdd} className="mt-4">
            <FaPlus className="h-3 w-3" /> Add Address
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((addr) => {
            const selected = selectedAddress?.id === addr.id;
            return (
              <li
                key={addr.id}
                className={`relative rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-brand bg-brand/10"
                    : "border-border-subtle bg-canvas-elevated hover:border-brand/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Selection radio — its own click target. */}
                  <button
                    type="button"
                    onClick={() => onSelect(addr)}
                    aria-label={`Select ${addr.label || "address"}`}
                    aria-pressed={selected}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-border-strong bg-canvas-elevated hover:border-brand"
                    }`}
                  >
                    {selected && <FaCheck className="h-2.5 w-2.5" />}
                  </button>

                  <div className="flex-1 cursor-pointer" onClick={() => onSelect(addr)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-primary">
                        {addr.label || "Address"}
                      </span>
                      {addr.is_default && (
                        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">{addr.full_name}</span>
                      <span className="text-text-muted"> · </span>
                      <span>{addr.phone}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city},{" "}
                      {addr.state} {addr.postal_code}
                    </p>
                  </div>

                  {/* Action buttons — separate click targets. */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      aria-label={`Edit ${addr.label || "address"}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-brand/15"
                    >
                      <FaEdit className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr)}
                      aria-label={`Delete ${addr.label || "address"}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-state-danger hover:bg-state-danger/10"
                    >
                      <FaTrash className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAddress ? "Edit Delivery Address" : "Add Delivery Address"}
        className="max-w-3xl"
      >
        {isModalOpen && (
          <AddressForm
            initialValues={editingAddress || undefined}
            onSubmit={handleSave}
            onCancel={closeModal}
            isSaving={isSaving}
          />
        )}
      </Modal>
    </div>
  );
}
