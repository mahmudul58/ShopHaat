import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaShoppingBag } from "react-icons/fa";

import { Button } from "../components/common/Button";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Input, PasswordInput } from "../components/common/Input";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { extractErrorMessage } from "../services/apiClient";

const DEMO_ACCOUNTS = [
  {
    role: "Customer",
    email: "customer@example.com",
    password: "CustomerPass123!",
  },
  {
    role: "Seller · Gadget & Gear",
    email: "gadget-gear@example.com",
    password: "password123",
  },
  {
    role: "Seller · Star Tech",
    email: "star-tech@example.com",
    password: "password123",
  },
  {
    role: "Admin",
    email: "admin@example.com",
    password: "AdminPass123!",
  },
];

/**
 * Login page — dark ShopHaat variant.
 *
 * Centered surface-card panel on a canvas backdrop with a subtle saffron
 * radial glow at the top.
 */
export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      const searchParams = new URLSearchParams(location.search);
      let redirectTo = searchParams.get("next") || location.state?.from?.pathname;
      
      if (!redirectTo || redirectTo === "/") {
        if (user.role === "admin" || user.role === "staff") {
          redirectTo = "/admin";
        } else if (user.role === "seller") {
          redirectTo = "/seller";
        } else {
          redirectTo = "/";
        }
      }
      
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  function handleChange(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      if (formError) setFormError(null);
    };
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const profile = await login(form);
      const searchParams = new URLSearchParams(location.search);
      let redirectTo = searchParams.get("next") || location.state?.from?.pathname;
      
      if (!redirectTo || redirectTo === "/") {
        if (profile.role === "admin" || profile.role === "staff") {
          redirectTo = "/admin";
        } else if (profile.role === "seller") {
          redirectTo = "/seller";
        } else {
          redirectTo = "/";
        }
      }
      
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "Could not log in with those details."
      );
      setFormError(message);
      showToast({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  function useDemo(account) {
    setForm({ email: account.email, password: account.password });
    setFormError(null);
  }

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-10">

      <div className="relative rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-modal sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <FaShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Log in to your ShopHaat account
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-state-danger/40 bg-state-danger/15 px-3 py-2 text-sm text-state-danger"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="you@example.com"
          />
          <PasswordInput
            label="Password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange("password")}
            placeholder="Your password"
          />

          <div className="flex items-center justify-end text-xs">
            <Link
              to="/forgot-password"
              className="font-medium text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Log in
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-text-secondary">
          New to ShopHaat?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      {/* Demo accounts — pre-seeded users so anyone can try the store
          without going through the signup flow. Click any row to populate
          the form; click "Log in" to actually sign in. */}
      <div className="relative mt-5 rounded-2xl border border-dashed border-border-subtle bg-canvas-elevated p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Demo accounts
          </h2>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            Try the store
          </span>
        </div>
        <p className="mb-3 text-xs text-text-secondary">
          Anyone can sign in with these pre-seeded accounts — useful for exploring the
          admin or customer views quickly.
        </p>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => useDemo(account)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-brand hover:bg-brand/10"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-brand">{account.role}</p>
                <p className="truncate font-mono text-[11px] text-text-secondary">
                  {account.email}{" "}
                  <span className="text-text-muted">·</span> {account.password}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-brand">
                Use →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
