import axios from "axios";

// Default to a relative URL so the Vite dev proxy handles /api →
// 127.0.0.1:8000 (see frontend/vite.config.js). This keeps every API
// request same-origin, which lets the browser's SameSite=Lax refresh
// cookie flow on the silent /auth/refresh/ call after a hard refresh.
//
// Set VITE_API_BASE_URL to an absolute URL when you need to bypass the
// proxy (e.g., production behind a real domain, or local debugging).
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// The access token lives only in memory (module scope) — never in
// localStorage/sessionStorage — per the security requirements in the
// Phase 1 spec. The refresh token is an httpOnly cookie the browser
// manages automatically; JS never touches it directly.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the httpOnly refresh cookie on same-site requests
});

apiClient.interceptors.request.use((config) => {
  const isRefreshEndpoint = config.url?.includes("/auth/refresh");
  if (accessToken && !isRefreshEndpoint) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Queues concurrent requests that fail with 401 while a single refresh
// call is in flight, so we don't fire multiple refresh requests at once.
let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/refresh");

    // ─── 401 path: silently refresh + retry ────────────────────────────
    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          // skipErrorToast: the refresh call's own failure path is
          // surfaced via the `auth:session-expired` event below, not via
          // a generic toast.
          refreshPromise = apiClient
            .post("/auth/refresh/", null, { skipErrorToast: true })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        // Let the AuthContext know the session is truly over so it can
        // clear user state and redirect to login.
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
        // Don't toast: the session-expired listener already handles the
        // UX (clears user, redirects). Showing an additional
        // "Authentication is required or has expired" toast on top is
        // noise the user can't act on.
        return Promise.reject(refreshError);
      }
    }

    // ─── Non-401 path: surface unexpected failures to the user ─────────
    // Pages can opt out per-request by passing `{ skipErrorToast: true }`
    // in their axios config (e.g., login form where they want to render
    // the error inline instead of toasting). Network errors with no
    // response (offline, CORS preflight failed, etc.) are always toasted
    // — there's no other place to surface them.
    //
    // 401s that reach here (i.e., NOT on a request we could refresh — e.g.
    // /auth/login with bad credentials, or a 401 after refresh already
    // failed) are also suppressed to avoid double UX: the calling page
    // either renders its own form-level error banner or the session-
    // expired flow is already handling the redirect.
    const is401 = error.response?.status === 401;
    if (!originalRequest?.skipErrorToast && !is401) {
      const detail = {
        status: error.response?.status ?? null,
        code: error.response?.data?.error?.code ?? "NETWORK_ERROR",
        message: extractErrorMessage(
          error,
          navigator.onLine === false
            ? "You appear to be offline. Please check your connection."
            : "Something went wrong. Please try again."
        ),
        details: error.response?.data?.error?.details ?? null,
        url: originalRequest?.url ?? null,
      };
      // Defer to the ToastProvider (which mounts once at the app root)
      // so we don't need to import React here.
      window.dispatchEvent(new CustomEvent("api:error", { detail }));
    }

    return Promise.reject(error);
  }
);

/**
 * Normalizes the backend's error envelope ({error: {code, message, details}})
 * into a plain string, so every UI component can display errors the same
 * way without re-parsing the response shape itself.
 */
export function extractErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const payload = error?.response?.data?.error;
  if (!payload) return fallback;
  if (payload.details && typeof payload.details === "object") {
    const firstDetail = Object.values(payload.details)[0];
    if (Array.isArray(firstDetail)) return String(firstDetail[0]);
    if (typeof firstDetail === "string") return firstDetail;
  }
  return payload.message || fallback;
}

/**
 * Convenience helper for pages that DO want to render an error inline
 * (e.g., a form-level banner) AND also flash a toast for redundancy.
 * Returns the original error so callers can keep chaining.
 */
export function showApiError(error, fallbackMessage) {
  const message = extractErrorMessage(error, fallbackMessage);
  window.dispatchEvent(new CustomEvent("api:error", { detail: { message } }));
  return error;
}
