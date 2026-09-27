import { Link } from "react-router-dom";

import { DataTable } from "./DataTable";
import { Button } from "../common/Button";
import { Money } from "../common/Money";

export function ProductTable({ products, onDelete, isLoading }) {
  return (
    <DataTable
      isLoading={isLoading}
      rows={products}
      rowKey="id"
      emptyMessage="No products yet."
      columns={[
        {
          key: "name",
          header: "Name",
          render: (row) => (
            <Link
              to={`/admin/products/${row.slug}/edit`}
              className="font-medium text-text-primary hover:text-brand"
            >
              {row.name}
            </Link>
          ),
        },
        {
          key: "brand",
          header: "Brand",
          render: (row) => row.brand?.name || "—",
        },
        {
          key: "price",
          header: "Price",
          align: "right",
          render: (row) => (
            <Money amount={row.min_price ?? row.base_price} className="font-semibold" />
          ),
        },
        {
          key: "in_stock",
          header: "Status",
          render: (row) =>
            row.in_stock ? (
              <span className="rounded bg-state-success/15 px-2 py-0.5 text-xs font-medium text-state-success">
                In stock
              </span>
            ) : (
              <span className="rounded bg-state-danger/15 px-2 py-0.5 text-xs font-medium text-state-danger">
                Out of stock
              </span>
            ),
        },
        {
          key: "actions",
          header: "",
          align: "right",
          render: (row) => (
            <div className="flex justify-end gap-2">
              <Link to={`/admin/products/${row.slug}/edit`}>
                <Button variant="secondary" size="sm">Edit</Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(row.slug, row.name)}
              >
                Delete
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
}
