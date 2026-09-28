import { useEffect, useState } from "react";

import { CategoryGrid } from "../components/home/CategoryGrid";
import { FlashSaleSection } from "../components/home/FlashSaleSection";
import { HeroBanner } from "../components/home/HeroBanner";
import { OnlyForYouSection } from "../components/home/OnlyForYouSection";
import { fetchCategories, fetchProducts } from "../services/catalogService";
import { SEO } from "../components/common/SEO";

/**
 * ShopHaat marketplace homepage.
 *
 * Layout (matches the ShopHaat reference design pixel-for-pixel):
 *   HeroBanner       → trust pill, headline, CTA, 3 trust badges, showcase card
 *   CategoryGrid     → 6 curated categories
 *   FlashSaleSection → 5-col flash deals with live countdown
 *   OnlyForYouSection→ 15 products in 5-col × 3 rows + filter pills + Load more
 *
 * Every inner page uses the same design system, but only the homepage
 * follows the reference layout 1:1.
 */
export function HomePage() {
  const [categories, setCategories] = useState([]);
  const [flashSale, setFlashSale] = useState([]);
  const [onlyForYou, setOnlyForYou] = useState([]);

  const [loading, setLoading] = useState({
    flash: true,
    onlyForYou: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetchCategories()
      .then((data) => { if (!cancelled) setCategories(data.results || data); })
      .catch(() => { if (!cancelled) setCategories([]); });

    // Flash sale — top 5 by biggest discount (highest base_price first).
    fetchProducts({ ordering: "-base_price", page_size: 5 })
      .then((data) => { if (!cancelled) setFlashSale(data.results || []); })
      .catch(() => { if (!cancelled) setFlashSale([]); })
      .finally(() => { if (!cancelled) setLoading((l) => ({ ...l, flash: false })); });

    // "Only For You" — Mix of categories, sorted by highest sales.
    fetchProducts({ ordering: "-sales_count", page_size: 24 })
      .then((data) => { if (!cancelled) setOnlyForYou(data.results || []); })
      .catch(() => { if (!cancelled) setOnlyForYou([]); })
      .finally(() => { if (!cancelled) setLoading((l) => ({ ...l, onlyForYou: false })); });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-canvas">
      <SEO title="ShopHaat — Bangladesh's Trusted Marketplace" />
      <HeroBanner />
      <CategoryGrid categories={categories} />
      <FlashSaleSection products={flashSale} isLoading={loading.flash} />
      <OnlyForYouSection
        products={onlyForYou}
        isLoading={loading.onlyForYou}
      />
    </div>
  );
}
