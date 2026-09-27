import { useEffect, useState } from "react";
import { FaCheckCircle, FaMoneyBillWave, FaHourglassHalf } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { useToast } from "../../hooks/useToast";
import {
  fetchAdminSettlements,
  fetchSettlementEligibility,
  generateSettlements,
  updateAdminSettlement,
} from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

const STATUS_FILTERS = ["ALL", "PENDING", "PROCESSING", "PAID", "ON_HOLD"];

/**
 * Admin settlement console. Lists every SellerSettlement across the
 * platform with totals. Can generate new settlements (rolled up by
 * period) and update status (PENDING → PROCESSING → PAID/ON_HOLD).
 */
export function AdminSettlementsPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState("ALL");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  // Live count of SellerOrders that are eligible for a new settlement
  // (DELIVERED + PENDING + not yet linked to any settlement). Drives
  // the badge on the Generate button and disables it when there's
  // nothing new to settle, so the user never wonders why 100 clicks
  // produced 100 duplicate rows.
  const [eligibleCount, setEligibleCount] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminSettlements();
      setItems(data || []);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load settlements."));
    } finally {
      setLoading(false);
    }
  }

  async function refreshEligibility() {
    try {
      const res = await fetchSettlementEligibility();
      setEligibleCount(Number(res?.eligible_count ?? 0));
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    load();
    refreshEligibility();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await generateSettlements();
      // The backend is now idempotent — only orders that aren't already
      // attached to a settlement get included. Tell the admin whether
      // anything actually happened, otherwise the button feels broken.
      const count = res?.count ?? 0;
      if (count === 0) {
        showToast({
          type: "info",
          message: "No new delivered orders to settle — every eligible order is already attached to a settlement.",
        });
      } else {
        showToast({ type: "success", message: `Generated ${count} settlement${count === 1 ? "" : "s"}` });
      }
      await load();
      await refreshEligibility();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not generate.") });
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatus(id, next) {
    try {
      await updateAdminSettlement(id, { status: next });
      showToast({ type: "success", message: `Settlement → ${next}` });
      setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status: next } : s)));
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update.") });
    }
  }

  const filtered = status === "ALL" ? items : items.filter((s) => s.status === status);

  const totals = items.reduce(
    (acc, s) => {
      acc.gross += Number(s.gross_amount || 0);
      acc.commission += Number(s.commission_amount || 0);
      acc.net += Number(s.net_amount || 0);
      if (s.status === "PAID") acc.paid += Number(s.net_amount || 0);
      else acc.pending += Number(s.net_amount || 0);
      return acc;
    },
    { gross: 0, commission: 0, net: 0, paid: 0, pending: 0 }
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin" }, { label: "Settlements" }]} className="mb-3" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Settlements</h1>
          <p className="text-xs text-text-secondary">Generate and manage seller payouts.</p>
        </div>
        <Button
          onClick={handleGenerate}
          isLoading={generating}
          disabled={eligibleCount === 0}
          title={
            eligibleCount === 0
              ? "No delivered orders are waiting for a settlement."
              : `${eligibleCount} delivered order${eligibleCount === 1 ? "" : "s"} ready to settle.`
          }
        >
          <FaMoneyBillWave className="h-3 w-3" /> Generate settlements
          {eligibleCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
              {eligibleCount} ready
            </span>
          )}
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={FaMoneyBillWave} label="Gross sales" value={totals.gross} accent="text-state-info" />
        <Tile icon={FaHourglassHalf} label="Marketplace commission" value={totals.commission} accent="text-state-danger" />
        <Tile icon={FaCheckCircle} label="Paid out" value={totals.paid} accent="text-state-success" />
        <Tile icon={FaHourglassHalf} label="Pending payout" value={totals.pending} accent="text-state-warning" />
      </div>

      <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-border-subtle bg-surface-card p-2 shadow-card">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === s ? "bg-brand text-white" : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState title="Could not load" description={error} />
      ) : loading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FaMoneyBillWave}
          title="No settlements"
          description={status === "ALL" ? "Generate one to get started." : `No ${status} settlements.`}
          action={
            status === "ALL" && (
              <Button
                onClick={handleGenerate}
                isLoading={generating}
                disabled={eligibleCount === 0}
                title={
                  eligibleCount === 0
                    ? "No delivered orders are waiting for a settlement yet."
                    : `${eligibleCount} delivered order${eligibleCount === 1 ? "" : "s"} ready to settle.`
                }
              >
                <FaMoneyBillWave className="h-3 w-3" /> Generate settlements
                {eligibleCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
                    {eligibleCount} ready
                  </span>
                )}
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-canvas-elevated/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text-primary">{s.seller_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {s.period_start} → {s.period_end}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">{s.seller_orders_count}</td>
                  <td className="px-4 py-3 text-right"><Money amount={s.gross_amount} /></td>
                  <td className="px-4 py-3 text-right text-state-danger"><Money amount={s.commission_amount} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary"><Money amount={s.net_amount} /></td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "PENDING" && (
                      <Button size="sm" variant="secondary" onClick={() => handleStatus(s.id, "PROCESSING")}>
                        Mark processing
                      </Button>
                    )}
                    {s.status === "PROCESSING" && (
                      <Button size="sm" onClick={() => handleStatus(s.id, "PAID")}>
                        Mark paid
                      </Button>
                    )}
                    {s.status === "PAID" && <span className="text-xs text-text-muted">Paid</span>}
                    {s.status === "ON_HOLD" && (
                      <Button size="sm" variant="secondary" onClick={() => handleStatus(s.id, "PROCESSING")}>
                        Release
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary">
        <Icon className={accent} /> {label}
      </div>
      <Money amount={value} className={`text-lg font-bold ${accent}`} />
    </div>
  );
}

function StatusPill({ status }) {
  const palette = {
    PENDING: "bg-state-warning/15 text-state-warning",
    PROCESSING: "bg-state-info/15 text-state-info",
    PAID: "bg-state-success/15 text-state-success",
    ON_HOLD: "bg-state-danger/15 text-state-danger",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${palette[status]}`}>
      {status}
    </span>
  );
}
