import { Link } from "react-router-dom";
import { FaStore } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";

import { PriceDisplay } from "../common/PriceDisplay";

/**
 * "Fresh from vendors this week" — curated row of marketplace finds.
 * Dark-theme variant: surface cards, saffron verified dot.
 */
const FALLBACK_VENDORS = [
  {
    id: "v1",
    slug: "hand-thrown-ceramic-mug",
    name: "Hand-thrown Ceramic Mug",
    vendor: "Mizu Home",
    price: 24,
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "v2",
    slug: "linen-everyday-tote",
    name: "Linen Everyday Tote",
    vendor: "Thread & Loom",
    price: 38,
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "v3",
    slug: "compact-wireless-speaker",
    name: "Compact Wireless Speaker",
    vendor: "Volt & Co",
    price: 59,
    image:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=70",
  },
  {
    id: "v4",
    slug: "handwoven-table-runner",
    name: "Handwoven Table Runner",
    vendor: "No Crafts",
    price: 32,
    image:
      "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?auto=format&fit=crop&w=600&q=70",
  },
];

export function FreshFromVendors({ products }) {
  const items =
    products && products.length > 0
      ? products
          .slice(0, 4)
          .map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            vendor:
              (typeof p.brand === "object" ? p.brand?.name : p.brand) ||
              (typeof p.shop === "object" ? p.shop?.name : p.shop) ||
              "ShopHaat",
            price: parseFloat(p.base_price),
            image: p.thumbnail || p.image,
          }))
      : FALLBACK_VENDORS;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Vendor Picks
          </span>
          <h2 className="mt-1 text-2xl font-bold text-text-primary">
            Fresh from vendors this week
          </h2>
        </div>
        <Link
          to="/catalog?ordering=-created_at"
          className="text-sm font-semibold text-brand hover:text-brand-hover"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <FreshVendorCard key={item.id} item={item} />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-text-secondary">
        New finds from sellers you can count on.
      </p>
    </section>
  );
}

function FreshVendorCard({ item }) {
  return (
    <Link
      to={`/products/${item.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-card-hover"
    >
      <div className="relative aspect-square overflow-hidden bg-canvas-elevated">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
            No image
          </div>
        )}

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-state-success/30 bg-state-success/10 px-2.5 py-1 text-[11px] font-semibold text-state-success backdrop-blur-sm">
          <FaCircleCheck className="h-3 w-3" />
          {item.vendor}
        </span>
      </div>

      <div className="space-y-1 px-4 py-3">
        <p className="line-clamp-2 text-sm font-semibold text-text-primary transition-colors group-hover:text-brand">
          {item.name}
        </p>
        <PriceDisplay price={item.price} size="md" accent="brand" />
      </div>
    </Link>
  );
}
