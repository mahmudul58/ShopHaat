import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaLock } from "react-icons/fa";

import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Button } from "../components/common/Button";
import { PasswordInput } from "../components/common/Input";
import { useToast } from "../hooks/useToast";
import { confirmPasswordReset } from "../services/authService";
import { extractErrorMessage } from "../services/apiClient";

/**
 * Reset password page — dark ShopHaat variant.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const linkInvalid = !uid || !token;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    if (form.newPassword !== form.confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }
    if (form.newPassword.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset({ uid, token, newPassword: form.newPassword });
      showToast({ type: "success", message: "Password updated — please log in." });
      navigate("/login", { replace: true });
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "This reset link is invalid or has expired. Please request a new one."
      );
      setFormError(message);
      showToast({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-mesh-warm"
      />

      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Log in", to: "/login" }, { label: "Reset Password" }]} className="relative z-10 mb-4" />

      <div className="relative rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-modal sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <FaLock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Choose something strong you'll remember.
          </p>
        </div>

        {linkInvalid ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg border border-state-warning/40 bg-state-warning/15 px-4 py-3 text-sm text-state-warning">
              This reset link is missing required information. Please request a new
              one from the forgot-password page.
            </div>
            <Link
              to="/forgot-password"
              className="inline-block font-medium text-brand hover:underline"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            {formError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-state-danger/40 bg-state-danger/15 px-3 py-2 text-sm text-state-danger"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordInput
                label="New password"
                required
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                placeholder="At least 8 characters"
              />
              <PasswordInput
                label="Confirm new password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm({ ...form, confirmPassword: event.target.value })
                }
                placeholder="Re-enter the new password"
              />

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Update password
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-text-secondary">
              <Link to="/login" className="font-medium text-brand hover:underline">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
