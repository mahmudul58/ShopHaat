import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaStore, FaCheckCircle, FaTimesCircle, FaBan } from "react-icons/fa";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Money } from "../../components/common/Money";
import { Skeleton } from "../../components/common/Skeleton";
import { useToast } from "../../hooks/useToast";
import { SELLER_STATUS_LABELS } from "../../utils/constants";
import {
  fetchAdminSellers,
  updateAdminSellerStatus,
} from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

/**
 * Admin seller management. Lists every seller with status + activity,
 * lets the admin filter by status and run inline approve/reject/suspend.
 * Click-through leads to a detail view (per-seller products + orders).
 */
export function AdminSellersPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  async function load(pageNumber = page) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSellers({
        status: status === "ALL" ? undefined : status,
        search: search || undefined,
        page: pageNumber,
        page_size: 12
      });
      setSellers(data.results || data || []);
      setTotalCount(data.count || (data.results || data || []).length);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load sellers."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  
  useEffect(() => {
    if (page > 1) {
      load(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function act(seller, nextStatus, reason = "") {
    setActing(seller.id);
    try {
      await updateAdminSellerStatus(seller.id, { status: nextStatus, reason });
      showToast({
        type: "success",
        message: `${seller.store_name} → ${SELLER_STATUS_LABELS[nextStatus]}`,
      });
      await load();
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not update.") });
    } finally {
      setActing(null);
    }
  }

  function handleAction(seller, nextStatus) {
    if (nextStatus === "REJECTED" || nextStatus === "SUSPENDED") {
      const reason = window.prompt(
        nextStatus === "REJECTED" ? "Reason for rejection?" : "Reason for suspension?"
      );
      if (reason === null) return;
      act(seller, nextStatus, reason);
    } else {
      act(seller, nextStatus);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin" }, { label: "Sellers" }]} className="mb-3" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Sellers</h1>
          <p className="text-xs text-text-secondary">Approve, reject, or suspend seller accounts.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border-subtle bg-surface-card p-2 shadow-card">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === s ? "bg-brand text-white" : "text-text-secondary hover:bg-canvas-elevated hover:text-text-primary"
              }`}
            >
              {s === "ALL" ? "All" : SELLER_STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by store name or email"
          className="w-full max-w-sm rounded-xl border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <Button size="sm" variant="secondary" onClick={load}>Search</Button>
      </div>

      {error ? (
        <ErrorState title="Could not load" description={error} />
      ) : loading ? (
        <Skeleton className="h-64 w-full" />
      ) : sellers.length === 0 ? (
        <EmptyState icon={FaStore} title="No sellers" description="No sellers match the current filter." />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-canvas-elevated text-left text-xs uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-right">Products</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-canvas-elevated/50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/sellers/${s.id}`} className="font-semibold text-text-primary hover:text-brand">
                        {s.store_name}
                      </Link>
                      <p className="text-xs text-text-secondary">/{s.store_slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text-secondary">{s.full_name || "—"}</p>
                      <p className="text-xs text-text-muted">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary">
                      <Money amount={s.total_sales || 0} />
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">{s.product_count}</td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "PENDING" && (
                        <div className="inline-flex gap-1">
                          <ActionBtn
                            tone="success"
                            loading={acting === s.id}
                            onClick={() => handleAction(s, "APPROVED")}
                            icon={FaCheckCircle}
                            label="Approve"
                          />
                          <ActionBtn
                            tone="danger"
                            loading={acting === s.id}
                            onClick={() => handleAction(s, "REJECTED")}
                            icon={FaTimesCircle}
                            label="Reject"
                          />
                        </div>
                      )}
                      {s.status === "APPROVED" && (
                        <ActionBtn
                          tone="warning"
                          loading={acting === s.id}
                          onClick={() => handleAction(s, "SUSPENDED")}
                          icon={FaBan}
                          label="Suspend"
                        />
                      )}
                      {s.status === "SUSPENDED" && (
                        <ActionBtn
                          tone="success"
                          loading={acting === s.id}
                          onClick={() => handleAction(s, "APPROVED")}
                          icon={FaCheckCircle}
                          label="Reactivate"
                        />
                      )}
                      {s.status === "REJECTED" && (
                        <ActionBtn
                          tone="success"
                          loading={acting === s.id}
                          onClick={() => handleAction(s, "APPROVED")}
                          icon={FaCheckCircle}
                          label="Approve"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
              className="rounded-lg border border-border-subtle bg-canvas px-4 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-elevated disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-text-secondary">
              Page {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || loading}
              className="rounded-lg border border-border-subtle bg-canvas px-4 py-2 text-sm font-semibold text-text-primary hover:bg-canvas-elevated disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const palette = {
    PENDING: "bg-state-warning/15 text-state-warning",
    APPROVED: "bg-state-success/15 text-state-success",
    REJECTED: "bg-state-danger/15 text-state-danger",
    SUSPENDED: "bg-canvas-elevated text-text-secondary",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${palette[status]}`}>
      {SELLER_STATUS_LABELS[status] || status}
    </span>
  );
}

function ActionBtn({ tone, onClick, icon: Icon, label, loading }) {
  const palette = {
    success: "border-state-success/30 bg-state-success/15 text-state-success hover:bg-state-success/25",
    danger: "border-state-danger/30 bg-state-danger/15 text-state-danger hover:bg-state-danger/25",
    warning: "border-state-warning/30 bg-state-warning/15 text-state-warning hover:bg-state-warning/25",
  };
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${palette[tone]} disabled:opacity-50`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
