import { FaMoneyBillWave, FaCreditCard, FaCheck } from "react-icons/fa";

/**
 * Step 3 — payment method. Only renders the two methods the backend
 * actually supports (per the integration contract).
 *
 *   COD              → backend `payment_method: "COD"`
 *   Card / Online    → backend `payment_method: "SIMULATED_ONLINE"`
 *
 * bKash/Nagad/Rocket are NOT shown — those would require a backend
 * payment-gateway integration that doesn't exist yet.
 *
 * Dark-theme variant: surface-card rows with saffron selected state.
 */
const METHODS = [
  {
    value: "COD",
    label: "Cash on Delivery",
    description: "Pay in cash when your order arrives at your door.",
    icon: FaMoneyBillWave,
    badge: "Most popular",
  },
  {
    value: "SIMULATED_ONLINE",
    label: "Card / Online Payment",
    description: "Pay securely online with your Visa or Mastercard.",
    icon: FaCreditCard,
  },
];

export function PaymentStep({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-text-primary">
        Payment Method
      </h3>
      {METHODS.map((method) => {
        const Icon = method.icon;
        const isSelected = selected === method.value;
        return (
          <label
            key={method.value}
            className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
              isSelected
                ? "border-brand bg-brand/10"
                : "border-border-subtle bg-canvas-elevated hover:border-brand/60"
            }`}
          >
            <input
              type="radio"
              name="payment"
              checked={isSelected}
              onChange={() => onSelect(method.value)}
              className="mt-1 h-4 w-4 text-brand focus:ring-brand/30"
            />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
              <Icon />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-text-primary">{method.label}</p>
                {method.badge && (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    {method.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary">{method.description}</p>
            </div>
            {isSelected && <FaCheck className="h-4 w-4 text-brand" />}
          </label>
        );
      })}
    </div>
  );
}
