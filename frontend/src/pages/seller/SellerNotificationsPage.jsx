import { useEffect, useState } from "react";
import { FaBell, FaCheck, FaCheckDouble } from "react-icons/fa";
import { Link } from "react-router-dom";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Skeleton } from "../../components/common/Skeleton";
import { useToast } from "../../hooks/useToast";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/marketplaceService";
import { extractErrorMessage } from "../../services/apiClient";

/**
 * In-app notifications inbox for sellers (and admins/customer — they all
 * use the same backend). Marks individual notifications as read and
 * offers a "Mark all read" shortcut.
 */
export function SellerNotificationsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications();
      setItems(data || []);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not load notifications."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMark(id) {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not mark as read.") });
    }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast({ type: "success", message: "All marked as read" });
    } catch (err) {
      showToast({ type: "error", message: extractErrorMessage(err, "Could not mark all as read.") });
    }
  }

  if (error) return <ErrorState title="Could not load" description={error} />;

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Seller Center", to: "/seller" },
          { label: "Notifications" },
        ]}
        className="mb-3"
      />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Notifications</h1>
          <p className="text-xs text-text-secondary">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" onClick={handleMarkAll}>
            <FaCheckDouble className="h-3 w-3" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState icon={FaBell} title="No notifications" description="You'll see updates here when something happens." />
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                n.is_read ? "bg-surface-card" : "bg-brand/5"
              }`}
            >
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-border-strong" : "bg-brand"}`} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text-primary">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-text-secondary">{n.body}</p>}
                <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  {n.link && (
                    <Link to={n.link} className="font-semibold text-brand hover:underline">
                      Open
                    </Link>
                  )}
                </div>
              </div>
              {!n.is_read && (
                <button
                  type="button"
                  onClick={() => handleMark(n.id)}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-canvas-elevated hover:text-brand"
                  aria-label="Mark read"
                  title="Mark as read"
                >
                  <FaCheck />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
