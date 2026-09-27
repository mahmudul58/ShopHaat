import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function Modal({ isOpen, onClose, title, children, className = "" }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className={`relative w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-card border border-border-subtle shadow-modal ${className}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface-card px-6 py-4">
          <h2 className="text-xl font-semibold text-text-primary w-full text-center">{title}</h2>
          <button
            onClick={onClose}
            className="absolute right-6 p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
