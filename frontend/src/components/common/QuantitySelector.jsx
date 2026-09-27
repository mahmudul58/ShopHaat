/**
 * Plus/minus quantity stepper. Pass `min` (default 1) and `max` (default 99,
 * or the variant's stock). Calls `onChange(newQty)` whenever the value changes.
 */
export function QuantitySelector({ value, onChange, min = 1, max = 99, disabled = false }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-border-subtle bg-canvas-elevated shadow-xs transition-colors hover:border-border-strong ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className="h-9 w-9 rounded-l-xl text-brand transition-colors hover:bg-brand/15 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
      >
        −
      </button>
      <span className="min-w-[2.5rem] select-none text-center text-sm font-bold text-text-primary tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="h-9 w-9 rounded-r-xl text-brand transition-colors hover:bg-brand/15 disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
      >
        +
      </button>
    </div>
  );
}
