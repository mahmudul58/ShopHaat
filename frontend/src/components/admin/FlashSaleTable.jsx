import { FaTrash, FaPlus, FaTimes } from "react-icons/fa";
import { useState } from "react";
import { DataTable } from "./DataTable";

export function FlashSaleTable({ flashSales, isLoading, onDelete, onAddItem, onRemoveItem }) {
  const [expandedSale, setExpandedSale] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  const columns = [
    { header: "Name", accessor: "name" },
    { 
      header: "Status", 
      accessor: (s) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${s.is_active ? 'bg-state-success/10 text-state-success' : 'bg-text-muted/10 text-text-muted'}`}>
          {s.is_active ? "Active" : "Inactive"}
        </span>
      ) 
    },
    { 
      header: "Starts", 
      accessor: (s) => new Date(s.start_time).toLocaleString() 
    },
    { 
      header: "Ends", 
      accessor: (s) => new Date(s.end_time).toLocaleString() 
    },
    { 
      header: "Items", 
      accessor: (s) => `${s.items?.length || 0} items`
    },
    {
      header: "",
      accessor: (s) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setExpandedSale(expandedSale === s.id ? null : s.id)}
            className="text-xs font-bold text-brand hover:underline"
          >
            {expandedSale === s.id ? "Close Items" : "Manage Items"}
          </button>
          <button
            onClick={() => onDelete(s.id, s.name)}
            className="rounded p-1.5 text-text-muted hover:bg-state-danger/10 hover:text-state-danger"
            title="Delete flash sale"
          >
            <FaTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={flashSales} isLoading={isLoading} />
      
      {expandedSale && (
        <div className="rounded-xl border border-border-subtle bg-surface-card p-5 mt-4">
          <h3 className="mb-4 text-sm font-bold text-text-primary">Manage Items</h3>
          
          <form 
            className="mb-4 flex items-end gap-3 rounded-lg border border-border-subtle bg-canvas p-3"
            onSubmit={(e) => {
              e.preventDefault();
              onAddItem(expandedSale, { product_id: productSearch, discount_percentage: discountPercent });
              setProductSearch("");
              setDiscountPercent("");
            }}
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-text-secondary">Product ID</label>
              <input 
                required
                type="number" 
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Product ID (e.g. 1)"
                className="w-full rounded-md border border-border-subtle px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-text-secondary">Discount %</label>
              <input 
                required
                type="number" 
                step="0.01"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="e.g. 20.00"
                className="w-full rounded-md border border-border-subtle px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <button 
              type="submit"
              className="flex items-center gap-2 rounded-md bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-hover"
            >
              <FaPlus className="h-3 w-3" /> Add Product
            </button>
          </form>
          
          <div className="space-y-2">
            {flashSales.find(s => s.id === expandedSale)?.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-text-primary">{item.product_details?.name || `Product #${item.product_id}`}</span>
                  <span className="rounded bg-state-success/10 px-2 py-0.5 text-[10px] font-bold text-state-success">-{item.discount_percentage}%</span>
                </div>
                <button 
                  onClick={() => onRemoveItem(expandedSale, item.id)}
                  className="text-text-muted hover:text-state-danger"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            {flashSales.find(s => s.id === expandedSale)?.items?.length === 0 && (
              <div className="py-4 text-center text-xs text-text-muted">No items in this flash sale yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
