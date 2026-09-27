/**
 * Reusable data table for admin screens. Pure presentational; pagination
 * + fetch live in the parent.
 *
 * Props:
 *   - columns: [{ key, header, render?, className?, align? }]
 *   - rows: array
 *   - rowKey: string | (row) => string
 *   - emptyMessage: string
 *   - isLoading: bool — renders skeleton rows when true
 */
export function DataTable({ columns, rows, rowKey = "id", emptyMessage = "No data", isLoading = false }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-card shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border-subtle bg-canvas-elevated text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 font-semibold ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                } ${col.headerClassName || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={`sk-${idx}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-canvas-elevated" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-text-secondary"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = typeof rowKey === "function" ? rowKey(row) : row[rowKey];
              return (
                <tr key={key} className="transition-colors hover:bg-canvas-elevated/50">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 align-middle ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${col.className || ""}`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
