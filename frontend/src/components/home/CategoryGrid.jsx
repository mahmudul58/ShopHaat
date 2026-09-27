import { Link } from "react-router-dom";
import {
  FaMobileScreenButton,
  FaHeadphones,
  FaShirt,
  FaUtensils,
  FaLaptop,
  FaDumbbell,
  FaClock,
  FaStore,
  FaArrowRight
} from "react-icons/fa6";

const getCategoryIcon = (slug) => {
  const s = slug.toLowerCase();
  if (s.includes("smartphone") || s.includes("mobile")) return FaMobileScreenButton;
  if (s.includes("headphone") || s.includes("audio")) return FaHeadphones;
  if (s.includes("kitchen") || s.includes("dining")) return FaUtensils;
  if (s.includes("laptop") || s.includes("computer")) return FaLaptop;
  if (s.includes("fashion") || s.includes("shirt")) return FaShirt;
  if (s.includes("sport") || s.includes("outdoor")) return FaDumbbell;
  if (s.includes("watch")) return FaClock;
  return FaStore;
};

const DEFAULT_TINTS = [
  "bg-info/10 border-info/20 text-info",
  "bg-brand/10 border-brand/20 text-brand",
  "bg-purple-500/10 border-purple-500/20 text-purple-400",
  "bg-state-success/10 border-state-success/20 text-state-success",
  "bg-amber-500/10 border-amber-500/20 text-amber-400",
  "bg-rose-500/10 border-rose-500/20 text-rose-400",
];

const PREFERRED_ORDER = [
  "mobile", "smartphone", "smart",
  "laptop", "computer", "shoe", "sneaker",
  "headphone", "audio", "beat",
  "fashion", "apparel", "shirt",
  "furniture", "home", "minimal",
  "watch", "kitchen", "handicraft"
];

const getCategoryRank = (slug) => {
  const s = slug.toLowerCase();
  const index = PREFERRED_ORDER.findIndex((keyword) => s.includes(keyword));
  return index === -1 ? 999 : index;
};

export function CategoryGrid({ categories }) {
  // Sort categories by preferred keywords to maintain consistent order
  const sortedCategories = categories
    ? [...categories].sort((a, b) => getCategoryRank(a.slug) - getCategoryRank(b.slug))
    : [];

  const items = sortedCategories.length > 0
    ? sortedCategories.slice(0, 6).map((c, i) => ({
        slug: c.slug,
        name: c.name,
        Icon: getCategoryIcon(c.slug),
        tint: DEFAULT_TINTS[i % DEFAULT_TINTS.length],
      }))
    : [];

  return (
    <section
      id="categories"
      className="border-b border-border-subtle bg-canvas-elevated/40 py-16"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Curated Collections
            </span>
            <h2 className="mt-1 text-[28px] font-bold text-text-primary">
              Shop by Category
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Explore authentic verified shops and brands across popular categories
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-brand transition-all hover:-translate-y-0.5 hover:border-brand/50"
          >
            Browse all
            <FaArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-6 gap-2 sm:gap-4">
          {items.map((cat) => (
            <CategoryCard key={cat.slug} category={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }) {
  const Icon = category.Icon || FaMobileScreenButton;
  return (
    <Link
      to={`/catalog?category=${category.slug}`}
      className="group flex flex-col items-center rounded-2xl border border-border-subtle bg-surface-card p-2 sm:p-4 lg:p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-brand/60 hover:bg-canvas-hover"
    >
      <div
        className={`mb-2 sm:mb-3.5 flex h-8 w-8 sm:h-10 sm:w-10 lg:h-14 lg:w-14 items-center justify-center rounded-lg sm:rounded-2xl border text-lg sm:text-xl lg:text-2xl transition-transform group-hover:scale-110 ${category.tint}`}
      >
        <Icon />
      </div>
      <h3 className="text-[9px] sm:text-xs lg:text-sm leading-tight font-bold text-text-primary transition-colors group-hover:text-brand">
        {category.name}
      </h3>
    </Link>
  );
}
