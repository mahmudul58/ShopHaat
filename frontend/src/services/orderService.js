import { apiClient } from "./apiClient";

// Service-layer calls have their error UX owned by the calling page.
const SILENT = { skipErrorToast: true };

export async function fetchShippingMethods() {
  const { data } = await apiClient.get("/shipping-methods/", SILENT);
  return data.results || data;
}

export async function placeOrder({ addressId, paymentMethod, couponCode, cartItemIds }) {
  const payload = {
    address_id: addressId,
    payment_method: paymentMethod,
  };
  if (couponCode) payload.coupon_code = couponCode;
  if (cartItemIds?.length > 0) payload.cart_item_ids = cartItemIds;

  const { data } = await apiClient.post("/orders/", payload, SILENT);
  return data;
}

export async function fetchOrders() {
  const { data } = await apiClient.get("/orders/", SILENT);
  return data.results || data;
}

export async function fetchOrderDetail(orderNumber) {
  const { data } = await apiClient.get(`/orders/${orderNumber}/`, SILENT);
  return data;
}

export async function cancelOrder(orderNumber) {
  const { data } = await apiClient.patch(`/orders/${orderNumber}/cancel/`, null, SILENT);
  return data;
}

export async function requestOrderReturn(orderNumber, { items, reason }) {
  const { data } = await apiClient.post(
    `/orders/${orderNumber}/return/`,
    { items, reason },
    SILENT
  );
  return data;
}

// --- Staff/admin order management ---

export async function fetchAdminOrders(status, page = 1) {
  const { data } = await apiClient.get("/admin/orders/", {
    params: { ...(status ? { status } : {}), page, page_size: 12 },
    ...SILENT,
  });
  return data; // Return full paginated object (with count, next, previous, results)
}

export async function updateOrderStatus(orderNumber, { status, note }) {
  const { data } = await apiClient.patch(
    `/admin/orders/${orderNumber}/status/`,
    { status, note },
    SILENT
  );
  return data;
}
