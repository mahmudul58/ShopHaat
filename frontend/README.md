# E-Commerce Frontend (Vite + React + Tailwind)

Implements Phase 3 of the build spec against the Phase 2 Django backend.

## Setup

```bash
npm install
cp .env.example .env      # point VITE_API_BASE_URL at your running backend
npm run dev
```

Requires the Phase 2 backend running at the URL in `.env` (default
`http://localhost:8000/api/v1`), with `CORS_ALLOWED_ORIGINS` on the backend
including `http://localhost:5173`.

## Why the code is organized this way (component-based, for readability/debugging)

- **One component, one file, one job.** `Button`, `Input`, `ProductCard`,
  `CartItemRow`, etc. each do exactly one visible thing. If something looks
  wrong on screen, the file to open is named after what you're looking at.
- **`services/` is split by API domain**, not one giant `api.js`. A bug in
  checkout means you open `orderService.js` — not scroll through 300 lines
  of unrelated cart/auth code to find the relevant call.
- **State lives in three contexts, not scattered `useState`s.** `AuthContext`
  (who's logged in), `CartContext` (what's in the cart), `ToastContext`
  (notifications) are the only three sources of cross-page state in the
  app. Every page/component either owns its own local UI state (form
  inputs, "is this dropdown open") or reads from one of these three — there's
  no third option, which makes "where did this value come from" easy to
  answer.
- **Checkout is a single parent (`CheckoutPage`) + 4 dumb step components.**
  `CheckoutPage` is the only place that holds `address`/`shippingMethod`/
  `paymentMethod` state; each step (`AddressStep`, `ShippingStep`,
  `PaymentStep`, `ReviewStep`) just renders based on props and calls back up
  via `onSelect`/`onNext`/`onBack`. None of the steps talk to each other
  directly, so you can debug or restyle one step without touching the rest.
- **Pages compose components; components don't know about routing.**
  `ProductCard` doesn't know if it's rendered on the home page, the catalog
  grid, or the wishlist — it just takes a `product` prop. That's what makes
  it reusable across all three.

## Structure

```
src/
  services/     one file per API domain (auth, catalog, cart, orders, wishlist)
  context/      AuthContext, CartContext, ToastContext (cross-page state)
  hooks/        one-line wrappers (useAuth, useCart, useToast)
  utils/        formatCurrency, shared constants
  components/
    common/     Button, Input, Skeleton, EmptyState, Pagination, Toast, route guards
    layout/     Navbar, MegaMenu, MiniCart, Footer, Layout (page shell)
    product/    everything for browsing/viewing a product
    cart/       cart-page-specific pieces
    checkout/   stepper + one file per checkout step
    orders/     order history + status progress bar
    dashboard/  address book/form, wishlist grid
    home/       homepage sections (hero, categories, trending, brands)
  pages/        one file per route, composing the components above
  router/       AppRouter.jsx — every route in one place
```

## Known gaps (not yet built)

- No automated tests (Phase 4 in the original spec).
- Admin/staff-facing screens (product management, order-status updates,
  coupon management, analytics dashboard) are not built — only the
  customer-facing storefront and dashboard from this phase's brief. The
  backend already exposes all the necessary endpoints for these; add
  `RoleRoute`-guarded pages under e.g. `/admin/...` when needed.
- `npm install` / a real build has not been run in this environment (no
  network access here) — only a TypeScript-based syntax pass across every
  `.js`/`.jsx` file, which came back clean. Run `npm install && npm run dev`
  locally to do a real build/runtime check.
