import { Button } from "../common/Button";
import { DataTable } from "./DataTable";
import { Money } from "../common/Money";

export function CouponTable({ coupons, onDelete, isLoading }) {
  return (
    <DataTable
      isLoading={isLoading}
      rows={coupons}
      rowKey="id"
      emptyMessage="No coupons yet."
      columns={[
        {
          key: "code",
          header: "Code",
          render: (row) => (
            <span className="font-mono font-semibold text-text-primary">{row.code}</span>
          ),
        },
        {
          key: "discount",
          header: "Discount",
          render: (row) =>
            row.discount_type === "PERCENTAGE"
              ? `${row.discount_value}%`
              : <Money amount={row.discount_value} />,
        },
        {
          key: "min_order_amount",
          header: "Min order",
          render: (row) => <Money amount={row.min_order_amount} />,
        },
        {
          key: "valid_to",
          header: "Valid until",
          render: (row) => new Date(row.valid_to).toLocaleDateString(),
        },
        {
          key: "is_active",
          header: "Active",
          render: (row) =>
            row.is_active ? (
              <span className="rounded bg-state-success/15 px-2 py-0.5 text-xs font-medium text-state-success">
                Active
              </span>
            ) : (
              <span className="rounded bg-canvas-elevated px-2 py-0.5 text-xs font-medium text-text-secondary">
                Disabled
              </span>
            ),
        },
        {
          key: "actions",
          header: "",
          align: "right",
          render: (row) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.id, row.code)}
            >
              Delete
            </Button>
          ),
        },
      ]}
    />
  );
}
