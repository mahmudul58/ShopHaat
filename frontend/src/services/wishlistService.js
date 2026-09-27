import { apiClient } from "./apiClient";

// Service-layer calls have their error UX owned by the calling page.
const SILENT = { skipErrorToast: true };

export async function fetchWishlist() {
  const { data } = await apiClient.get("/wishlist/", SILENT);
  return data.results || data;
}

export async function addToWishlist(productId) {
  const { data } = await apiClient.post("/wishlist/", { product: productId }, SILENT);
  return data;
}

export async function removeFromWishlist(itemId) {
  await apiClient.delete(`/wishlist/${itemId}/`, SILENT);
}
