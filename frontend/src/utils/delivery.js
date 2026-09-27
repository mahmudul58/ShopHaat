/**
 * CartUp-style delivery calculation.
 *
 * The backend computes the shipping charge in `apps.orders.services.place_order`:
 *
 *     shipping_cost = 70 if address.state.lower() == "dhaka" else 120
 *
 * We mirror that exact rule client-side so the cart and checkout can show
 * the customer the same total the order will be placed with. If the
 * backend ever switches to a more sophisticated model (per-zone, weight,
 * courier) update both this helper and the backend in lockstep.
 *
 * Returns a number in BDT.
 */
export function calculateDeliveryCharge(address) {
  if (!address || !address.state || typeof address.state !== "string") return 120;
  return address.state.trim().toLowerCase() === "dhaka" ? 70 : 120;
}

export function deliveryZone(address) {
  if (!address || !address.state || typeof address.state !== "string") return "Outside Dhaka";
  return address.state.trim().toLowerCase() === "dhaka" ? "Inside Dhaka" : "Outside Dhaka";
}
