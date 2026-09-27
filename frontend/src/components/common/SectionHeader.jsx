/**
 * Standard section header used on home/catalog/cart etc.:
 *   Title (lg)
 *   Optional subtitle (sm text-text-secondary)
 *   Optional right-side action (Link/Button)
 */
export function SectionHeader({ title, subtitle, action = null, className = "" }) {
  return (
    <div className={`mb-5 flex items-end justify-between gap-4 ${className}`}>
      <div>
        <h2 className="font-sans text-xl font-bold text-text-primary sm:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  );
}
