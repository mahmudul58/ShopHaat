from django.urls import path

from .views import (
    AdminOrderListView,
    AdminUpdateOrderStatusView,
    CancelOrderView,
    CustomerReturnRequestView,
    OrderDetailView,
    OrderListCreateView,
    ShippingMethodListView,
)

urlpatterns = [
    path("shipping-methods/", ShippingMethodListView.as_view(), name="shipping-methods"),
    path("orders/", OrderListCreateView.as_view(), name="order-list-create"),
    path("orders/<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<str:order_number>/cancel/", CancelOrderView.as_view(), name="order-cancel"),
    path("orders/<str:order_number>/return/", CustomerReturnRequestView.as_view(), name="order-return"),
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    path(
        "admin/orders/<str:order_number>/status/",
        AdminUpdateOrderStatusView.as_view(),
        name="admin-order-status",
    ),
]
