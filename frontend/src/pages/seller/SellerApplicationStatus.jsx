import { FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaBan } from "react-icons/fa";
import { Link } from "react-router-dom";

import { Button } from "../../components/common/Button";
import { SELLER_STATUS_LABELS } from "../../utils/constants";

/**
 * Friendly status screen shown when the seller's profile is pending /
 * rejected / suspended. No dashboard access — only the application info.
 *
 * Dark-theme variant.
 */
export function SellerApplicationStatus({ profile }) {
  const status = profile.status;
  const variant = {
    PENDING: {
      icon: FaHourglassHalf,
      color: "text-state-warning",
      bg: "bg-state-warning/15",
      title: "Your seller application is under review",
      body: "We've received your application and a marketplace admin will review it shortly. You'll get full seller access once approved.",
    },
    APPROVED: {
      icon: FaCheckCircle,
      color: "text-state-success",
      bg: "bg-state-success/15",
      title: "Your seller account is approved!",
      body: "You can now access the seller dashboard, manage products, and receive orders.",
    },
    REJECTED: {
      icon: FaTimesCircle,
      color: "text-state-danger",
      bg: "bg-state-danger/15",
      title: "Your seller application has been rejected",
      body: "Please update your information and apply again, or contact marketplace support.",
    },
    SUSPENDED: {
      icon: FaBan,
      color: "text-state-danger",
      bg: "bg-state-danger/15",
      title: "Your seller account has been suspended",
      body: "Your seller account is temporarily suspended. Reach out to marketplace support to resolve this.",
    },
  }[status];

  const Icon = variant.icon;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card">
        <div className={`${variant.bg} px-6 py-6`}>
          <Icon className={`h-10 w-10 ${variant.color}`} />
        </div>
        <div className="px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {SELLER_STATUS_LABELS[status] || status}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">{variant.title}</h1>
          <p className="mt-2 text-sm text-text-secondary">{variant.body}</p>
          {profile?.rejection_reason && (
            <p className="mt-3 rounded-lg border border-state-danger/30 bg-state-danger/10 p-3 text-sm text-state-danger">
              <strong>Rejection reason:</strong> {profile.rejection_reason}
            </p>
          )}
          {profile?.suspension_reason && (
            <p className="mt-3 rounded-lg border border-state-danger/30 bg-state-danger/10 p-3 text-sm text-state-danger">
              <strong>Suspension reason:</strong> {profile.suspension_reason}
            </p>
          )}

          <div className="mt-6 rounded-xl border border-border-subtle bg-canvas-elevated p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Application history</p>
            <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
              {(profile.history || []).map((h) => (
                <li key={h.id} className="flex items-center justify-between">
                  <span>{h.action}</span>
                  <span className="text-text-muted">
                    {h.from_status || "—"} → <strong>{h.to_status || "—"}</strong>
                  </span>
                  <span>{new Date(h.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-2">
            <Link to="/">
              <Button variant="secondary">Back to home</Button>
            </Link>
            {status === "REJECTED" && (
              <Link to="/seller">
                <Button>Re-apply</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
