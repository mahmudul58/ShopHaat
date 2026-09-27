import { EmptyState } from "../common/EmptyState";
import { Button } from "../common/Button";

/**
 * AddressBook list item.
 *
 * Dark-theme variant: surface-card rows with saffron default badge.
 */
export function AddressBook({ addresses, onDelete, onEdit }) {
  if (addresses.length === 0) {
    return <EmptyState title="No saved addresses" description="Add an address to speed up checkout next time." />;
  }

  return (
    <ul className="space-y-3">
      {addresses.map((address) => (
        <li key={address.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-card p-4 shadow-card">
          <div>
            <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
              {address.label || "Address"}
              {address.is_default && (
                <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">Default</span>
              )}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {address.full_name}, {address.line1}, {address.city}, {address.state} {address.postal_code}
            </p>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={() => onEdit(address)}>
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onDelete(address.id)}>
              Remove
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
