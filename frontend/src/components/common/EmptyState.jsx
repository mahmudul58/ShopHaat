/**
 * Shown whenever a list/query legitimately has zero results — never a
 * loading state and never an error, just "nothing here yet".
 */
export function EmptyState({
  icon = null,
  title,
  description,
  action = null,
  variant = "bordered", // 'bordered' | 'plain'
}) {
  if (variant === "plain") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {icon && <div className="mb-3 text-text-muted">{icon}</div>}
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-canvas-elevated px-6 py-16 text-center shadow-card">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
