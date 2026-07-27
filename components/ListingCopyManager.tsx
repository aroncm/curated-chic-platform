'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PlatformCopy = {
  ebayTitle: string;
  ebayDescription: string;
  facebookTitle: string;
  facebookDescription: string;
  etsyTitle: string;
  etsyDescription: string;
};

type ListingCopyManagerProps = {
  itemId: string;
};

export function ListingCopyManager({ itemId }: ListingCopyManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copy, setCopy] = useState<PlatformCopy | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable state for each field
  const [editableCopy, setEditableCopy] = useState<PlatformCopy | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${itemId}/copy`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate listing copy');
      }

      setCopy(data.copy);
      setEditableCopy(data.copy); // Initialize editable copy
    } catch (err: any) {
      setError(err.message || 'Failed to generate listing copy');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSave = async () => {
    if (!editableCopy) return;

    setSaving(true);
    try {
      // Save the copy to the database (you may need to create an endpoint for this)
      const response = await fetch(`/api/items/${itemId}/listing-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableCopy),
      });

      if (!response.ok) {
        throw new Error('Failed to save listing copy');
      }

      alert('Listing copy saved successfully!');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save listing copy');
    } finally {
      setSaving(false);
    }
  };

  if (!copy && !loading && !error) {
    return (
      <div className="bg-white p-6 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Generate Sales Copy</h2>
        <p className="text-sm text-slate-600 mb-4">
          Generate platform-specific titles and descriptions for eBay, Facebook Marketplace, and Etsy based on your item's AI analysis.
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-emerald-700 disabled:opacity-50 w-full md:w-auto"
        >
          Generate Sales Copy
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Sales Copy</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-sm text-slate-600 hover:text-emerald-600 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-slate-600 py-8 text-center">
          Generating platform-specific sales copy...
        </div>
      )}

      {editableCopy && !loading && (
        <div className="space-y-6">
          {/* eBay */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">eBay</h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                80 char title max
              </span>
            </div>

            {/* eBay Title */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <button
                  onClick={() => handleCopy(editableCopy.ebayTitle, 'ebay-title')}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedField === 'ebay-title' ? (
                    <>✓ Copied</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={editableCopy.ebayTitle}
                onChange={(e) =>
                  setEditableCopy({ ...editableCopy, ebayTitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                {editableCopy.ebayTitle.length} characters
              </p>
            </div>

            {/* eBay Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <button
                  onClick={() =>
                    handleCopy(editableCopy.ebayDescription, 'ebay-desc')
                  }
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedField === 'ebay-desc' ? (
                    <>✓ Copied</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>
              </div>
              <textarea
                value={editableCopy.ebayDescription}
                onChange={(e) =>
                  setEditableCopy({
                    ...editableCopy,
                    ebayDescription: e.target.value,
                  })
                }
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>
          </div>

          {/* Facebook Marketplace */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-base mb-4">Facebook Marketplace</h3>

            {/* Facebook Title */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <button
                  onClick={() => handleCopy(editableCopy.facebookTitle, 'fb-title')}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedField === 'fb-title' ? (
                    <>✓ Copied</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={editableCopy.facebookTitle}
                onChange={(e) =>
                  setEditableCopy({ ...editableCopy, facebookTitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Facebook Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <button
                  onClick={() =>
                    handleCopy(editableCopy.facebookDescription, 'fb-desc')
                  }
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedField === 'fb-desc' ? (
                    <>✓ Copied</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>
              </div>
              <textarea
                value={editableCopy.facebookDescription}
                onChange={(e) =>
                  setEditableCopy({
                    ...editableCopy,
                    facebookDescription: e.target.value,
                  })
                }
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>
          </div>

          {/* Etsy */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-base mb-4">Etsy</h3>

            {/* Etsy Title */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <button
                  onClick={() => handleCopy(editableCopy.etsyTitle, 'etsy-title')}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedField === 'etsy-title' ? (
                    <>✓ Copied</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={editableCopy.etsyTitle}
                onChange={(e) =>
                  setEditableCopy({ ...editableCopy, etsyTitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Etsy Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <button
                  onClick={() =>
                    handleCopy(editableCopy.etsyDescription, 'etsy-desc')
                  }
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedField === 'etsy-desc' ? (
                    <>✓ Copied</>
                  ) : (
                    <>📋 Copy</>
                  )}
                </button>
              </div>
              <textarea
                value={editableCopy.etsyDescription}
                onChange={(e) =>
                  setEditableCopy({
                    ...editableCopy,
                    etsyDescription: e.target.value,
                  })
                }
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-600 text-white px-6 py-4 rounded-lg text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Listing Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
