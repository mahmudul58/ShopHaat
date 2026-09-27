import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope } from "react-icons/fa";

import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { useToast } from "../hooks/useToast";
import { requestPasswordReset } from "../services/authService";
import { extractErrorMessage } from "../services/apiClient";

/**
 * Forgot password page — dark ShopHaat variant.
 */
export function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
      showToast({ type: "success", message: "If that email exists, a reset link has been sent." });
    } catch (error) {
      const message = extractErrorMessage(
        error,
        "We couldn't send the reset link right now. Please try again."
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

      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Log in", to: "/login" }, { label: "Forgot Password" }]} className="relative z-10 mb-4" />

      <div className="relative rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-modal sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <FaEnvelope className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Forgot your password?
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg border border-state-success/40 bg-state-success/15 px-4 py-3 text-sm text-state-success">
              Check your inbox. We've sent a password reset link to{" "}
              <span className="font-semibold">{email}</span>.
            </div>
            <p className="text-xs text-text-secondary">
              Didn't get the email? Check your spam folder or try again in a minute.
            </p>
            <Link
              to="/login"
              className="inline-block font-medium text-brand hover:underline"
            >
              Back to login
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
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Send reset link
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-text-secondary">
              Remembered it?{" "}
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
