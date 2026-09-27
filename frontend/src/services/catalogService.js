import { apiClient } from "./apiClient";

const SILENT = { skipErrorToast: true };

export async function fetchCategories() {
  const { data } = await apiClient.get("/categories/", SILENT);
  return data.results || data;
}

export async function fetchBrands() {
  const { data } = await apiClient.get("/brands/", SILENT);
  return data.results || data;
}

// ──────────────────────────────────────────────────────────────────────────
// Admin catalog management (writes)
// ──────────────────────────────────────────────────────────────────────────

// --- Subcategories ---
export async function fetchSubcategories(params = {}) {
  const { data } = await apiClient.get("/subcategories/", { params, ...SILENT });
  return data.results || data;
}

export async function createSubcategory(payload) {
  const { data } = await apiClient.post("/subcategories/", payload, SILENT);
  return data;
}

export async function updateSubcategory(slug, payload) {
  const { data } = await apiClient.patch(`/subcategories/${slug}/`, payload, SILENT);
  return data;
}

export async function deleteSubcategory(slug) {
  await apiClient.delete(`/subcategories/${slug}/`, SILENT);
}

// --- Categories (the public viewset accepts writes; helpers were missing) ---
export async function createCategory(payload) {
  const { data } = await apiClient.post("/categories/", payload, SILENT);
  return data;
}

export async function updateCategory(slug, payload) {
  const { data } = await apiClient.patch(`/categories/${slug}/`, payload, SILENT);
  return data;
}

export async function deleteCategory(slug) {
  await apiClient.delete(`/categories/${slug}/`, SILENT);
}

// --- Brands ---
export async function createBrand(payload) {
  const { data } = await apiClient.post("/brands/", payload, SILENT);
  return data;
}

export async function updateBrand(slug, payload) {
  const { data } = await apiClient.patch(`/brands/${slug}/`, payload, SILENT);
  return data;
}

export async function deleteBrand(slug) {
  await apiClient.delete(`/brands/${slug}/`, SILENT);
}

/**
 * filters: { search, category, subcategory, brand, min_price, max_price,
 *            min_rating, in_stock, sort (ordering), page, page_size }
 */
export async function fetchProducts(filters = {}) {
  const params = { ...filters };
  if (params.sort) {
    params.ordering = params.sort;
    delete params.sort;
  }
  const { data } = await apiClient.get("/products/", { params, ...SILENT });
  return data; // { count, next, previous, results }
}

export async function fetchProductBySlug(slug) {
  const { data } = await apiClient.get(`/products/${slug}/`, SILENT);
  return data;
}

export async function fetchProductReviews(slug) {
  const { data } = await apiClient.get(`/products/${slug}/reviews/`, SILENT);
  return data;
}

export async function submitProductReview(slug, { rating, comment }) {
  const { data } = await apiClient.post(`/products/${slug}/reviews/`, { rating, comment }, SILENT);
  return data;
}

// --- Staff/admin product management ---
// (Same /products/ endpoint as public browsing — write methods are
// permitted for staff/admin only, enforced by the backend's
// ReadOnlyOrStaff permission class.)

export async function createProduct(payload) {
  const { data } = await apiClient.post("/products/", payload, SILENT);
  return data;
}

export async function updateProduct(slug, payload) {
  const { data } = await apiClient.patch(`/products/${slug}/`, payload, SILENT);
  return data;
}

export async function deleteProduct(slug) {
  await apiClient.delete(`/products/${slug}/`, SILENT);
}

export async function createVariant(productSlug, payload) {
  const { data } = await apiClient.post(`/products/${productSlug}/variants/`, payload, SILENT);
  return data;
}

export async function updateVariant(productSlug, variantId, payload) {
  const { data } = await apiClient.patch(`/products/${productSlug}/variants/${variantId}/`, payload, SILENT);
  return data;
}

export async function deleteVariant(productSlug, variantId) {
  await apiClient.delete(`/products/${productSlug}/variants/${variantId}/`, SILENT);
}

export async function uploadProductImage(productSlug, file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post(`/products/${productSlug}/images/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    ...SILENT,
  });
  return data;
}

export async function deleteProductImage(productSlug, imageId) {
  await apiClient.delete(`/products/${productSlug}/images/${imageId}/`, SILENT);
}
