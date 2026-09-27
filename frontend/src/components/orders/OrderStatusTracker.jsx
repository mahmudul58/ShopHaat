import { FaCheck, FaTimes, FaBoxOpen } from "react-icons/fa";

import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "../../utils/constants";

const TERMINAL_BAD = ["CANCELLED", "REFUNDED"];

/**
 * 5-step horizontal tracker for the happy-path order machine
 * (Placed → Confirmed → Processing → Shipped → Delivered).
 * Cancelled / Refunded render as a single terminal banner.
 */
export function OrderStatusTracker({ status }) {
  if (TERMINAL_BAD.includes(status)) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border border-state-danger/30 bg-state-danger/15 px-4 py-3 text-sm"
      >
        {status === "CANCELLED" ? (
          <FaTimes className="h-5 w-5 shrink-0 text-state-danger" />
        ) : (
          <FaBoxOpen className="h-5 w-5 shrink-0 text-state-danger" />
        )}
        <div>
          <p className="font-semibold text-state-danger">
            Order {ORDER_STATUS_LABELS[status]}
          </p>
          <p className="text-xs text-state-danger">
            {status === "CANCELLED"
              ? "This order was cancelled. Any payment will be refunded as per policy."
              : "This order has been refunded. The amount will be returned to your original payment method."}
          </p>
        </div>
      </div>
    );
  }

  // Unknown / not-yet-mapped statuses default to the first step
  const currentIndex = Math.max(0, ORDER_STATUS_STEPS.indexOf(status));

  return (
    <ol
      aria-label="Order progress"
      className="grid grid-cols-5 gap-1 sm:gap-2"
    >
      {ORDER_STATUS_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <li key={step} className="flex flex-col items-center gap-2">
            <div className="relative flex w-full items-center">
              {/* Connector line on the left */}
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2 ${
                    isComplete || isCurrent ? "bg-brand" : "bg-canvas-elevated"
                  }`}
                />
              )}
              {/* Connector line on the right */}
              {index < ORDER_STATUS_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2 ${
                    isComplete ? "bg-brand" : "bg-canvas-elevated"
                  }`}
                />
              )}
              {/* Step dot */}
              <span
                className={`relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold sm:h-8 sm:w-8 ${
                  isComplete
                    ? "border-brand bg-brand text-white"
                    : isCurrent
                    ? "border-brand bg-surface-card text-brand ring-4 ring-brand/20"
                    : "border-border-subtle bg-canvas-elevated text-text-muted"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? (
                  <FaCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : (
                  index + 1
                )}
              </span>
            </div>
            <span
              className={`text-center text-[10px] font-medium leading-tight sm:text-xs ${
                isFuture ? "text-text-muted" : "text-text-primary"
              }`}
            >
              {ORDER_STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
