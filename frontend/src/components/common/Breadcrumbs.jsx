import { Link } from "react-router-dom";
import { FaChevronRight, FaHome } from "react-icons/fa";

/**
 * Crumb list: [{ label, to? }]. The last crumb is rendered as text, not a link.
 * Includes a home icon for the root crumb when present.
 */
export function Breadcrumbs({ items = [], className = "" }) {
  return (
    <nav aria-label="Breadcrumb" className={`text-sm text-text-secondary ${className}`}>
      <ol className="flex items-center gap-1.5 overflow-hidden">
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          const isFirst = i === 0;
          return (
            <li key={i} className={`flex items-center gap-1.5 ${isLast ? "min-w-0" : "shrink-0"}`}>
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-canvas-elevated hover:text-brand whitespace-nowrap"
                >
                  {isFirst && <FaHome className="h-3 w-3 shrink-0" />}
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 rounded px-1 py-0.5 truncate ${
                    isLast ? "font-semibold text-text-primary" : ""
                  }`}
                >
                  {isFirst && <FaHome className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{crumb.label}</span>
                </span>
              )}
              {!isLast && <FaChevronRight className="h-3 w-3 text-text-muted shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
