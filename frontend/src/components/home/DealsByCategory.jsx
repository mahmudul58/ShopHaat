import { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

import { ProductCard } from "../product/ProductCard";
import { SectionHeader } from "../common/SectionHeader";

/**
 * "Deals by Category" — tabbed section. Dark-theme variant: saffron
 * underline on active tab, dark elevated section bg.
 */
export function DealsByCategory({ buckets = [] }) {
  const [activeTab, setActiveTab] = useState(buckets[0]?.category?.id || null);

  if (!buckets.length) return null;

  const active =
    buckets.find((b) => b.category.id === activeTab) || buckets[0];

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <SectionHeader
        title="Deals by Category"
        subtitle="Curated picks from each category"
      />

      {/* Tab strip */}
      <div className="mb-8 flex flex-wrap gap-1 border-b border-border-subtle">
        {buckets.map((bucket) => {
          const isActive = bucket.category.id === active?.category.id;
          return (
            <button
              key={bucket.category.id}
              onClick={() => setActiveTab(bucket.category.id)}
              className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {bucket.category.name}
              {isActive && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
        <Link
          to={`/catalog?category=${active.category.slug}`}
          className="ml-auto inline-flex items-center gap-1 self-center rounded-full bg-surface-card px-3 py-1.5 text-xs font-semibold text-brand transition-all hover:bg-brand/15"
        >
          See more <FaArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {active.products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
