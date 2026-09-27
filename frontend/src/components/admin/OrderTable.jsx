import { Link } from "react-router-dom";

import { DataTable } from "./DataTable";
import { StatusBadge } from "../common/StatusBadge";
import { formatCurrency } from "../../utils/formatCurrency";

export function OrderTable({ orders, isLoading }) {
  return (
    <DataTable
      isLoading={isLoading}
      rows={orders}
      rowKey="order_number"
      emptyMessage="No orders yet."
      columns={[
        {
          key: "order_number",
          header: "Order #",
          render: (row) => (
            <span className="font-mono font-semibold text-text-primary">
              {row.order_number}
            </span>
          ),
        },
        { key: "customer_email", header: "Customer" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
        {
          key: "grand_total",
          header: "Total",
          align: "right",
          render: (row) => (
            <span className="font-semibold text-text-primary">{formatCurrency(row.grand_total)}</span>
          ),
        },
        {
          key: "placed_at",
          header: "Placed",
          render: (row) => new Date(row.placed_at).toLocaleDateString(),
        },
        {
          key: "actions",
          header: "",
          align: "right",
          render: (row) => (
            <Link
              to={`/admin/orders/${row.order_number}`}
              className="font-medium text-brand hover:underline"
            >
              Manage →
            </Link>
          ),
        },
      ]}
    />
  );
}
