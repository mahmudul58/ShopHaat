import { useState } from "react";
import { FaTrash } from "react-icons/fa";

import { deleteProductImage, uploadProductImage } from "../../services/catalogService";
import { extractErrorMessage } from "../../services/apiClient";
import { useToast } from "../../hooks/useToast";

export function ImageManager({ productSlug, images, onChange }) {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const created = await uploadProductImage(productSlug, file);
      onChange([...images, created]);
    } catch (error) {
      showToast(extractErrorMessage(error, "Could not upload this image."), "error");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDelete(imageId) {
    try {
      await deleteProductImage(productSlug, imageId);
      onChange(images.filter((image) => image.id !== imageId));
    } catch (error) {
      showToast(extractErrorMessage(error, "Could not remove this image."), "error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div key={image.id} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border-subtle bg-surface-card">
            <img src={image.image} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => handleDelete(image.id)}
              aria-label="Remove image"
              className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-canvas-elevated/90 text-state-danger group-hover:flex"
            >
              <FaTrash size={12} />
            </button>
          </div>
        ))}
      </div>
      <label className="inline-block cursor-pointer rounded-xl border border-dashed border-border-subtle bg-canvas-elevated px-4 py-2 text-sm text-text-secondary hover:border-brand">
        {isUploading ? "Uploading..." : "+ Upload image"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
      </label>
    </div>
  );
}
