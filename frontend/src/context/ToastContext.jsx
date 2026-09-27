import { createContext, useCallback, useEffect, useMemo, useState } from "react";

export const ToastContext = createContext(null);

let nextId = 1;

const VARIANT_ALIAS = {
  // Map the new object-style variant names to the existing token names.
  success: "success",
  error: "error",
  warning: "info",
  info: "info",
};

function normalizeArgs(arg1, arg2, arg3) {
  // Newer call sites pass an object: showToast({ type, message })
  // Older call sites pass positionals:  showToast("text", "error")
  if (typeof arg1 === "object" && arg1 !== null) {
    return {
      message: arg1.message ?? String(arg1),
      variant: VARIANT_ALIAS[arg1.type ?? arg1.variant] ?? "info",
      durationMs: arg1.durationMs ?? 4000,
    };
  }
  return {
    message: arg1,
    variant: VARIANT_ALIAS[arg2] ?? "info",
    durationMs: typeof arg3 === "number" ? arg3 : 4000,
  };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (arg1, arg2, arg3) => {
      const { message, variant, durationMs } = normalizeArgs(arg1, arg2, arg3);
      const id = nextId++;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismissToast(id), durationMs);
    },
    [dismissToast]
  );

  // ─── Global API error listener ─────────────────────────────────────────
  // The axios interceptor in services/apiClient.js dispatches
  // `window` events named "api:error" for any failed request that wasn't
  // explicitly opted out via `{ skipErrorToast: true }`. Listening here
  // means every CRUD operation across the app surfaces its failures
  // automatically — pages don't have to wrap each call in try/catch
  // just to show a toast.
  useEffect(() => {
    function handleApiError(event) {
      const detail = event.detail || {};
      const message =
        detail.message ||
        "Something went wrong. Please try again.";
      showToast({ type: "error", message });
    }
    window.addEventListener("api:error", handleApiError);
    return () => window.removeEventListener("api:error", handleApiError);
  }, [showToast]);

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
