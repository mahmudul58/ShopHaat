import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Vite dev server config.
 *
 * Why these settings matter when you see ERR_CONNECTION_REFUSED / RESET:
 *  - `host: true`  → binds to 0.0.0.0 instead of just localhost. Some
 *    browsers / corporate networks / VPN adapters reject "localhost" with
 *    a TCP RST after a few requests. Listening on all interfaces plus
 *    the explicit `usePolling: true` flag cures the most common cases.
 *  - `strictPort: false` → if 5173 is taken, Vite will try 5174, 5175…
 *    and tell you which URL to open, instead of crashing silently.
 *  - `clearScreen: false` → keeps error messages visible across reloads.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,            // listen on 0.0.0.0 (use 127.0.0.1 if you prefer)
    port: 5173,
    strictPort: false,     // auto-bump if 5173 is busy
    open: false,           // don't auto-open the browser
    cors: true,            // permissive CORS for the proxy
    hmr: {
      // Polling helps on Windows / WSL / Docker / corporate networks
      // where native WebSocket HMR packets get dropped.
      clientPort: 5173,
    },
    watch: {
      // Polling watcher is more reliable when the project sits on a
      // network mount (OneDrive, Dropbox, WSL, Docker bind-mount).
      usePolling: true,
      interval: 300,
    },
    proxy: {
      // Forward API and media requests to Django so the SPA can use
      // same-origin URLs (no CORS, no mixed content).
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/media": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    // Fail loudly on any PostCSS / syntax error so we never get a blank
    // bundle that runs but renders nothing.
    sourcemap: true,
  },
});
