import { useState } from "react";
import { Button } from "../common/Button";

export function FlashSaleForm({ onSubmit, isSaving }) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !startTime || !endTime) return;
    
    // Convert local datetime to ISO string
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();
    
    await onSubmit({
      name,
      start_time: startIso,
      end_time: endIso,
      is_active: isActive
    });
    
    // Reset
    setName("");
    setStartTime("");
    setEndTime("");
    setIsActive(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-5">
      <h2 className="text-sm font-bold text-text-primary">Create Flash Sale</h2>
      
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">
            Name
          </label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="e.g. Eid Mega Sale"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">
              Start Time
            </label>
            <input
              required
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">
              End Time
            </label>
            <input
              required
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-canvas px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
        
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input 
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border-subtle text-brand focus:ring-brand"
          />
          Active
        </label>
      </div>
      
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSaving || !name || !startTime || !endTime}
          isLoading={isSaving}
          className="bg-brand text-white hover:bg-brand-hover"
        >
          Create Flash Sale
        </Button>
      </div>
    </form>
  );
}
