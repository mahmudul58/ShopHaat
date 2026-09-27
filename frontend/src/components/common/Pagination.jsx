/** Simple prev/next pager driven by DRF's {count, next, previous} shape,
 * translated by the caller into a numeric current page. */
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2 py-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-border-subtle bg-canvas-elevated px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-brand disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-border-subtle bg-canvas-elevated px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-brand disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
