import {
  FaShippingFast,
  FaShieldAlt,
  FaUndo,
  FaCheckCircle,
  FaHeadset,
} from "react-icons/fa";

const REASONS = [
  {
    icon: FaShippingFast,
    title: "Fast Delivery",
    description: "Nationwide delivery across all 64 districts.",
  },
  {
    icon: FaShieldAlt,
    title: "Secure Payment",
    description: "bKash, Nagad, Rocket, cards & cash on delivery.",
  },
  {
    icon: FaUndo,
    title: "Easy Returns",
    description: "7-day return policy on most products.",
  },
  {
    icon: FaCheckCircle,
    title: "Genuine Products",
    description: "Authentic items from verified sellers.",
  },
  {
    icon: FaHeadset,
    title: "Customer Support",
    description: "7 days a week, in Bangla and English.",
  },
];

/**
 * "Why ShopHaat" — 5 trust pillars matching the reference layout.
 * Dark-theme variant: saffron icons on bg-brand/10 squares.
 */
export function WhyShopWithUs() {
  return (
    <section className="border-y border-border-subtle bg-canvas-elevated/40 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            Why ShopHaat
          </span>
          <h2 className="mt-3 text-2xl font-bold text-text-primary sm:text-3xl">
            Built for Bangladeshi shoppers
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">
            From fast delivery to verified sellers — we sweat the details so
            your shopping experience feels effortless.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.title}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand/60 hover:shadow-card-hover animate-fade-up"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {reason.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {reason.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
