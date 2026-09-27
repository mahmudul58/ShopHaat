/**
 * ShopHaat "Modern Bangladeshi Multi-Vendor Marketplace"
 *  Dark navy canvas + saffron orange CTA — a premium, conversion-focused
 *  dark theme for BD e-commerce. Tokens are the single source of truth;
 *  components must reference these names, never raw hex.
 *
 *  Token strategy:
 *  - `theme.extend.colors` MERGES with Tailwind's full default palette,
 *    so utilities like `text-rose-400`, `bg-cyan-500/10`, `text-amber-400`
 *    keep working alongside our ShopHaat tokens.
 *  - The `safelist` (with regex patterns) explicitly forces generation of
 *    every brand-tinted chip, status pill, border, and ring used by
 *    ShopHaat, regardless of whether JIT has scanned them yet on a
 *    fresh build or after a Vite hot reload.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,css}",
  ],
  // ── SAFELIST ──────────────────────────────────────────────────────────
  // Vite/Tailwind sometimes drops utility classes that are only referenced
  // dynamically or that live in conditional templates. We force-generate
  // every ShopHaat chip, tint, and status pill here so the design never
  // falls back to black & white.
  safelist: [
    // Shadows, radii, z-index, and animation utilities we rely on.
    "shadow-card",
    "shadow-card-hover",
    "shadow-elevated",
    "shadow-modal",
    "shadow-float",
    "shadow-xs",
    "shadow-focus",
    "rounded-card",
    "animate-fade-up",
    "animate-fade-in",
    "animate-pulse-soft",
    "animate-shimmer",
    "z-drawer",
    "z-modal",
    "z-toast",
    "bg-hero-navy",
    "bg-brand-gradient",
    "bg-brand-gradient-hover",
    "bg-sale-gradient",
    "bg-mesh-warm",
    "bg-stall-grid",
  ],
  theme: {
    extend: {
      colors: {
        transparent: "transparent",
        current: "currentColor",
        black: "#000000",
        white: "#ffffff",
        // ── ShopHaat surfaces ───────────────────────────────────────────
        canvas: {
          DEFAULT: "#080F1C",   // base page backdrop
          elevated: "#0D1626",   // header / footer / sidebars
          hover: "#15243D",      // interactive elevated hover (cards)
        },
        surface: {
          card: "#111D30",       // product cards, modals, panels
          elevated: "#0D1626",   // alias of canvas.elevated
          overlay: "#0A1424",    // semi-transparent overlay tint
        },
        "surface-alt": {
          0: "#FFFFFF",
          50: "#FBF7F0",
          100: "#F6F1E9",
          200: "#EBE3D4",
        },
        // ── Border / divider ────────────────────────────────────────────
        border: {
          subtle: "#1E2A3D",
          strong: "#2A3B57",
        },
        // ── Text ────────────────────────────────────────────────────────
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B",
        },
        // ── Brand (saffron orange CTA) ─────────────────────────────────
        brand: {
          DEFAULT: "#FF6B3D",
          hover: "#FF7F55",
          active: "#E85A2C",
        },
        // ── Semantic state ──────────────────────────────────────────────
        state: {
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#38BDF8",
        },
        // ── Legacy aliases ──────────────────────────────────────────────
        navy: {
          50: "#E8EBF2",
          100: "#C4CCDC",
          200: "#8C99B4",
          300: "#576687",
          400: "#2E3F5C",
          500: "#1E2D47",
          600: "#152238",
          700: "#0D1626",
          800: "#080F1C",
          900: "#04080F",
        },
        coral: {
          50: "#FDF1EB",
          100: "#FBD9C7",
          200: "#F6B89C",
          300: "#F19574",
          400: "#FF6B3D",
          500: "#E85A2C",
          600: "#D85F36",
          700: "#913719",
        },
        sage: {
          50: "#EEF3EE",
          100: "#D7E2D8",
          200: "#BFCEC1",
          300: "#9BB59C",
          400: "#7A9C7C",
          500: "#22C55E",
          600: "#3F5A41",
          700: "#2A3D2C",
        },
        cream: {
          50: "#0D1626",
          100: "#111D30",
          200: "#1E2A3D",
          300: "#D9CDB6",
          400: "#B7A485",
        },
        ink: {
          50: "#F8FAFC",
          100: "#E2E8F0",
          200: "#CDD2DB",
          300: "#94A3B8",
          400: "#64748B",
          500: "#475569",
          600: "#1E2A3D",
          700: "#152238",
          800: "#0D1626",
          900: "#080F1C",
        },
        sale: {
          50: "#FEEAE6",
          100: "#FBD0C5",
          500: "#FF6B3D",
          600: "#E85A2C",
          700: "#B84A26",
        },
        success: {
          50: "rgba(34,197,94,0.10)",
          100: "rgba(34,197,94,0.20)",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          50: "#FFF8E1",
          100: "#FFECB3",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        danger: {
          50: "#FFEBEE",
          100: "#FFCDD2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#991B1B",
        },
        info: {
          50: "rgba(56,189,248,0.10)",
          100: "rgba(56,189,248,0.20)",
          500: "#38BDF8",
          600: "#0EA5E9",
          700: "#0284C7",
        },
        shop: {
          50: "#0D1626",
          100: "#111D30",
        },
      },

      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "'Inter'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "6px",
        md: "10px",
        DEFAULT: "12px",
        lg: "16px",
        card: "14px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.32)",
        card: "0 2px 8px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.02)",
        "card-hover":
          "0 4px 12px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,107,61,0.35)",
        float: "0 8px 24px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.32)",
        modal: "0 18px 40px rgba(0,0,0,0.55), 0 6px 14px rgba(0,0,0,0.40)",
        elevated: "0 8px 24px rgba(0,0,0,0.48)",
        focus: "0 0 0 3px rgba(255,107,61,0.32)",
        "inner-cream": "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      backdropBlur: {
        glass: "12px",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #FF8A65 0%, #FF6B3D 60%, #E85A2C 100%)",
        "brand-gradient-hover":
          "linear-gradient(135deg, #FF6B3D 0%, #E85A2C 60%, #B84A26 100%)",
        "hero-navy":
          "linear-gradient(135deg, #0D1626 0%, #080F1C 100%)",
        "sale-gradient":
          "linear-gradient(135deg, #FF6B3D 0%, #E85A2C 100%)",
        "mesh-warm":
          "radial-gradient(at 20% 20%, rgba(255,107,61,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(56,189,248,0.10) 0px, transparent 50%), radial-gradient(at 0% 80%, rgba(34,197,94,0.06) 0px, transparent 50%)",
        "stall-grid":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tighter: "-0.02em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out-soft": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      zIndex: {
        drawer: "40",
        modal: "50",
        toast: "60",
      },
    },
  },
  plugins: [],
};

