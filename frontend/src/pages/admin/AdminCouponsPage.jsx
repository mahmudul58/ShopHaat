import { useEffect, useState } from "react";

import { AdminOnly } from "../../components/admin/AdminOnly";
import { CouponForm } from "../../components/admin/CouponForm";
import { CouponTable } from "../../components/admin/CouponTable";
import { EmptyState } from "../../components/common/EmptyState";
import { confirm } from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { extractErrorMessage } from "../../services/apiClient";
import { createCoupon, deleteCoupon, fetchCoupons } from "../../services/couponService";

export function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCoupons()
      .then(setCoupons)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(payload) {
    setIsSaving(true);
    try {
      const created = await createCoupon(payload);
      setCoupons((current) => [created, ...current]);
      showToast({ type: "success", message: "Coupon created" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not create this coupon."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id, code) {
    const ok = await confirm({
      title: "Delete coupon?",
      message: `Permanently delete coupon "${code}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteCoupon(id);
      setCoupons((current) => current.filter((coupon) => coupon.id !== id));
      showToast({ type: "success", message: "Coupon deleted" });
    } catch (error) {
      showToast({
        type: "error",
        message: extractErrorMessage(error, "Could not delete this coupon."),
      });
    }
  }

  return (
    <AdminOnly>
      <div>
        <div className="mb-5">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
            Coupons
          </h1>
          <p className="text-xs text-text-secondary">
            {coupons.length} coupon{coupons.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mb-8 max-w-2xl">
          <CouponForm onSubmit={handleCreate} isSaving={isSaving} />
        </div>

        {isLoading ? (
          <CouponTable coupons={[]} isLoading />
        ) : coupons.length === 0 ? (
          <EmptyState
            title="No coupons yet"
            description="Create one above to get started."
          />
        ) : (
          <CouponTable coupons={coupons} onDelete={handleDelete} />
        )}
      </div>
    </AdminOnly>
  );
}
