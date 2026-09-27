import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

/**
 * Top-level Error Boundary — ensures the user NEVER sees a blank white
 * screen. If anything in the React tree crashes, this renders the actual
 * error message in dark-theme styling instead.
 */
class BootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ShopHaat boot crash]", error, info);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error;
      const message = err?.stack || err?.message || String(err);
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#080F1C",
            color: "#F8FAFC",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            padding: 24,
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
            fontSize: 13,
          }}
        >
          <div style={{ color: "#FF6B3D", fontSize: 18, marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            ShopHaat failed to boot
          </div>
          <div style={{ color: "#94A3B8", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16 }}>
            Check the browser console (F12) and the terminal running{" "}
            <code style={{ color: "#F8FAFC" }}>npm run dev</code> for the full
            trace.
          </div>
          <code>{message}</code>
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#FF6B3D",
                color: "#080F1C",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { HelmetProvider } from "react-helmet-async";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BootErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </BootErrorBoundary>
  </React.StrictMode>
);
