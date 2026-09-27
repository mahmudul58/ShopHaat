import { useEffect, useState } from "react";

import { AdminOnly } from "../../components/admin/AdminOnly";
import { FlashSaleForm } from "../../components/admin/FlashSaleForm";
import { FlashSaleTable } from "../../components/admin/FlashSaleTable";
import { EmptyState } from "../../components/common/EmptyState";
import { confirm } from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { fetchFlashSales, createFlashSale, deleteFlashSale, addFlashSaleItem, deleteFlashSaleItem } from "../../services/flashSaleService";

export function AdminFlashSalesPage() {
  const { showToast } = useToast();
  const [flashSales, setFlashSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFlashSales()
      .then(setFlashSales)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(payload) {
    setIsSaving(true);
    try {
      const created = await createFlashSale(payload);
      setFlashSales((current) => [created, ...current]);
      showToast({ type: "success", message: "Flash Sale created" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not create flash sale."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id, name) {
    const ok = await confirm({
      title: "Delete flash sale?",
      message: `Permanently delete flash sale "${name}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteFlashSale(id);
      setFlashSales((current) => current.filter((sale) => sale.id !== id));
      showToast({ type: "success", message: "Flash sale deleted" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not delete this flash sale."),
      });
    }
  }

  async function handleAddItem(flashSaleId, payload) {
    try {
      const newItem = await addFlashSaleItem(flashSaleId, payload);
      setFlashSales((current) => current.map((sale) => {
        if (sale.id === flashSaleId) {
          return { ...sale, items: [...(sale.items || []), newItem] };
        }
        return sale;
      }));
      showToast({ type: "success", message: "Product added to flash sale" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not add product."),
      });
    }
  }

  async function handleRemoveItem(flashSaleId, itemId) {
    try {
      await deleteFlashSaleItem(flashSaleId, itemId);
      setFlashSales((current) => current.map((sale) => {
        if (sale.id === flashSaleId) {
          return { ...sale, items: sale.items.filter(item => item.id !== itemId) };
        }
        return sale;
      }));
      showToast({ type: "success", message: "Product removed" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not remove product."),
      });
    }
  }

  return (
    <AdminOnly>
      <div>
        <div className="mb-5">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
            Flash Sales
          </h1>
          <p className="text-xs text-text-secondary">
            {flashSales.length} active event{flashSales.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mb-8 max-w-2xl">
          <FlashSaleForm onSubmit={handleCreate} isSaving={isSaving} />
        </div>

        {isLoading ? (
          <FlashSaleTable flashSales={[]} isLoading onDelete={() => {}} />
        ) : flashSales.length === 0 ? (
          <EmptyState
            title="No flash sales yet"
            description="Create one above to get started."
          />
        ) : (
          <FlashSaleTable 
            flashSales={flashSales} 
            onDelete={handleDelete} 
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />
        )}
      </div>
    </AdminOnly>
  );
}
