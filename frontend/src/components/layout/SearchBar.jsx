import { useEffect, useState, useRef } from "react";
import { FaSearch, FaTimes, FaSpinner } from "react-icons/fa";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { fetchProducts } from "../../services/catalogService";

/**
 * Search input with live autocomplete dropdown.
 * - Submitting navigates to /catalog?search=<term>.
 * - Typing fetches top 5 results and shows them in a dropdown.
 * - `variant="dark"` renders the input on the dark navbar surface.
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
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync URL search param
  useEffect(() => {
    setValue(params.get("search") || "");
  }, [params]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const term = value.trim();
    if (!term) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    // Only search if the term is different from the URL param (to avoid searching on initial load unless we want to)
    // Actually, always search on type.
    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const data = await fetchProducts({ search: term, page_size: 5 });
        setSuggestions(data.results || []);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timeoutId);
  }, [value]);

  function handleSubmit(event) {
    event?.preventDefault();
    setShowSuggestions(false);
    const term = value.trim();
    navigate(term ? `/catalog?search=${encodeURIComponent(term)}` : "/catalog");
    if (onNavigate) onNavigate();
  }

  const isDark = variant === "dark";

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} role="search" className="relative w-full">
        <FaSearch
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
            isDark ? "text-text-muted" : "text-text-muted"
          }`}
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (value.trim()) setShowSuggestions(true);
          }}
          placeholder="Search for products, brands and more..."
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
            onClick={() => {
              setValue("");
              setSuggestions([]);
              setShowSuggestions(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:bg-canvas-elevated hover:text-text-primary"
          >
            <FaTimes />
          </button>
        )}
      </form>

      {/* Dropdown Suggestions */}
      {showSuggestions && value.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border-subtle bg-canvas-elevated shadow-float backdrop-blur-md">
          {isSearching ? (
            <div className="flex items-center justify-center py-6 text-text-muted">
              <FaSpinner className="mr-2 animate-spin" /> Searching...
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-2">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/products/${product.slug}`}
                    onClick={() => {
                      setShowSuggestions(false);
                      if (onNavigate) onNavigate();
                    }}
                    className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-canvas"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-canvas">
                      {product.thumbnail || product.image ? (
                        <img 
                          src={product.thumbnail || product.image} 
                          alt={product.name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">No img</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {product.name}
                      </p>
                      <p className="text-xs text-brand font-semibold">
                        ৳{Math.round(
                          product.discount_percent > 0 
                            ? (product.min_price || product.base_price) * (1 - product.discount_percent / 100) 
                            : (product.min_price || product.base_price)
                        ).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full border-t border-border-subtle bg-canvas py-2 text-center text-sm font-medium text-brand hover:bg-canvas-elevated"
                >
                  View all results for "{value}"
                </button>
              </li>
            </ul>
          ) : (
            <div className="py-6 text-center text-sm text-text-secondary">
              No products found for "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
