import { BrowserRouter } from "react-router-dom";

import { ConfirmDialogProvider } from "./components/common/ConfirmDialog";
import { ToastContainer } from "./components/common/Toast";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ToastProvider } from "./context/ToastContext";
import { AppRouter } from "./router/AppRouter";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <ConfirmDialogProvider>
                <AppRouter />
                <ToastContainer />
              </ConfirmDialogProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
