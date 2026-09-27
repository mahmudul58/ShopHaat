import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as cartService from "../services/cartService";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], subtotal: 0 });
      return;
    }
    setIsLoading(true);
    try {
      const data = await cartService.fetchCart();
      setCart(data);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(
    async (variantId, quantity = 1) => {
      await cartService.addCartItem({ variantId, quantity });
      await refreshCart();
    },
    [refreshCart]
  );

  const updateItem = useCallback(
    async (itemId, quantity) => {
      await cartService.updateCartItem(itemId, quantity);
      await refreshCart();
    },
    [refreshCart]
  );

  const removeItem = useCallback(
    async (itemId) => {
      await cartService.removeCartItem(itemId);
      await refreshCart();
    },
    [refreshCart]
  );

  const itemCount = useMemo(
    () => cart.items.reduce((total, item) => total + item.quantity, 0),
    [cart.items]
  );

  const value = useMemo(
    () => ({ cart, isLoading, itemCount, refreshCart, addItem, updateItem, removeItem }),
    [cart, isLoading, itemCount, refreshCart, addItem, updateItem, removeItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
