'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ItemUpload = {
  files: File[];
  previews: string[];
};

export function UploadItemForm() {
  const router = useRouter();
  const [items, setItems] = useState<ItemUpload[]>([
    { files: [], previews: [] },
    { files: [], previews: [] },
    { files: [], previews: [] },
  ]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (itemIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Generate previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));

    setItems(prev => {
      const updated = [...prev];
      // Clean up old previews
      updated[itemIndex].previews.forEach(url => URL.revokeObjectURL(url));
      updated[itemIndex] = {
        files: selectedFiles,
        previews: newPreviews,
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if at least one item has files
    const itemsWithFiles = items.filter(item => item.files.length > 0);
    if (itemsWithFiles.length === 0) {
      setError('Please select at least one image for at least one item');
      return;
    }

    setUploading(true);

    try {
      const uploadedItemIds: string[] = [];

      // Upload each item that has files
      for (const item of itemsWithFiles) {
        const formData = new FormData();
        item.files.forEach(file => {
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

        uploadedItemIds.push(data.item.id);
      }

      // Clean up all previews
      items.forEach(item => {
        item.previews.forEach(url => URL.revokeObjectURL(url));
      });

      setUploading(false);
      setAnalyzing(true);

      // Auto-run AI analysis on all uploaded items in parallel
      await Promise.all(
        uploadedItemIds.map(itemId =>
          fetch(`/api/items/${itemId}/analyze`, {
            method: 'POST',
          }).catch(err => {
            console.error(`AI analysis failed for item ${itemId}:`, err);
          })
        )
      );

      // Redirect to items page to see all uploaded items
      router.push('/items');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload items');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const totalFiles = items.reduce((sum, item) => sum + item.files.length, 0);

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Upload Items for AI Analysis</h2>
      <p className="text-sm text-slate-600 mb-4">
        Upload photos of up to 3 items at once. AI will identify and value each item automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div key={idx} className="border rounded p-4 space-y-2">
              <h3 className="text-sm font-medium">Item {idx + 1}</h3>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => handleFileSelect(idx, e)}
                className="w-full text-xs"
                disabled={uploading || analyzing}
              />
              {item.previews.length > 0 && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {item.previews.map((preview, previewIdx) => (
                    <div key={previewIdx} className="relative aspect-square">
                      <img
                        src={preview}
                        alt={`Item ${idx + 1} preview ${previewIdx + 1}`}
                        className="w-full h-full object-cover rounded border"
                      />
                    </div>
                  ))}
                </div>
              )}
              {item.files.length > 0 && (
                <p className="text-xs text-slate-500">
                  {item.files.length} image{item.files.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2 items-center">
          <button
            type="submit"
            disabled={uploading || analyzing || totalFiles === 0}
            className="bg-emerald-600 text-white px-6 py-2 rounded text-sm disabled:opacity-50 font-medium"
          >
            {uploading
              ? 'Uploading...'
              : analyzing
              ? 'Analyzing...'
              : totalFiles > 0
              ? `Upload & Analyze ${items.filter(i => i.files.length > 0).length} Item${items.filter(i => i.files.length > 0).length !== 1 ? 's' : ''}`
              : 'Select Images to Upload'}
          </button>

          {(uploading || analyzing) && (
            <span className="text-sm text-slate-600">
              {uploading
                ? 'Uploading images...'
                : 'AI is identifying your items...'}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
