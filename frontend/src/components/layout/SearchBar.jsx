import { useEffect, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Search input. Submitting navigates to /catalog?search=<term>.
 * - Pre-fills from `?search=` if present.
 * - `variant="dark"` renders the input on the dark navbar surface
 *   (saffron accent on focus, glassmorphism backdrop).
 * - `onNavigate` callback fires after a successful submit (used by the
 *   mobile drawer to close itself).
 */
export function SearchBar({
  onNavigate,
  className = "",
  autoFocus = false,
  variant = "light",
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get("search") || "");

  // Keep local state in sync if URL changes externally (e.g. nav from another page).
  useEffect(() => {
    setValue(params.get("search") || "");
  }, [params]);

  function handleSubmit(event) {
    event.preventDefault();
    const term = value.trim();
    navigate(term ? `/catalog?search=${encodeURIComponent(term)}` : "/catalog");
    if (onNavigate) onNavigate();
  }

  const isDark = variant === "dark";

  return (
    <form onSubmit={handleSubmit} role="search" className={`relative w-full ${className}`}>
      <FaSearch
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
          isDark ? "text-text-muted" : "text-text-muted"
        }`}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={isDark ? "Search 50,000+ verified products..." : "Search for products, brands and more..."}
        autoFocus={autoFocus}
        aria-label="Search products"
        className={`w-full rounded-full border py-2.5 pl-10 pr-10 text-sm transition-colors focus:outline-none ${
          isDark
            ? "border-border-subtle bg-canvas text-text-primary placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/30"
            : "border-border-subtle bg-canvas-elevated text-text-primary placeholder:text-text-muted focus:border-brand focus:bg-canvas focus:ring-2 focus:ring-brand/30"
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:bg-canvas-elevated hover:text-text-primary"
        >
          <FaTimes />
        </button>
      )}
    </form>
  );
}
