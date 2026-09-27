import { apiClient } from "./apiClient";

const SILENT = { skipErrorToast: true };

export async function fetchCoupons() {
  const { data } = await apiClient.get("/admin/coupons/", SILENT);
  return data.results ?? data;
}

export async function createCoupon(payload) {
  const { data } = await apiClient.post("/admin/coupons/", payload, SILENT);
  return data;
}

export async function updateCoupon(id, payload) {
  const { data } = await apiClient.patch(`/admin/coupons/${id}/`, payload, SILENT);
  return data;
}

export async function deleteCoupon(id) {
  await apiClient.delete(`/admin/coupons/${id}/`, SILENT);
}
