'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function UploadItemForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);

    // Generate previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => {
      // Clean up old previews
      prev.forEach(url => URL.revokeObjectURL(url));
      return newPreviews;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a title for the item');
      return;
    }

    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
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

      // Redirect to the new item page
      router.push(`/items/${data.item.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload item');
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Upload New Item</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Item Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g., Vintage Crystal Decanter"
            required
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Images (select one or more)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="w-full border rounded px-3 py-2 text-sm"
            required
            disabled={uploading}
          />
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, idx) => (
              <div key={idx} className="relative aspect-square">
                <img
                  src={preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover rounded border"
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={uploading}
            className="bg-emerald-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload & Create Item'}
          </button>

          {uploading && (
            <span className="text-sm text-slate-600 self-center">
              This may take a moment...
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
