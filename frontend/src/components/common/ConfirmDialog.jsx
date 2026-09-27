import { useCallback, useState } from "react";

import { Button } from "./Button";
import { Modal } from "./Modal";

/**
 * Promise-based confirm dialog. Mount <ConfirmDialogProvider /> once near
 * the root of the tree, then call `confirm({...})` from anywhere:
 *
 *   const ok = await confirm({ title, message, danger: true });
 *   if (!ok) return;
 */
let _confirm = null;
export function registerConfirm(fn) {
  _confirm = fn;
}

export async function confirm({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}) {
  if (!_confirm) {
    // Fallback when the provider isn't mounted.
    // eslint-disable-next-line no-alert
    return window.confirm(message || title);
  }
  return _confirm({ title, message, confirmLabel, cancelLabel, danger });
}

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(null);

  const handler = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  if (typeof window !== "undefined") {
    registerConfirm(handler);
  }

  function close(result) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <>
      {children}
      <Modal
        isOpen={Boolean(state)}
        onClose={() => close(false)}
        title={state?.title || ""}
        className="max-w-md"
      >
        <div className="space-y-5">
          {state?.message && (
            <p className="text-sm text-text-secondary">{state.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => close(false)}>
              {state?.cancelLabel || "Cancel"}
            </Button>
            <Button
              variant={state?.danger ? "danger" : "primary"}
              onClick={() => close(true)}
            >
              {state?.confirmLabel || "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
