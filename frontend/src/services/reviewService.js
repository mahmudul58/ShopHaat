import { apiClient } from "./apiClient";

const SILENT = { skipErrorToast: true };

export async function createReview(productSlug, reviewData) {
  const { data } = await apiClient.post(`/products/${productSlug}/reviews/`, reviewData, SILENT);
  return data;
}
