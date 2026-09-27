import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaHeadset,
} from "react-icons/fa";
import { FaXTwitter, FaBagShopping, FaLocationDot } from "react-icons/fa6";

/**
 * ShopHaat footer — matches the reference design pixel-for-pixel.
 *
 * 5 columns on desktop (lg:grid-cols-5):
 *   1. Brand & Contact  — logo, tagline, helpline, email, social icons
 *   2. Customer Care
 *   3. Sell with ShopHaat
 *   4. About ShopHaat
 *   5. Payment Methods + Delivery Partners
 *
 * Bottom bar: copyright · Terms · Privacy · Return Policy.
 */

const CUSTOMER_CARE = [
  { label: "Help Center & FAQ", to: "/" },
  { label: "Order Tracking", to: "/dashboard/orders" },
  { label: "Cash on Delivery Policy", to: "/" },
  { label: "7 Days Easy Return & Refund Policy", to: "/" },
  { label: "64 Districts Delivery Coverage", to: "/" },
];

const SELLER_LINKS = [
  { label: "Become a Seller", to: "/seller" },
  { label: "Seller Center Login", to: "/login" },
  { label: "Seller Hub & Policies", to: "/" },
  { label: "Payouts & Commission", to: "/" },
  { label: "Seller Support Hotline", to: "/" },
];

const ABOUT_LINKS = [
  { label: "About Us", to: "/" },
  { label: "Authentic Guarantee", to: "/" },
  { label: "Careers", to: "/" },
  { label: "Press & Media", to: "/" },
];

const PAYMENT_METHODS = [
  "bKash",
  "Nagad",
  "Rocket",
  "Upay",
  "Visa",
  "Mastercard",
  "COD (Cash)",
  "EMI",
];

const DELIVERY_PARTNERS = ["Pathao", "Paperfly", "RedX", "Steadfast"];

const SOCIALS = [
  { Icon: FaFacebookF, label: "Facebook" },
  { Icon: FaXTwitter, label: "X" },
  { Icon: FaInstagram, label: "Instagram" },
  { Icon: FaYoutube, label: "YouTube" },
];

export function Footer() {
  const { user } = useAuth();
  
  const sellerLinks = SELLER_LINKS.map(link => 
    link.label === "Become a Seller" && !user 
      ? { ...link, to: "/register?type=seller" } 
      : link
  );

  return (
    <footer className="border-t border-border-subtle bg-[#070D18] pt-16 pb-12 text-text-secondary">
      <div className="mx-auto max-w-7xl px-6">
        {/* ───── 5-column grid ───── */}
        <div className="grid grid-cols-1 gap-10 border-b border-border-subtle/70 pb-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Col 1 — Brand & contact */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand">
                <FaBagShopping className="text-base" />
              </div>
              <span className="text-2xl font-black text-text-primary">
                Shop<span className="text-brand">Haat</span>
              </span>
            </Link>

            <p className="text-xs leading-relaxed text-text-secondary">
              Bangladesh&apos;s leading verified multi-vendor marketplace.
              Authentic products, cash on delivery, and express home delivery
              to all 64 districts.
            </p>

            <div className="space-y-1.5 pt-2 text-xs">
              <div className="font-semibold text-text-primary">
                Customer Helpline (9 AM - 10 PM):
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                <FaHeadset className="text-brand" /> +880 9612-400800
              </div>
              <div className="text-text-secondary">support@shophaat.com.bd</div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              {SOCIALS.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-canvas-elevated text-xs text-text-secondary transition-colors hover:border-brand hover:text-brand"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Customer Care */}
          <FooterColumn title="Customer Care" links={CUSTOMER_CARE} />

          {/* Col 3 — Sell with ShopHaat */}
          <FooterColumn title="Sell with ShopHaat" links={sellerLinks} />

          {/* Col 4 — About ShopHaat */}
          <FooterColumn title="About ShopHaat" links={ABOUT_LINKS} extraRow>
            <li className="flex items-center gap-1.5 pt-1 text-text-primary">
              <FaLocationDot className="text-brand" /> Banani, Dhaka - 1213
            </li>
          </FooterColumn>

          {/* Col 5 — Payment + Delivery */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-primary">
              Payment Methods
            </h4>
            <div className="mb-4 flex flex-wrap gap-1.5 items-center text-[11px] text-text-primary">
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method}
                  className="rounded border border-border-subtle bg-canvas-elevated px-2 py-0.5"
                >
                  {method}
                </span>
              ))}
            </div>

            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-primary">
              Delivery Partners
            </h4>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-text-primary">
              {DELIVERY_PARTNERS.map((d) => (
                <span
                  key={d}
                  className="rounded border border-border-subtle bg-canvas-elevated px-2 py-0.5"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ───── Bottom bar ───── */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-text-secondary sm:flex-row">
          <div>
            © 2026{" "}
            <span className="font-semibold text-text-primary">
              ShopHaat Bangladesh Ltd.
            </span>{" "}
            All rights reserved.
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/terms" className="transition-colors hover:text-text-primary">
              Terms of Service
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-text-primary">
              Privacy Policy
            </Link>
            <Link to="/returns" className="transition-colors hover:text-text-primary">
              Return Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links = [], extraRow = false, children }) {
  return (
    <div>
      <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-primary">
        {title}
      </h4>
      <ul className="space-y-2 text-xs">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
        {extraRow && children}
      </ul>
    </div>
  );
}
