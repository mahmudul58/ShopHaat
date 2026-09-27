import { useState } from "react";
import { FaTruck, FaUndo, FaShieldAlt, FaInfoCircle } from "react-icons/fa";

import { ReviewForm } from "./ReviewForm";
import { ReviewList } from "./ReviewList";

/**
 * Tabbed section beneath the gallery/info:
 *   Description | Specifications | Delivery | Payment | Returns | Reviews
 *
 * Dark-theme variant: saffron active underline, surface-card panels for
 * specs / info blocks, surface-card list rows for reviews.
 */
const TAB_DEFS = [
  { key: "description", label: "Description" },
  { key: "specs", label: "Specifications" },
  { key: "returns", label: "Return Policy" },
  { key: "reviews", label: "Reviews" },
];

export function ProductTabs({ product, reviews, isLoadingReviews, onSubmitReview, isAuthenticated }) {
  const [active, setActive] = useState("description");

  return (
    <div>
      {/* Tab strip — horizontal scroll on mobile. */}
      <div className="border-b border-border-subtle">
        <nav className="flex gap-1 overflow-x-auto">
          {TAB_DEFS.map((tab) => {
            const count =
              tab.key === "reviews" && product.review_count > 0
                ? ` (${product.review_count})`
                : "";
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active === tab.key
                    ? "border-brand text-brand"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
                {count}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6 max-w-3xl">
        {active === "description" && (
          <div className="prose prose-sm text-text-secondary">
            <p className="leading-relaxed">{product.description}</p>
            {product.subcategory && (
              <p className="mt-4 text-sm text-text-muted">
                Category:{" "}
                <span className="font-medium text-text-secondary">
                  {product.subcategory.name}
                </span>
              </p>
            )}
          </div>
        )}

        {active === "specs" && (
          <div className="overflow-hidden rounded-xl border border-border-subtle">
            <table className="w-full text-sm">
              <tbody>
                <SpecRow label="Brand" value={product.brand?.name} />
                <SpecRow label="Category" value={product.subcategory?.name} />
                <SpecRow
                  label="Variants"
                  value={`${product.variants?.length || 0} available`}
                />
                <SpecRow
                  label="Base Price"
                  value={`৳${parseFloat(product.base_price).toLocaleString()}`}
                />
                <SpecRow label="SKU" value={selectedSku(product)} />
              </tbody>
            </table>
          </div>
        )}



        {active === "returns" && (
          <InfoBlock
            icon={FaUndo}
            title="Return & Refund Policy"
            items={[
              "7-day return window from delivery date",
              "Product must be unused and in original packaging",
              "Full refund processed within 5 business days",
              "Contact support to initiate a return",
            ]}
          />
        )}

        {active === "reviews" && (
          <div className="space-y-6">
            {isAuthenticated && (
              <ReviewForm onSubmit={onSubmitReview} />
            )}
            <ReviewList reviews={reviews} isLoading={isLoadingReviews} />
          </div>
        )}
      </div>
    </div>
  );
}

function SpecRow({ label, value }) {
  return (
    <tr className="border-b border-border-subtle last:border-b-0">
      <td className="bg-canvas-elevated px-4 py-3 font-medium text-text-secondary">{label}</td>
      <td className="px-4 py-3 text-text-secondary">{value || "—"}</td>
    </tr>
  );
}

function selectedSku(product) {
  return product.variants?.[0]?.sku || "—";
}

function InfoBlock({ icon: Icon, title, items }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand" />
        <h3 className="font-semibold text-text-primary">{title}</h3>
      </div>
      <ul className="space-y-2 text-sm text-text-secondary">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <FaInfoCircle className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
