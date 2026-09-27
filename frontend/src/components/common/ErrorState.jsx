import { FaExclamationTriangle } from "react-icons/fa";
import { Button } from "./Button";

/**
 * Used for API failures, network errors, 404s. Companion to EmptyState
 * (which is for "nothing here yet" — error is for "we couldn't load").
 */
export function ErrorState({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  onRetry,
  retryLabel = "Try Again",
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-state-danger/30 bg-state-danger/5 py-12 text-center ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-state-danger/15 text-state-danger">
        <FaExclamationTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
