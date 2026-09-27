import { useState } from "react";

import { ORDER_STATUS_LABELS } from "../../utils/constants";
import { Button } from "../common/Button";

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS);

export function OrderStatusUpdateForm({ currentStatus, onUpdate, isUpdating }) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onUpdate({ status, note });
      }}
      className="space-y-3 rounded-xl border border-border-subtle bg-canvas-elevated p-4"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text-secondary">New status</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-full rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {ALL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text-secondary">Note (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border-subtle bg-surface-card p-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>
      <Button type="submit" isLoading={isUpdating} disabled={status === currentStatus}>
        Update status
      </Button>
    </form>
  );
}
