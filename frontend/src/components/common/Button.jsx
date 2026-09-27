const VARIANT_CLASSES = {
  // Saffron CTA — primary conversion surface.
  primary:
    "bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50",
  // Saffron gradient CTA (used by checkout "Place Order" etc.).
  gradient:
    "bg-brand-gradient text-white hover:bg-brand-gradient-hover disabled:opacity-50",
  // Subtle dark outline — used for "Back", "Cancel", "See all deals".
  secondary:
    "bg-canvas-elevated text-text-primary border border-border-subtle hover:border-brand hover:text-text-primary",
  // Text-only ghost — used for tertiary actions.
  ghost: "bg-transparent text-text-secondary hover:bg-canvas-elevated hover:text-text-primary",
  // Danger CTA — destructive actions (delete, remove).
  danger:
    "bg-state-danger/10 text-state-danger border border-state-danger/30 hover:bg-state-danger hover:text-white disabled:opacity-50",
  // Pill — used for filter chips.
  pill: "rounded-full bg-canvas-elevated text-text-secondary hover:bg-surface-card hover:text-text-primary border border-border-subtle",
  "pill-active":
    "rounded-full bg-brand/15 text-brand border border-brand shadow-xs hover:bg-brand/15 hover:text-brand",
};

const SIZE_CLASSES = {
  xs: "text-xs px-2.5 py-1",
  sm: "text-sm px-3.5 py-2",
  md: "text-sm px-4 py-2.5",
  lg: "text-base px-6 py-3",
};

/**
 * Shared button used across the whole app. Variants:
 * - primary: saffron CTA (Place Order, main conversions)
 * - gradient: saffron gradient CTA (preferred for primary conversions)
 * - secondary: dark outline, used for "Back", "Cancel", etc.
 * - ghost: text-only, used for tertiary actions
 * - danger: red-tinted, used for destructive actions
 * - pill / pill-active: rounded-full chips used for filter pills
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  type = "button",
  className = "",
  ...rest
}) {
  const isPill = variant.startsWith("pill");
  const isGradient = variant === "gradient";
  const radiusClass = isPill ? "" : isGradient ? "rounded-xl" : "rounded-lg";
  const liftClass = isGradient || variant === "primary" || variant === "danger"
    ? "hover:-translate-y-px active:translate-y-0"
    : "";
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 ${radiusClass} ${liftClass} font-semibold
        transition-all duration-200 ease-out-expo
        disabled:cursor-not-allowed disabled:translate-y-0
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
