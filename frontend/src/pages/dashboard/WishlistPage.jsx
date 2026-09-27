import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { ProductCardSkeleton } from "../../components/common/Skeleton";
import { WishlistGrid } from "../../components/dashboard/WishlistGrid";
import { useWishlist } from "../../hooks/useWishlist";

export function WishlistPage() {
  const { isLoading } = useWishlist();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Wishlist" },
        ]}
        className="mb-3"
      />
      <h1 className="mb-4 text-xl font-bold text-text-primary sm:text-2xl">
        My Wishlist
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <WishlistGrid />
      )}
    </div>
  );
}
