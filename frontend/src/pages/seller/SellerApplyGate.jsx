import { useState } from "react";
import { FaStore, FaCheckCircle } from "react-icons/fa";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "../../components/common/Button";
import { Checkbox, Input } from "../../components/common/Input";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { registerSeller } from "../../services/marketplaceService";

export function SellerApplyGate() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [form, setForm] = useState({
    store_name: "",
    business_type: "Others",
    description: "",
  });

  // If user is not logged in, redirect them to login first
  if (!user) {
    return <Navigate to="/login?next=/seller/apply" replace />;
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function slugify(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
  }

  async function handleSubmit() {
    if (!form.store_name) {
      showToast({ type: "error", message: "Please enter a store name." });
      return;
    }
    if (!accepted) {
      showToast({ type: "error", message: "Please accept the seller terms to continue." });
      return;
    }
    
    setSubmitting(true);
    try {
      const sellerPayload = {
        store_name: form.store_name,
        store_slug: slugify(form.store_name),
        description: form.description,
        business_type: form.business_type,
        user_full_name: user.full_name, // Auto-filled from user profile
        user_phone: user.phone, // Auto-filled from user profile
      };

      await registerSeller(sellerPayload);
      
      showToast({
        type: "success",
        message: "Application submitted! Waiting for admin approval.",
      });
      
      updateUser({ role: "seller" });
      navigate("/seller");
      window.location.reload();
      
    } catch (err) {
      showToast({
        type: "error",
        message: extractErrorMessage(err, "Could not submit your application."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand to-brand-light px-8 py-10 text-white text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
            <FaStore className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Launch Your Store</h1>
          <p className="mt-2 text-white/90">Join our marketplace and start selling in minutes.</p>
        </div>

        {/* Form */}
        <div className="px-8 py-8 space-y-6">
          <div className="bg-brand/5 p-4 rounded-xl border border-brand/10 flex gap-3 items-start">
            <FaCheckCircle className="text-brand mt-1 flex-shrink-0" />
            <div className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Hey {user.full_name},</span> we already have your basic account info. Just tell us about your store to get started!
            </div>
          </div>

          <div className="space-y-4">
            <Input 
              label="Store Name" 
              required 
              value={form.store_name} 
              onChange={(e) => set("store_name", e.target.value)} 
              placeholder="e.g. Dream Electronics"
            />
            
            <label className="block">
              <span className="text-sm font-medium text-text-secondary mb-1 block">Business Category</span>
              <select
                className="w-full rounded-lg border border-border-subtle bg-canvas-elevated px-4 py-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all cursor-pointer"
                value={form.business_type}
                onChange={(e) => set("business_type", e.target.value)}
              >
                {[
                  "Electronics", "Fashion", "Mobiles & Accessories", "Home & Furniture",
                  "Beauty & Personal Care", "Grocery", "Sports & Fitness", "Books & Stationery",
                  "Food & Beverage", "Others"
                ].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-text-secondary mb-1 block">Store Description (Optional)</span>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border-subtle bg-canvas-elevated px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all resize-none"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Briefly describe what you sell..."
              />
            </label>
          </div>

          <div className="mt-8 pt-6 border-t border-border-subtle">
            <Checkbox
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              label={<span className="text-sm">I agree to the <a href="/terms" className="font-semibold text-brand hover:underline" target="_blank" rel="noreferrer">Seller Terms & Conditions</a></span>}
            />
            
            <Button 
              className="w-full mt-6 py-4 text-base font-semibold shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all"
              variant="gradient" 
              onClick={handleSubmit} 
              isLoading={submitting} 
              disabled={!accepted}
            >
              Submit Application
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
