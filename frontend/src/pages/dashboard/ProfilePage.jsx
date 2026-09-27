import { useState } from "react";

import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { updateProfile } from "../../services/authService";

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    full_name: user.full_name || "",
    phone: user.phone || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateProfile(form);
      updateUser(updated);
      showToast({ type: "success", message: "Profile updated" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not update your profile."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Profile" },
        ]}
        className="mb-3"
      />

      <h1 className="mb-1 text-xl font-bold text-text-primary sm:text-2xl">
        My Profile
      </h1>
      <p className="mb-5 text-xs text-text-secondary">
        Update your personal details. Your email is locked to your account.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-5 shadow-card"
      >
        <Input label="Email address" value={user.email} disabled />
        <Input
          label="Full name"
          required
          value={form.full_name}
          onChange={(event) => setForm({ ...form, full_name: event.target.value })}
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder="1XXX-XXXXXX"
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
