import { useEffect, useState } from "react";
import { FaBoxes, FaChartLine, FaShoppingCart } from "react-icons/fa";

import { AdminOnly } from "../../components/admin/AdminOnly";
import { DataTable } from "../../components/admin/DataTable";
import { Sparkline } from "../../components/admin/Sparkline";
import { StatCard } from "../../components/admin/StatCard";
import { Select } from "../../components/common/Input";
import { Skeleton } from "../../components/common/Skeleton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { fetchAnalyticsSummary } from "../../services/analyticsService";
import { formatCurrency } from "../../utils/formatCurrency";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState("daily");
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchAnalyticsSummary(period)
      .then(setSummary)
      .finally(() => setIsLoading(false));
  }, [period]);

  const totalRevenue =
    summary?.revenue_over_time.reduce((sum, row) => sum + Number(row.revenue || 0), 0) || 0;
  const totalOrders =
    summary?.orders_by_status.reduce((sum, row) => sum + row.count, 0) || 0;

  const sparkData = summary?.revenue_over_time?.map((row) => Number(row.revenue || 0)) || [];

  return (
    <AdminOnly>
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
              Dashboard
            </h1>
            <p className="text-xs text-text-secondary">
              Performance snapshot for the selected window.
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
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <StatCard
                label="Revenue"
                value={formatCurrency(totalRevenue)}
                icon={FaChartLine}
                accent="text-state-success"
              />
              <StatCard
                label="Orders"
                value={totalOrders}
                icon={FaShoppingCart}
                accent="text-state-info"
              />
            </div>

            {/* Revenue trend */}
            <section className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Revenue over time</h2>
                  <p className="text-xs text-text-secondary">Last {sparkData.length} periods</p>
                </div>
              </div>
              <Sparkline data={sparkData} width={800} />
            </section>

            {/* Orders by status */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Orders by status</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summary.orders_by_status.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-card p-3 shadow-card"
                  >
                    <StatusBadge status={row.status} />
                    <span className="text-lg font-bold text-text-primary">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>



            {/* Coupon usage */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Coupon usage</h2>
              <DataTable
                columns={[
                  {
                    key: "code",
                    header: "Code",
                    render: (row) => (
                      <span className="font-mono text-xs text-text-primary">{row.code}</span>
                    ),
                  },
                  {
                    key: "times_used",
                    header: "Times used",
                    align: "right",
                    render: (row) => row.times_used,
                  },
                ]}
                rows={summary.coupon_usage}
                rowKey="code"
                emptyMessage="No coupons used in this window."
              />
            </section>
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
