import { apiClient } from "./apiClient";

// Service-layer calls have their error UX owned by the calling page
// (toast, inline banner, etc.). The global interceptor would otherwise
// fire a duplicate toast on top of the page's own message.
const SILENT = { skipErrorToast: true };

export async function fetchCart() {
  const { data } = await apiClient.get("/cart/", SILENT);
  return data;
}

export async function addCartItem({ variantId, quantity }) {
  const { data } = await apiClient.post(
    "/cart/items/",
    { variant_id: variantId, quantity },
    SILENT
  );
  return data;
}

export async function updateCartItem(itemId, quantity) {
  const { data } = await apiClient.patch(`/cart/items/${itemId}/`, { quantity }, SILENT);
  return data;
}

export async function removeCartItem(itemId) {
  await apiClient.delete(`/cart/items/${itemId}/`, SILENT);
}

export async function previewCoupon(code) {
  const { data } = await apiClient.post("/cart/apply-coupon/", { code }, SILENT);
  return data;
}
