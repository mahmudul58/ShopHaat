// Customer-facing order status (used by the existing Order model)
export const ORDER_STATUS_STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export const ORDER_STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// Seller-facing seller-order status (richer lifecycle)
export const SELLER_ORDER_STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_TO_SHIP: "Ready to Ship",
  HANDED_OVER: "Handed to Marketplace",
  RECEIVED: "Received by Marketplace",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return Requested",
  RETURN_APPROVED: "Return Approved",
  RETURN_REJECTED: "Return Rejected",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

// Statuses a seller (not admin) can move the order to from each state.
export const SELLER_ORDER_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["HANDED_OVER", "CANCELLED"],
  HANDED_OVER: [],
  CANCELLED: [],
};

// Statuses the admin can move the order to from each state.
//
// Strictly sequential delivery flow: HANDED_OVER → RECEIVED → SHIPPED →
// OUT_FOR_DELIVERY → DELIVERED. Only ONE forward step + CANCELLED is
// exposed per stage so staff cannot skip intermediate actions like
// marking "received" or "out for delivery". (Mirrors
// apps.marketplace.services.ADMIN_TRANSITIONS on the backend.)
export const ADMIN_ORDER_TRANSITIONS = {
  HANDED_OVER: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  PROCESSING: ["CANCELLED"],
  READY_TO_SHIP: ["CANCELLED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURN_APPROVED", "RETURN_REJECTED"],
  RETURN_APPROVED: ["RETURNED", "REFUNDED"],
  RETURNED: ["REFUNDED"],
};

export const SELLER_STATUS_LABELS = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export const PAYMENT_METHODS = [
  { value: "COD", label: "Cash on Delivery" },
  { value: "SIMULATED_ONLINE", label: "Pay Online" },
];
