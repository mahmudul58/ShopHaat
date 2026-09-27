/** A single pulsing placeholder block with a subtle shimmer overlay.
 *  Compose several to build any loading skeleton. */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-canvas-elevated ${className}`}
    >
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

/** Skeleton for a single product card in a grid. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-surface-card border border-border-subtle p-3 shadow-card">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="mt-1 h-4 w-2/3" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

/** Skeleton for a single row in the orders list/table. */
export function OrderRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface-card border border-border-subtle p-4 shadow-card">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

/** Skeleton row for a DataTable body. */
export function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr className="border-t border-border-subtle">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton block used by the product detail page. */
export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
