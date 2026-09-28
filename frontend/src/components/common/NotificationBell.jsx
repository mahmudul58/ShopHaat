import { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";
import { Link } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/marketplaceService";

/**
 * Bell icon with badge counter + dropdown panel of recent unread
 * notifications. Dark-theme surfaces throughout.
 */
const POLL_MS = 60_000;

export function NotificationBell({ destination = "/dashboard/notifications" }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    async function tick() {
      try {
        const data = await fetchNotifications();
        if (!cancelled) setItems(data || []);
      } catch {
        /* silent */
      }
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!isAuthenticated) return null;

  const unread = items.filter((n) => !n.is_read).length;
  const recent = items.slice(0, 6);

  async function handleItem(n) {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch {
      /* ignore */
    }
  }

  return (
    <div 
      className="relative"
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Notifications"
        className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-canvas-elevated hover:text-brand"
      >
        <FaBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-modal pt-2 w-80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="animate-fade-up overflow-hidden rounded-xl border border-border-subtle bg-canvas-elevated shadow-float">
            <header className="flex items-center justify-between border-b border-border-subtle bg-canvas px-4 py-2.5">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </header>
          {recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-secondary">No notifications yet</p>
          ) : (
            <ul className="max-h-80 divide-y divide-border-subtle overflow-y-auto">
              {recent.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-2 px-4 py-3 transition-colors ${
                    n.is_read ? "bg-canvas-elevated" : "bg-brand/10"
                  }`}
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-border-strong" : "bg-brand"}`} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleItem(n)}
                      className="block w-full text-left"
                    >
                      <p className="truncate text-sm font-semibold text-text-primary">{n.title}</p>
                      {n.body && (
                        <p className="line-clamp-2 text-xs text-text-secondary">{n.body}</p>
                      )}
                    </button>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-text-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={destination}
            onClick={() => setOpen(false)}
            className="block border-t border-border-subtle bg-canvas px-4 py-2.5 text-center text-sm font-semibold text-brand hover:bg-canvas-elevated"
          >
            View all
          </Link>
          </div>
        </div>
      )}
    </div>
  );
}
