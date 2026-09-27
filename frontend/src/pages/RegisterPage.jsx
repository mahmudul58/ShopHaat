import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";

import { Button } from "../components/common/Button";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Input, PasswordInput } from "../components/common/Input";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { extractErrorMessage } from "../services/apiClient";
import { registerSeller } from "../services/marketplaceService";

/**
 * Register page — dark ShopHaat variant with surface-card panel and
 * subtle saffron radial glow.
 */
export function RegisterPage() {
  const { register, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isSellerReg = new URLSearchParams(location.search).get("type") === "seller";


  useEffect(() => {
    if (user) {
      if (isSellerReg) {
        navigate("/seller", { replace: true });
      } else if (user.role === "admin" || user.role === "staff") {
        navigate("/admin", { replace: true });
      } else if (user.role === "seller") {
        navigate("/seller", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, isSellerReg, navigate]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    storeName: "",
    description: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  function handleChange(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }
  
  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    if (form.password !== form.confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    if (isSellerReg && !form.storeName) {
      setFormError("Store name is required for sellers.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      
      if (isSellerReg) {
        // Also register as seller immediately
        await registerSeller({
          store_name: form.storeName,
          store_slug: slugify(form.storeName),
          description: form.description,
          address_line1: form.address,
        });
        showToast({ type: "success", message: "Account created and application submitted!" });
        navigate("/seller", { replace: true });
      } else {
        showToast({ type: "success", message: "Welcome to ShopHaat!" });
        navigate("/", { replace: true });
      }
    } catch (error) {
      const message = extractErrorMessage(error, "Could not create your account.");
      setFormError(message);
      showToast({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-10">

      <div className="relative rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-modal sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <FaUserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isSellerReg ? "Register as a Seller" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isSellerReg ? "Join ShopHaat to start selling today" : "Join ShopHaat and start shopping in minutes"}
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
            label="Full name"
            required
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange("fullName")}
            placeholder="Your full name"
          />
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="you@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange("phone")}
            placeholder="1XXX-XXXXXX (optional)"
          />
          {isSellerReg && (
            <>
              <Input
                label="Store name"
                required
                value={form.storeName}
                onChange={handleChange("storeName")}
                placeholder="Your store name"
              />
              <Input
                label="Address"
                value={form.address}
                onChange={handleChange("address")}
                placeholder="Business address"
              />
              <label className="block">
                <span className="text-sm font-medium text-text-secondary">Description</span>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border-subtle bg-canvas-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  value={form.description}
                  onChange={handleChange("description")}
                  placeholder="What does your store sell?"
                />
              </label>
            </>
          )}
          <PasswordInput
            label="Password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange("password")}
            placeholder="At least 8 characters"
            hint="Use a mix of letters, numbers, and symbols."
          />
          <PasswordInput
            label="Confirm password"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            placeholder="Re-enter your password"
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            {isSellerReg ? "Register as a Seller" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
