import { apiClient as api } from "./apiClient";

export async function fetchFlashSales() {
  const { data } = await api.get("/flash-sales/");
  // Nested structure from ModelViewSet might return { results: [...] } if paginated
  return data.results || data;
}

export async function createFlashSale(payload) {
  const { data } = await api.post("/flash-sales/", payload);
  return data;
}

export async function updateFlashSale(id, payload) {
  const { data } = await api.patch(`/flash-sales/${id}/`, payload);
  return data;
}

export async function deleteFlashSale(id) {
  await api.delete(`/flash-sales/${id}/`);
}

export async function addFlashSaleItem(flashSaleId, payload) {
  const { data } = await api.post(`/flash-sales/${flashSaleId}/items/`, payload);
  return data;
}

export async function deleteFlashSaleItem(flashSaleId, itemId) {
  await api.delete(`/flash-sales/${flashSaleId}/items/${itemId}/`);
}

