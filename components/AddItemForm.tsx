'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_IMAGES = 5;

export function AddItemForm() {
  const router = useRouter();
  const [itemName, setItemName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed per item`);
      return;
    }

    // Clean up old previews
    previews.forEach(url => URL.revokeObjectURL(url));

    // Generate new previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));

    setFiles(selectedFiles);
    setPreviews(newPreviews);
    setError(null);
  };

  const removeImage = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];

    // Clean up preview URL
    URL.revokeObjectURL(newPreviews[index]);

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', itemName.trim());
      files.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/items', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Clean up previews
      previews.forEach(url => URL.revokeObjectURL(url));

      // Reset form
      setItemName('');
      setFiles([]);
      setPreviews([]);
      setSuccess(true);

      // Refresh the page to show new item in queue
      router.refresh();

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Add Item</h2>
      <p className="text-sm text-slate-600 mb-4">
        Add items one at a time with up to {MAX_IMAGES} photos each. Items will be queued for analysis.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Item Name Input */}
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-slate-700 mb-1">
            Item Name
          </label>
          <input
            type="text"
            id="itemName"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            disabled={uploading}
            placeholder="e.g., Blue Glass Vase"
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="images" className="block text-sm font-medium text-slate-700 mb-1">
            Photos (1-{MAX_IMAGES} images)
          </label>
          <input
            type="file"
            id="images"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="w-full text-sm disabled:opacity-50"
          />
          <p className="text-xs text-slate-500 mt-1">
            Upload {MAX_IMAGES} photos for best AI analysis results
          </p>
        </div>

        {/* Image Previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {previews.map((preview, idx) => (
              <div key={idx} className="relative aspect-square">
                <img
                  src={preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover rounded border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  disabled={uploading}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                  aria-label={`Remove image ${idx + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File Count */}
        {files.length > 0 && (
          <p className="text-xs text-slate-600">
            {files.length} image{files.length !== 1 ? 's' : ''} selected
          </p>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
            Item added to queue successfully!
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !itemName.trim() || files.length === 0}
          className="bg-emerald-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
        >
          {uploading ? 'Adding Item...' : 'Save Item'}
        </button>
      </form>
    </div>
  );
}
