import { useEffect, useState } from "react";

import { AddressBook } from "../../components/dashboard/AddressBook";
import { AddressForm } from "../../components/dashboard/AddressForm";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { Skeleton } from "../../components/common/Skeleton";
import { Modal } from "../../components/common/Modal";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { createAddress, deleteAddress, fetchAddresses, updateAddress } from "../../services/authService";

export function AddressesPage() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAddresses()
      .then(setAddresses)
      .finally(() => setIsLoading(false));
  }, []);

  function handleOpenAdd() {
    setEditingAddress(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(address) {
    setEditingAddress(address);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingAddress(null);
  }

  async function handleSave(form) {
    setIsSaving(true);
    try {
      if (editingAddress) {
        const updated = await updateAddress(editingAddress.id, form);
        setAddresses((current) => current.map((addr) => (addr.id === updated.id ? updated : addr)));
        showToast({ type: "success", message: "Address updated successfully" });
      } else {
        const created = await createAddress(form);
        setAddresses((current) => [...current, created]);
        showToast({ type: "success", message: "Address added successfully" });
      }
      handleCloseModal();
    } catch (error) {
      showToast({ type: "error", message: extractErrorMessage(error, "Could not save this address.") });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAddress(id);
      setAddresses((current) => current.filter((address) => address.id !== id));
      showToast({ type: "success", message: "Address removed" });
    } catch (error) {
      showToast({ type: "error", message: extractErrorMessage(error, "Could not remove this address.") });
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Addresses" },
        ]}
        className="mb-3"
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
            My Addresses
          </h1>
          <p className="text-xs text-text-secondary">
            {addresses.length} saved address{addresses.length === 1 ? "" : "es"}
          </p>
        </div>
        <Button onClick={handleOpenAdd}>Add new address</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : addresses.length === 0 ? (
        <EmptyState
          title="No addresses yet"
          description="Add a delivery address to make checkout faster."
          action={<Button onClick={handleOpenAdd}>Add your first address</Button>}
        />
      ) : (
        <AddressBook addresses={addresses} onDelete={handleDelete} onEdit={handleOpenEdit} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingAddress ? "Edit Delivery Address" : "Add Delivery Address"}
        className="max-w-4xl"
      >
        {isModalOpen && (
          <AddressForm
            initialValues={editingAddress || undefined}
            onSubmit={handleSave}
            onCancel={handleCloseModal}
            isSaving={isSaving}
          />
        )}
      </Modal>
    </div>
  );
}
