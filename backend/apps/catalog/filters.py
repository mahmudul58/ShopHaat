import django_filters as filters

from .models import Product


class ProductFilter(filters.FilterSet):
    category = filters.CharFilter(field_name="subcategory__category__slug")
    subcategory = filters.CharFilter(field_name="subcategory__slug")
    brand = filters.CharFilter(field_name="brand__slug")
    min_price = filters.NumberFilter(field_name="base_price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="base_price", lookup_expr="lte")
    min_rating = filters.NumberFilter(field_name="average_rating", lookup_expr="gte")
    in_stock = filters.BooleanFilter(method="filter_in_stock")

    seller = filters.CharFilter(field_name="seller__store_slug")

    class Meta:
        model = Product
        fields = ["category", "subcategory", "brand", "min_price", "max_price", "min_rating", "in_stock", "seller"]

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(variants__stock__gt=0).distinct()
        return queryset
