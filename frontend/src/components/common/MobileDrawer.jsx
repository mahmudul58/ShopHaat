import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";

/**
 * Slide-in drawer used for mobile nav, filter sheets, etc.
 * Dark-theme variant: glassmorphism (backdrop-blur) on canvas-elevated.
 */
export function MobileDrawer({ isOpen, onClose, title, children, side = "right" }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return createPortal(
    <div
      className={`fixed inset-0 z-drawer ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-canvas/80 backdrop-blur-sm transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Menu"}
        className={`absolute top-0 ${side === "left" ? "left-0" : "right-0"} flex h-full w-[85%] max-w-sm flex-col bg-canvas-elevated backdrop-blur-md border-l border-border-subtle shadow-modal transition-transform duration-200 ${
          isOpen
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle bg-canvas-elevated px-4 py-3">
          <h3 className="font-sans text-base font-semibold text-text-primary">
            {title || "Menu"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-text-secondary hover:bg-canvas hover:text-text-primary"
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
