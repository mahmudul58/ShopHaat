import { useState } from "react";
import { FaCheck } from "react-icons/fa";

import { Button } from "../common/Button";
import { Input, Select, Checkbox } from "../common/Input";

const DISTRICTS = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh"];
const ZONES = {
  Dhaka: ["Mirpur", "Gulshan", "Dhanmondi", "Uttara", "Mohammadpur", "Badda"],
  Chittagong: ["Agrabad", "Halishahar", "Pahartali", "Kotwali", "Khulshi"],
  Sylhet: ["Zindabazar", "Ambarkhana", "Shibganj", "Uposohor"],
};
const AREAS = {
  Mirpur: ["Mirpur 1", "Mirpur 2", "Mirpur 10", "Mirpur 11", "Mirpur 12"],
  Gulshan: ["Gulshan 1", "Gulshan 2", "Banani", "Baridhara"],
  Dhanmondi: ["Dhanmondi 15", "Dhanmondi 27", "Jigatola", "Shankar"],
};

function getZones(district) {
  return ZONES[district] || [];
}
function getAreas(zone) {
  return AREAS[zone] || [];
}

const EMPTY_ADDRESS = {
  label: "Home",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  state: "",
  city: "",
  postal_code: "",
  country: "Bangladesh",
  is_default: false,
};

const LABEL_OPTIONS = ["Home", "Office", "Others"];

export function AddressForm({ initialValues, onSubmit, onCancel, isSaving }) {
  const [form, setForm] = useState({ ...EMPTY_ADDRESS, ...initialValues });

  function handleChange(field) {
    return (event) => {
      const val =
        event.target.type === "checkbox" ? event.target.checked : event.target.value;
      setForm((prev) => {
        const next = { ...prev, [field]: val };
        if (field === "state") {
          next.city = "";
          next.postal_code = "";
        } else if (field === "city") {
          next.postal_code = "";
        }
        return next;
      });
    };
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
      className="grid grid-cols-1 gap-x-10 gap-y-6 text-sm md:grid-cols-2"
    >
      {/* LEFT COLUMN — Contact + Label */}
      <div className="space-y-6">
        <section>
          <h3 className="mb-4 text-base font-semibold text-text-primary">Contact Information</h3>

          <Input
            label="Contact name"
            required
            value={form.full_name}
            onChange={handleChange("full_name")}
            placeholder="Your full name"
            maxLength={100}
          />

          <div className="mt-4">
            <Input
              label="Mobile number"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="1XXX-XXXXXX"
              addonLeft={<span className="select-none text-text-primary">🇧🇩 +880</span>}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-base font-semibold text-text-primary">Address label</h3>
          <p className="mb-3 text-xs text-text-secondary">
            Pick a label so deliveries reach you faster.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LABEL_OPTIONS.map((label) => {
              const isSelected = form.label === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, label }))}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-brand bg-brand/15 text-brand"
                      : "border-border-subtle bg-canvas-elevated text-text-secondary hover:border-border-strong"
                  }`}
                  aria-pressed={isSelected}
                >
                  {label}
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-border-strong bg-canvas-elevated"
                    }`}
                  >
                    {isSelected && <FaCheck className="h-2.5 w-2.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          <Checkbox
            className="mt-5"
            label="Set as default delivery address"
            checked={form.is_default}
            onChange={handleChange("is_default")}
          />
        </section>
      </div>

      {/* RIGHT COLUMN — Address */}
      <div className="flex flex-col">
        <section>
          <h3 className="mb-4 text-base font-semibold text-text-primary">Address details</h3>

          <Input
            label="Street, house / apartment / unit"
            required
            value={form.line1}
            onChange={handleChange("line1")}
            placeholder="House 12, Road 7, Block C"
          />

          <div className="mt-4">
            <Input
              label="Landmark"
              value={form.line2}
              onChange={handleChange("line2")}
              placeholder="Nearby landmark or direction (optional)"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <Select
              label="District"
              required
              value={form.state}
              onChange={handleChange("state")}
              placeholder="Select district"
              options={DISTRICTS.map((d) => ({ value: d, label: d }))}
            />

            {getZones(form.state).length > 0 ? (
              <Select
                label="Zone / City"
                required
                value={form.city}
                onChange={handleChange("city")}
                disabled={!form.state}
                placeholder={form.state ? "Select zone" : "Pick a district first"}
                options={getZones(form.state).map((z) => ({ value: z, label: z }))}
              />
            ) : (
              <Input
                label="Zone / City"
                required
                value={form.city}
                onChange={handleChange("city")}
                disabled={!form.state}
                placeholder="Enter your zone or city"
              />
            )}

            {getAreas(form.city).length > 0 ? (
              <Select
                label="Area"
                required
                value={form.postal_code}
                onChange={handleChange("postal_code")}
                disabled={!form.city}
                placeholder={form.city ? "Select area" : "Pick a zone first"}
                options={getAreas(form.city).map((a) => ({ value: a, label: a }))}
              />
            ) : (
              <Input
                label="Area"
                required
                value={form.postal_code}
                onChange={handleChange("postal_code")}
                disabled={!form.city}
                placeholder="Enter your area"
              />
            )}
          </div>
        </section>

        <div className="mt-8 flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isSaving}>
            Save address
          </Button>
        </div>
      </div>
    </form>
  );
}
