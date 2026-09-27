# E-Commerce Backend (Django REST Framework)

Implements Phase 2 of the build spec: custom JWT auth, full product catalog,
cart, coupons, atomic checkout with stock locking, order state machine,
reviews with verified-purchase gating, wishlist, and admin analytics.

## Setup

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then edit DB credentials, SECRET_KEY, etc.

# Create the Postgres database first (matching .env), then:
python manage.py makemigrations
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Seed data creates three accounts (all under `apps/catalog/management/commands/seed_data.py`):

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | AdminPass123! |
| Staff | staff@example.com | StaffPass123! |
| Customer | customer@example.com | CustomerPass123! |

**Change or remove these before any real deployment.**

## Notes on design decisions / deviations worth knowing about

- **Product management endpoints** live at `/api/v1/products/` (not under an
  `/admin/` prefix) — the same endpoint serves public `GET` and staff/admin
  `POST`/`PATCH`/`DELETE`, enforced by the `ReadOnlyOrStaff` permission class.
  This is a common, equally valid REST pattern; the Phase 1 spec's literal
  `/admin/products/...` path was not used verbatim. Coupons, review
  moderation, and analytics *do* sit under `/admin/` as specced, since those
  have no public-read counterpart.
- **Search** uses DRF's `SearchFilter` across `name`, `description`, and
  `brand__name`. The Phase 1 ERD mentioned a Postgres `SearchVectorField` for
  full-text search — that's a valid upgrade path (better relevance ranking,
  a `GinIndex`) but was left out here to avoid extra `django.contrib.postgres`
  setup for a v1. Swap it in later if search quality becomes a problem.
- **`ShippingMethod`** was added (not in the original ERD's table list) because
  the API spec calls for a `/shipping-methods/` endpoint that checkout step 2
  needs data from.
- No migrations are included in this delivery — run `makemigrations` after
  installing dependencies and pointing at a real Postgres database, since
  migration files are generated from the installed Django/Postgres version.

## Running tests (Phase 4 — not yet implemented)

Phase 2 delivers models, views, and business logic only. Automated tests
(`pytest-django`) covering auth, permissions, coupon edge cases, stock
concurrency, and order-status transitions are Phase 4 and are not included
in this delivery.
