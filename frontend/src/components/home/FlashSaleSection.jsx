import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBolt, FaArrowRight, FaRegHeart, FaStar } from "react-icons/fa";
import { FaCartShopping } from "react-icons/fa6";

import { ProductCard } from "../product/ProductCard";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";

/**
 * Flash-sale section matching the ShopHaat reference.
 * Header: ⚡ Flash Sale + Ending Soon badge + countdown timer + "See all"
 * Body: 5-col product grid (lg), 3-col (md), 2-col (sm), 1-col (mobile).
 */
const FLASH_END = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(23, 59, 59, 0);
  return d;
})();

function useCountdown(target) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  return { hours, mins, secs };
}

const Pad = (n) => String(n).padStart(2, "0");

export function FlashSaleSection({ products, isLoading }) {
  const { hours, mins, secs } = useCountdown(FLASH_END);

  return (
    <section
      id="sale"
      className="relative border-b border-border-subtle py-16"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header row */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-border-subtle pb-6 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-text-primary sm:text-3xl">
              <span className="text-brand">⚡</span> Flash Sale
            </h2>
            <div className="rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
              Ending Soon
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
              <CountBox value={Pad(hours)} />
              <span className="font-bold text-brand">:</span>
              <CountBox value={Pad(mins)} />
              <span className="font-bold text-brand">:</span>
              <CountBox value={Pad(secs)} highlight />
            </div>
          </div>
          <Link
            to="/catalog?ordering=-base_price"
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-canvas-elevated px-4 py-2 text-sm font-semibold text-text-primary transition-all hover:border-brand"
          >
            See all deals
            <FaArrowRight className="h-3 w-3 text-brand" />
          </Link>
        </div>

        {/* 5-col flash deals grid (matches reference) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <FlashDealSkeleton key={i} />
              ))
            : products.slice(0, 5).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
        </div>
      </div>
    </section>
  );
}

function CountBox({ value, highlight = false }) {
  return (
    <span
      className={`rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 text-sm ${
        highlight ? "text-brand" : "text-text-primary"
      }`}
    >
      {value}
    </span>
  );
}



function FlashDealSkeleton() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-3.5">
      <div className="mb-3 aspect-square animate-pulse rounded-xl bg-canvas-elevated" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-canvas-elevated" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-canvas-elevated" />
      <div className="mt-3 h-6 w-full animate-pulse rounded bg-canvas-elevated" />
    </div>
  );
}
