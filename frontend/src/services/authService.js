import { apiClient, setAccessToken } from "./apiClient";

// Form pages (LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage)
// render their own inline error banner AND fire a toast — the global
// api:error interceptor would otherwise add a duplicate toast on top.
// Pass `skipErrorToast: true` for those user-initiated auth endpoints so
// the page's own error UX is the single source of truth.
const FORM_SILENT = { skipErrorToast: true };

export async function register({ email, password, fullName, phone }) {
  const { data } = await apiClient.post(
    "/auth/register/",
    { email, password, full_name: fullName, phone },
    FORM_SILENT
  );
  return data;
}

export async function login({ email, password }) {
  const { data } = await apiClient.post(
    "/auth/login/",
    { email, password },
    FORM_SILENT
  );
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  await apiClient.post("/auth/logout/", null, FORM_SILENT);
  setAccessToken(null);
}

export async function fetchProfile() {
  // Silent: a failed profile fetch on initial load is handled by the
  // AuthContext restoreSession flow + 401 refresh interceptor, not by a
  // toast.
  const { data } = await apiClient.get("/auth/profile/", FORM_SILENT);
  return data;
}

export async function updateProfile(payload) {
  const { data } = await apiClient.patch("/auth/profile/", payload, FORM_SILENT);
  return data;
}

export async function requestPasswordReset(email) {
  await apiClient.post("/auth/password-reset/", { email }, FORM_SILENT);
}

export async function confirmPasswordReset({ uid, token, newPassword }) {
  await apiClient.post(
    "/auth/password-reset/confirm/",
    { uid, token, new_password: newPassword },
    FORM_SILENT
  );
}

export async function fetchAddresses() {
  const { data } = await apiClient.get("/auth/addresses/", FORM_SILENT);
  return data.results || data;
}

export async function createAddress(payload) {
  const { data } = await apiClient.post("/auth/addresses/", payload, FORM_SILENT);
  return data;
}

export async function updateAddress(id, payload) {
  const { data } = await apiClient.patch(`/auth/addresses/${id}/`, payload, FORM_SILENT);
  return data;
}



export async function deleteAddress(id) {
  await apiClient.delete(`/auth/addresses/${id}/`, FORM_SILENT);
}
