import { Route, Routes, Navigate } from "react-router-dom";

import { Layout } from "../components/layout/Layout";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { RoleRoute } from "../components/common/RoleRoute";
import { SellerRoute } from "../components/common/SellerRoute";
import { CartPage } from "../pages/CartPage";
import { CatalogPage } from "../pages/CatalogPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OrderSuccessPage } from "../pages/OrderSuccessPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { StorefrontPage } from "../pages/StorefrontPage";
import { AddressesPage } from "../pages/dashboard/AddressesPage";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { OrderDetailPage } from "../pages/dashboard/OrderDetailPage";
import { OrdersPage } from "../pages/dashboard/OrdersPage";
import { ProfilePage } from "../pages/dashboard/ProfilePage";
import { WishlistPage } from "../pages/dashboard/WishlistPage";
import { AdminAnalyticsPage } from "../pages/admin/AdminAnalyticsPage";
import { AdminCatalogPage } from "../pages/admin/AdminCatalogPage";
import { AdminCommissionsPage } from "../pages/admin/AdminCommissionsPage";
import { AdminCouponsPage } from "../pages/admin/AdminCouponsPage";
import { AdminFlashSalesPage } from "../pages/admin/AdminFlashSalesPage";
import { AdminLayout } from "../pages/admin/AdminLayout";
import { AdminOrderDetailPage } from "../pages/admin/AdminOrderDetailPage";
import { AdminOrdersPage } from "../pages/admin/AdminOrdersPage";
import { AdminProductFormPage } from "../pages/admin/AdminProductFormPage";
import { AdminProductsPage } from "../pages/admin/AdminProductsPage";
import { AdminSellerDetailPage } from "../pages/admin/AdminSellerDetailPage";
import { AdminSellerOrderDetailPage } from "../pages/admin/AdminSellerOrderDetailPage";
import { AdminSellerOrdersPage } from "../pages/admin/AdminSellerOrdersPage";
import { AdminSellersPage } from "../pages/admin/AdminSellersPage";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage";
import { AdminSettlementsPage } from "../pages/admin/AdminSettlementsPage";
import { AdminTopProductsPage } from "../pages/admin/AdminTopProductsPage";
import { SellerDashboardPage } from "../pages/seller/SellerDashboardPage";
import { SellerEarningsPage } from "../pages/seller/SellerEarningsPage";
import { SellerApplyGate } from "../pages/seller/SellerApplyGate";
import { SellerInventoryPage } from "../pages/seller/SellerInventoryPage";
import { SellerLayout } from "../pages/seller/SellerLayout";
import { SellerNotificationsPage } from "../pages/seller/SellerNotificationsPage";
import { SellerOrderDetailPage } from "../pages/seller/SellerOrderDetailPage";
import { SellerOrdersPage } from "../pages/seller/SellerOrdersPage";
import { SellerProductFormPage } from "../pages/seller/SellerProductFormPage";
import { SellerProductsPage } from "../pages/seller/SellerProductsPage";
import { SellerStoreProfilePage } from "../pages/seller/SellerStoreProfilePage";
import { useAuth } from "../hooks/useAuth";

function AdminIndexRedirect() {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return <Navigate to="analytics" replace />;
  }
  return <Navigate to="orders" replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="stores/:slug" element={<StorefrontPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="seller/apply" element={<SellerApplyGate />} />

        {/* Everything below requires a logged-in session. */}
        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-success" element={<OrderSuccessPage />} />
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<OrdersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderNumber" element={<OrderDetailPage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Seller Center: gated by SellerRoute (must be role=seller); the
            SellerLayout itself applies the apply-form / pending-screen /
            dashboard switch based on seller-profile status. */}
        <Route element={<SellerRoute />}>
          <Route path="seller" element={<SellerLayout />}>
            <Route index element={<SellerDashboardPage />} />
            <Route path="products" element={<SellerProductsPage />} />
            <Route path="products/new" element={<SellerProductFormPage />} />
            <Route path="products/:slug/edit" element={<SellerProductFormPage />} />
            <Route path="orders" element={<SellerOrdersPage />} />
            <Route path="orders/:id" element={<SellerOrderDetailPage />} />
            <Route path="inventory" element={<SellerInventoryPage />} />
            <Route path="earnings" element={<SellerEarningsPage />} />
            <Route path="store" element={<SellerStoreProfilePage />} />
            <Route path="notifications" element={<SellerNotificationsPage />} />
          </Route>
        </Route>

        {/* Staff/admin console. Coupons and Analytics additionally gate
            themselves down to admin-only via <AdminOnly>, since the
            backend restricts those two to the admin role specifically.
            Marketplace-specific sub-routes (sellers, marketplace-orders,
            settlements) are also admin-only — staff have read-only
            customer-order access. */}
        <Route element={<RoleRoute allowedRoles={["staff", "admin"]} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminIndexRedirect />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:orderNumber" element={<AdminOrderDetailPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductFormPage />} />
            <Route path="products/:slug/edit" element={<AdminProductFormPage />} />
            <Route path="sellers" element={<AdminSellersPage />} />
            <Route path="sellers/:id" element={<AdminSellerDetailPage />} />
            <Route path="seller-orders" element={<AdminSellerOrdersPage />} />
            <Route path="seller-orders/:id" element={<AdminSellerOrderDetailPage />} />
            <Route path="settlements" element={<AdminSettlementsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="flash-sales" element={<AdminFlashSalesPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="top-products" element={<AdminTopProductsPage />} />
            <Route path="commissions" element={<AdminCommissionsPage />} />
            <Route path="catalog" element={<AdminCatalogPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
