import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as wishlistService from "../services/wishlistService";
import { AuthContext } from "./AuthContext";

export const WishlistContext = createContext(null);

/**
 * Centralized wishlist state. Mirrors CartContext:
 *  - auto-fetches when auth flips on
 *  - clears when logged out
 *  - exposes addItem/removeItem/refresh
 */
export function WishlistProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await wishlistService.fetchWishlist();
      setItems(data);
    } catch {
      // Soft-fail: keep last-known items but don't blow up the page.
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId) => {
      await wishlistService.addToWishlist(productId);
      await refresh();
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (itemId) => {
      await wishlistService.removeFromWishlist(itemId);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({ items, isLoading, refresh, addItem, removeItem }),
    [items, isLoading, refresh, addItem, removeItem]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
