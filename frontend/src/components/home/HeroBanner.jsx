import { Link } from "react-router-dom";
import { FaBolt, FaTruck, FaStore, FaArrowRight, FaCircleCheck } from "react-icons/fa6";
import { FaShieldAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";

/**
 * ShopHaat marketplace Hero.
 * Scales perfectly like an image (fixed aspect ratio) on all devices using CSS.
 */
export function HeroBanner() {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Calculate scale based on the actual container width.
        const containerWidth = entry.contentRect.width;
        setScale(Math.min(1, containerWidth / 1200));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative w-full border-b border-border-subtle bg-canvas overflow-hidden flex justify-center">
      {/* We use a spacer to force the exact aspect ratio height so the container never collapses to 0. 
          The desktop banner is exactly 1200px by ~560px. */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-[1200px]"
        style={{ aspectRatio: "1200/560" }}
      >
        <div 
          className="absolute top-0 left-0 w-[1200px] h-[560px] origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <div className="relative h-full w-full py-16 px-6">
            {/* Soft saffron + blue radial glows */}
            <div className="pointer-events-none absolute top-1/2 left-1/4 -z-0 h-[550px] w-[550px] -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" />
            <div className="pointer-events-none absolute top-1/3 right-10 -z-0 h-[420px] w-[420px] rounded-full bg-info/10 blur-[130px]" />

            <div className="relative h-full grid grid-cols-12 items-center gap-14">
              {/* ───── Left column ───── */}
              <div className="col-span-6 space-y-6 text-left">

                <h1 className="font-sans text-[52px] font-extrabold leading-[1.15] tracking-tight text-text-primary">
                  One marketplace, every shop you{" "}
                  <span className="text-brand">trust.</span>
                </h1>

                <p className="max-w-xl text-lg font-normal leading-relaxed text-text-secondary">
                  Shop verified sellers, fair prices, and authentic products delivered
                  right to your doorstep across Bangladesh with guaranteed buyer
                  protection.
                </p>

                <div className="flex items-center justify-start gap-4 pt-2">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3.5 text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-hover"
                  >
                    Start shopping
                    <FaArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Trust badges row */}
                <div className="grid grid-cols-3 gap-5 border-t border-border-subtle pt-8 text-left">
                  <TrustBadge
                    icon={FaShieldAlt}
                    title="100% COD"
                    desc="Cash on Delivery & Easy Return"
                  />
                  <TrustBadge
                    icon={FaTruck}
                    title="24–48h Delivery"
                    desc="Across all 64 Districts"
                  />
                  <TrustBadge
                    icon={FaStore}
                    title="12,000+ Shops"
                    desc="100% Authentic & Verified"
                  />
                </div>
              </div>

              {/* ───── Right column — showcase card ───── */}
              <div className="col-span-6 relative z-10 flex h-full items-center">
                <div className="group relative w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-modal">
                  {/* Showcase hero image */}
                  <img
                    alt="ShopHaat Studio Showcase"
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Bottom overlay badge */}
                  <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-canvas-elevated/90 p-4 backdrop-blur-md">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-lg text-brand">
                        <FaBolt />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-brand">
                            MEGA FAIR LIVE
                          </span>
                          <span className="rounded-full bg-state-success px-2 py-0.5 text-[10px] font-bold text-white">
                            ACTIVE
                          </span>
                        </div>
                        <div className="mt-0.5 text-sm font-semibold text-text-primary">
                          Up to 40% OFF on Audio & Wearables
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-text-secondary">Verified Seller</span>
                      <span className="flex items-center gap-1 text-xs font-bold text-state-success">
                        <FaCircleCheck className="text-[11px]" /> Aura Studio
                      </span>
                    </div>
                  </div>

                  {/* Floating "Deal of the Day" pill */}
                  <div className="absolute top-5 right-5 flex items-center gap-2 rounded-full border border-brand/30 bg-canvas/90 px-3.5 py-1.5 text-xs font-bold text-text-primary backdrop-blur-sm">
                    <span className="text-brand">⚡ Deal of the Day</span>
                    <span className="text-text-secondary">•</span>
                    <span className="text-state-success">-35% OFF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBadge({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-canvas-elevated text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-text-primary">{title}</h4>
        <p className="text-[11px] text-text-secondary">{desc}</p>
      </div>
    </div>
  );
}
