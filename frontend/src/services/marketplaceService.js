import { apiClient } from "./apiClient";
import { createCachedFetcher } from "../utils/fetchCache";

// All service-layer calls opt out of the global toast interceptor.
// Pages own their own error UX (inline form banner, retry button, etc.)
// and double-toasting a single failure is worse than no toast at all.
const SILENT = { skipErrorToast: true };

// ──────────────────────────────────────────────────────────────────────────
// Seller registration & self-service
// ──────────────────────────────────────────────────────────────────────────

export async function fetchMySellerStatus() {
  const { data } = await apiClient.get("/seller/me/", SILENT);
  return data;
}

export async function registerSeller(payload) {
  const { data } = await apiClient.post("/seller/register/", payload, SILENT);
  return data;
}

export async function fetchSellerProfile() {
  const { data } = await apiClient.get("/seller/profile/", SILENT);
  return data;
}

export async function updateSellerProfile(payload) {
  const { data } = await apiClient.patch("/seller/profile/", payload, SILENT);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// Seller dashboard
// ──────────────────────────────────────────────────────────────────────────

export const fetchSellerDashboard = createCachedFetcher(async () => {
  const { data } = await apiClient.get("/seller/dashboard/", SILENT);
  return data;
}, 30000); // 30 seconds

export const fetchSellerDashboardCharts = createCachedFetcher(async () => {
  const { data } = await apiClient.get("/seller/dashboard/charts/", SILENT);
  return data;
}, 30000);

export async function fetchSellerEarnings() {
  const { data } = await apiClient.get("/seller/earnings/", SILENT);
  return data;
}

export async function fetchSellerSettlements() {
  const { data } = await apiClient.get("/seller/settlements/", SILENT);
  return data.results || data;
}

// ──────────────────────────────────────────────────────────────────────────
// Seller orders
// ──────────────────────────────────────────────────────────────────────────

export async function fetchSellerOrders(status) {
  const { data } = await apiClient.get("/seller/orders/", {
    params: status ? { status } : {},
    ...SILENT,
  });
  return data.results ?? data;
}

export async function fetchSellerOrderDetail(id) {
  const { data } = await apiClient.get(`/seller/orders/${id}/`, SILENT);
  return data;
}

export async function transitionSellerOrder(id, payload) {
  const { data } = await apiClient.post(`/seller/orders/${id}/transition/`, payload, SILENT);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// Admin — sellers
// ──────────────────────────────────────────────────────────────────────────

export async function fetchAdminSellers(params = {}) {
  const { data } = await apiClient.get("/admin/sellers/", { params, ...SILENT });
  return data;
}

export async function fetchAdminSellerDetail(id) {
  const { data } = await apiClient.get(`/admin/sellers/${id}/`, SILENT);
  return data;
}

export async function updateAdminSellerStatus(id, payload) {
  const { data } = await apiClient.post(`/admin/sellers/${id}/status/`, payload, SILENT);
  return data;
}

export async function fetchAdminSellerProducts(id, params = {}) {
  const { data } = await apiClient.get(`/admin/sellers/${id}/products/`, { params, ...SILENT });
  return data.results ?? data;
}

export async function fetchAdminSellerOrdersForSeller(id, params = {}) {
  const { data } = await apiClient.get(`/admin/sellers/${id}/orders/`, { params, ...SILENT });
  return data.results ?? data;
}

// ──────────────────────────────────────────────────────────────────────────
// Admin — marketplace dashboard & seller-orders
// ──────────────────────────────────────────────────────────────────────────

export const fetchAdminMarketplaceDashboard = createCachedFetcher(async () => {
  const { data } = await apiClient.get("/admin/dashboard/", SILENT);
  return data;
}, 30000);

export async function fetchAdminSellerOrders(params = {}) {
  const { data } = await apiClient.get("/admin/seller-orders/", { params, ...SILENT });
  return data;
}

export async function fetchAdminSellerOrderDetail(id) {
  const { data } = await apiClient.get(`/admin/seller-orders/${id}/`, SILENT);
  return data;
}

export async function transitionAdminSellerOrder(id, payload) {
  const { data } = await apiClient.post(`/admin/seller-orders/${id}/transition/`, payload, SILENT);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// Admin — settlements
// ──────────────────────────────────────────────────────────────────────────

export async function fetchAdminSettlements() {
  const { data } = await apiClient.get("/admin/settlements/", SILENT);
  return data.results ?? data;
}

export async function updateAdminSettlement(id, payload) {
  const { data } = await apiClient.patch(`/admin/settlements/${id}/`, payload, SILENT);
  return data;
}

export async function generateSettlements() {
  const { data } = await apiClient.post("/admin/settlements/generate/", null, SILENT);
  return data;
}

export async function fetchSettlementEligibility() {
  const { data } = await apiClient.get("/admin/settlements/eligible/", SILENT);
  return data; // { eligible_count: number }
}

// ──────────────────────────────────────────────────────────────────────────
// Admin — platform settings (singleton)
// ──────────────────────────────────────────────────────────────────────────

export async function fetchPlatformSettings() {
  const { data } = await apiClient.get("/admin/settings/", SILENT);
  return data;
}

export async function updatePlatformSettings(payload) {
  const { data } = await apiClient.patch("/admin/settings/", payload, SILENT);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// Admin — commission rules
// ──────────────────────────────────────────────────────────────────────────

export async function fetchMarketplaceCommissions(params = {}) {
  const { data } = await apiClient.get("/admin/commissions/", { params, ...SILENT });
  return data.results ?? data;
}

export async function createMarketplaceCommission(payload) {
  const { data } = await apiClient.post("/admin/commissions/", payload, SILENT);
  return data;
}

export async function updateMarketplaceCommission(id, payload) {
  const { data } = await apiClient.patch(`/admin/commissions/${id}/`, payload, SILENT);
  return data;
}

export async function deleteMarketplaceCommission(id) {
  await apiClient.delete(`/admin/commissions/${id}/`, SILENT);
}

export async function fetchEffectiveCommissionRate({ sellerId, categoryId }) {
  const { data } = await apiClient.get("/admin/commissions/effective/", {
    params: { seller_id: sellerId, ...(categoryId ? { category_id: categoryId } : {}) },
    ...SILENT,
  });
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// Storefront (public)
// ──────────────────────────────────────────────────────────────────────────

export async function fetchStorefront(storeSlug) {
  const { data } = await apiClient.get(`/stores/${storeSlug}/`, SILENT);
  return data;
}

export async function fetchStorefrontProducts(storeSlug, params = {}) {
  const { data } = await apiClient.get(`/stores/${storeSlug}/products/`, { params, ...SILENT });
  return data.results ?? data;
}

// ──────────────────────────────────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────────────────────────────────

export const fetchNotifications = createCachedFetcher(async () => {
  const { data } = await apiClient.get("/notifications/", SILENT);
  return data.results ?? data;
}, 30000);

export async function markNotificationRead(id) {
  const { data } = await apiClient.post(`/notifications/${id}/mark_read/`, null, SILENT);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post("/notifications/mark_all_read/", null, SILENT);
  return data;
}
