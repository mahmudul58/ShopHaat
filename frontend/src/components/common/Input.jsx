/**
 * Form atoms. Each one renders a label + control + optional error, all
 * styled identically so visual bugs in one form surface in every form.
 *
 * Every atom accepts `label`, `name`, `error`, optional `hint`, plus the
 * standard HTML props for its underlying control.
 */

import { useEffect, useRef, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const FIELD_BASE =
  "w-full rounded-xl border bg-canvas-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted " +
  "transition-all focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const FIELD_BORDER_DEFAULT = "border-border-subtle hover:border-border-strong";
const FIELD_BORDER_ERROR =
  "border-state-danger focus:border-state-danger focus:ring-state-danger/30";

function FieldShell({ label, hint, error, htmlFor, children, className = "" }) {
  return (
    <div className={`block ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-semibold text-text-secondary"
        >
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs font-medium text-state-danger">{error}</p>
      )}
    </div>
  );
}

/** Plain text/email/password/etc input. Pass `type` to specialize.
 *  Use `addonLeft` / `addonRight` to render decorative content. */
export function Input({ label, name, error, hint, className = "", addonLeft, addonRight, ...rest }) {
  const id = rest.id || name;
  const paddingLeft = addonLeft ? "pl-24" : "";
  const paddingRight = addonRight ? "pr-10" : "";
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <div className="relative">
        {addonLeft && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 rounded-l-xl border-r border-border-subtle bg-canvas-elevated px-3 text-sm text-text-secondary">
            {addonLeft}
          </span>
        )}
        <input
          id={id}
          name={name}
          className={`${FIELD_BASE} ${paddingLeft} ${paddingRight} ${error ? FIELD_BORDER_ERROR : FIELD_BORDER_DEFAULT}`}
          {...rest}
        />
        {addonRight && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
            {addonRight}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

/** Multi-line text input. */
export function Textarea({ label, name, error, hint, rows = 4, className = "", ...rest }) {
  const id = rest.id || name;
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        className={`${FIELD_BASE} resize-y ${error ? FIELD_BORDER_ERROR : FIELD_BORDER_DEFAULT}`}
        {...rest}
      />
    </FieldShell>
  );
}

/** Native select dropdown.
 *  Pass either `options: [{value,label}]` or `<option>` children.
 *  `placeholder` renders a disabled first option. */
export function Select({
  label,
  name,
  error,
  hint,
  className = "",
  options,
  placeholder,
  children,
  value,
  ...rest
}) {
  const id = rest.id || name;
  const hasPlaceholder = placeholder != null && value === "";
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <select
        id={id}
        name={name}
        value={value}
        className={`${FIELD_BASE} pr-9 ${error ? FIELD_BORDER_ERROR : FIELD_BORDER_DEFAULT}`}
        {...rest}
      >
        {placeholder != null && (
          <option value="" disabled hidden={!hasPlaceholder}>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    </FieldShell>
  );
}

/** Password input with a visibility toggle. */
export function PasswordInput({ label, name, error, hint, className = "", ...rest }) {
  const id = rest.id || name;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          className={`${FIELD_BASE} pr-11 ${error ? FIELD_BORDER_ERROR : FIELD_BORDER_DEFAULT}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-canvas-elevated hover:text-text-primary"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
        </button>
      </div>
    </FieldShell>
  );
}

/** Single checkbox with a label.
 *  Pass `indeterminate` for the tri-state "some selected" pattern. */
export function Checkbox({
  label,
  name,
  error,
  className = "",
  checked,
  indeterminate = false,
  ...rest
}) {
  const id = rest.id || name;
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <label htmlFor={id} className={`inline-flex items-start gap-2 text-sm ${className}`}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        className={`mt-0.5 h-4 w-4 rounded border-border-subtle bg-canvas-elevated text-brand transition-colors focus:ring-brand/30 ${error ? "border-state-danger" : ""}`}
        {...rest}
      />
      {label && <span className="text-text-secondary">{label}</span>}
    </label>
  );
}

/** Single radio with a label. */
export function Radio({ label, name, value, checked, className = "", ...rest }) {
  const id = rest.id || `${name}-${value}`;
  return (
    <label htmlFor={id} className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        className="h-4 w-4 border-border-subtle bg-canvas-elevated text-brand focus:ring-brand/30"
        {...rest}
      />
      {label && <span className="text-text-secondary">{label}</span>}
    </label>
  );
}
