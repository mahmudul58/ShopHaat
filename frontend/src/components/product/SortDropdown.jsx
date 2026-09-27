const OPTIONS = [
  { value: "-created_at", label: "Newest" },
  { value: "-average_rating", label: "Popularity" },
  { value: "base_price", label: "Price: Low to High" },
  { value: "-base_price", label: "Price: High to Low" },
];

export function SortDropdown({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Sort by"
        className="appearance-none rounded-lg border border-border-subtle bg-canvas-elevated py-2 pl-3 pr-9 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
