import { useEffect, useState } from "react";
import { FaTrophy } from "react-icons/fa";

import { AdminOnly } from "../../components/admin/AdminOnly";
import { DataTable } from "../../components/admin/DataTable";
import { Select } from "../../components/common/Input";
import { Skeleton } from "../../components/common/Skeleton";
import { fetchAnalyticsSummary } from "../../services/analyticsService";
import { formatCurrency } from "../../utils/formatCurrency";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function AdminTopProductsPage() {
  const [period, setPeriod] = useState("monthly");
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchAnalyticsSummary(period)
      .then(setSummary)
      .finally(() => setIsLoading(false));
  }, [period]);

  return (
    <AdminOnly>
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl flex items-center gap-2">
              <FaTrophy className="text-brand" />
              Top Products
            </h1>
            <p className="text-xs text-text-secondary">
              Best selling products by revenue and units sold.
            </p>
          </div>
          <div className="w-40">
            <Select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              options={PERIODS}
            />
          </div>
        </div>

        {isLoading || !summary ? (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <DataTable
                columns={[
                  { key: "name", header: "Product" },
                  {
                    key: "units_sold",
                    header: "Units sold",
                    align: "right",
                    render: (row) => row.units_sold,
                  },
                  {
                    key: "revenue",
                    header: "Revenue",
                    align: "right",
                    render: (row) => (
                      <span className="font-semibold text-text-primary">{formatCurrency(row.revenue)}</span>
                    ),
                  },
                ]}
                rows={summary.top_products || []}
                rowKey="name"
                emptyMessage="No product sales in this window."
              />
            </section>
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
