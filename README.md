# 🛒 ShopHaat — Multi-Vendor E-Commerce Marketplace

> **"One marketplace, every shop you trust."**  
> ShopHaat is a full-stack, multi-vendor e-commerce platform designed to bridge the gap between verified sellers and eager buyers. Built with modern web technologies, it delivers a seamless shopping experience with secure checkouts, real-time order tracking, and a powerful dashboard ecosystem tailored for both vendors and administrators.

[![Django](https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16-A30000)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

![ShopHaat Home](./Screenshots/home.png)

ShopHaat is a complete marketplace web application where buyers can browse curated collections from verified sellers, manage carts and wishlists, and check out with Cash on Delivery. Dedicated dashboards empower sellers to manage products and orders, while admins have full oversight of the platform.

---

## ✨ Features

### 🛍️ For Buyers
- **Extensive Catalog:** Browse products with search and category navigation.
- **Rich Product Pages:** View detailed product descriptions, user reviews, ratings, and related items.
- **Seamless Shopping:** Enjoy a persistent cart and wishlist across sessions.
- **Easy Checkout:** Multi-step checkout.
- **Order Tracking & Savings:** Support for coupon codes and complete order history.

### 🏪 For Sellers
- **Dedicated Dashboard:** Manage inventory, products, and incoming orders seamlessly.
- **Trust & Verification:** Verified seller badge prominently displayed on the storefront to build buyer trust.
- **Product Management:** Full CRUD capabilities with image uploads, stock tracking, and pricing control.

### 🛡️ For Admins
- **Global Dashboard:** A powerful admin interface for platform-wide oversight.
- **Comprehensive Control:** Manage sellers, products, coupons, user reviews, and all platform orders.

### ⚙️ Platform & Architecture
- **Secure Authentication:** JWT-based authentication (access + refresh tokens).
- **Role-Based Access Control:** Secure boundaries between Buyers, Sellers, and Admins.
- **Robust API:** Django REST Framework nested routing, filtering, and pagination.
- **CORS-Enabled:** Fully prepared API for seamless communication with the React frontend.

---

## 🛠️ Tech Stack

### Frontend (`/frontend`)
- **React 18 + Vite** for blazing-fast development and optimized production builds.
- **React Router v6** for declarative, dynamic routing.
- **Tailwind CSS** for a responsive, utility-first UI.
- **Axios** for robust HTTP requests.
- **React Helmet Async** for SEO and per-page meta tags.
- **React Icons** for beautiful, lightweight iconography.

### Backend (`/backend`)
- **Django 5 + Django REST Framework** for a powerful, scalable API.
- **SimpleJWT** for secure token-based authentication.
- **django-filter & drf-nested-routers** for advanced querying and clean URL structures.
- **django-cors-headers** to securely connect frontend and backend.
- **python-decouple** for seamless environment variable management.
- **PostgreSQL** as the primary relational database for robust data handling.

---

## 📸 Screenshots

### Home
<img src="./Screenshots/home.png" alt="Home" width="800"/>

*The welcoming storefront featuring dynamic banners, mega fair deals, and quick access to top categories.*

### Product Catalog
<img src="./Screenshots/catalog.png" alt="Catalog" width="800"/>

*A powerful browsing experience with smart search, intuitive filtering, and a clean grid layout.*

### Product Details
<img src="./Screenshots/product-details-page.png" alt="Product Details" width="800"/>

*Comprehensive product pages displaying high-quality images, detailed specifications, and verified customer reviews.*

### Cart
<img src="./Screenshots/cart.png" alt="Cart" width="800"/>

*A persistent and user-friendly shopping cart that makes reviewing and managing your selected items a breeze.*

### Checkout Flow
<img src="./Screenshots/checkout.png" alt="Checkout" width="800"/>

*A streamlined, multi-step checkout process ensuring a secure and hassle-free payment experience.*

### Seller Dashboard
<img src="./Screenshots/seller-dashboard.png" alt="Seller Dashboard" width="800"/>

*An exclusive, data-rich dashboard empowering sellers to effortlessly manage their inventory, orders, and shop analytics.*

### Admin Dashboard
<img src="./Screenshots/admin-dashboard.png" alt="Admin Dashboard" width="800"/>

*A centralized control center for platform administrators to oversee users, manage products, and monitor global store operations.*

---

## 🚀 Getting Started

Follow these steps to set up ShopHaat locally.

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & npm
- **Git**
- **PostgreSQL** (running locally or via cloud/Docker)

### 1. Clone the Repository
```bash
git clone https://github.com/mahmudul58/ShopHaat.git
cd ShopHaat
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows use: venv\Scripts\activate
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# (Ensure your PostgreSQL credentials match settings.py or DATABASE_URL in .env)

# Run migrations and start the server
python manage.py migrate
python manage.py createsuperuser  # Optional: Create an admin account
python manage.py runserver
```
*The API will be running at `http://localhost:8000`.*

### 3. Frontend Setup
```bash
# Open a new terminal instance
cd frontend

# Set up environment variables
cp .env.example .env  # Make sure VITE_API_BASE_URL is set correctly

# Install dependencies and start the dev server
npm install
npm run dev
```
*The app will be running at `http://localhost:5173`.*

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
| Variable | Example Value | Description |
| --- | --- | --- |
| `SECRET_KEY` | `change-me` | Django cryptographic secret key |
| `DEBUG` | `True` | Enable/Disable debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `DATABASE_URL` | `postgres://user:password@localhost:5432/ShopHaat` | PostgreSQL connection string |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed frontend origins |

### Frontend (`frontend/.env`)
| Variable | Example Value | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Backend API base URL |

---

## 📡 API Overview

All API endpoints are mounted under `/api/` and return JSON responses. Authentication uses JWT Bearer tokens (`/api/auth/token/` and `/api/auth/token/refresh/`).

| App | Endpoint Prefix | Purpose |
| --- | --- | --- |
| **Accounts** | `/api/accounts/` | Registration, login, profile management |
| **Catalog** | `/api/catalog/` | Products, categories, searching, filtering |
| **Cart** | `/api/cart/` | Cart and cart items management |
| **Orders** | `/api/orders/` | Orders processing, checkout, order history |
| **Coupons** | `/api/coupons/` | Coupon validation & redemption |
| **Reviews** | `/api/reviews/` | Product reviews and ratings |
| **Wishlist** | `/api/wishlist/` | User wishlists |
| **Marketplace**| `/api/marketplace/`| Sellers, store profiles, and seller analytics |

---

## 🗺️ Project Structure

```text
ShopHaat/
├── backend/                # Django + DRF API Backend
│   ├── apps/
│   │   ├── accounts/       # User models, JWT authentication
│   │   ├── catalog/        # Products, categories, attributes
│   │   ├── cart/           # Shopping cart functionality
│   │   ├── orders/         # Order processing
│   │   ├── coupons/        # Discount code system
│   │   ├── reviews/        # Rating and review system
│   │   ├── wishlist/       # User wishlists
│   │   ├── marketplace/    # Seller & store management
│   │   └── core/           # Shared core utilities
│   ├── config/             # Django settings & routing
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # React + Vite Frontend
│   ├── src/
│   │   ├── pages/          # Route-level views
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Global state (Auth, Cart)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # Axios API client integrations
│   │   ├── router/         # Application routing definitions
│   │   └── utils/          # Helper functions
│   ├── index.html
│   └── package.json
└── Screenshots/            # Project showcase visuals
```