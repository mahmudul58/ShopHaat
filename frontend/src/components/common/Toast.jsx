import { useToast } from "../../hooks/useToast";

const VARIANT_STYLES = {
  info: "bg-canvas-elevated text-text-primary border border-border-subtle",
  success: "bg-state-success text-white",
  error: "bg-state-danger text-white",
  warning: "bg-state-warning text-canvas",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-elevated backdrop-blur-md ${VARIANT_STYLES[toast.variant] || VARIANT_STYLES.info}`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-white/70 hover:text-white"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
