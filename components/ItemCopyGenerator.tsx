'use client';

import { useState } from 'react';

type PlatformCopy = {
  ebayTitle: string;
  ebayDescription: string;
  facebookTitle: string;
  facebookDescription: string;
  etsyTitle: string;
  etsyDescription: string;
};

type ItemCopyGeneratorProps = {
  itemId: string;
};

export function ItemCopyGenerator({ itemId }: ItemCopyGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copy, setCopy] = useState<PlatformCopy | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  if (!copy && !loading && !error) {
    return (
      <div className="bg-white p-6 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Generate Listing Copy</h2>
        <p className="text-sm text-slate-600 mb-4">
          Generate platform-specific titles and descriptions for eBay, Facebook Marketplace, and Etsy.
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-emerald-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          Generate Listing Copy
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Listing Copy</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs text-slate-600 hover:text-emerald-600 disabled:opacity-50"
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
          Generating platform-specific listing copy...
        </div>
      )}

      {copy && !loading && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* eBay */}
          <div className="border rounded p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">eBay</h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                80 char max
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Title</label>
                <button
                  onClick={() => handleCopy(copy.ebayTitle, 'ebay-title')}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {copiedField === 'ebay-title' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-slate-50 rounded p-2 text-xs border">
                {copy.ebayTitle}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Description</label>
                <button
                  onClick={() => handleCopy(copy.ebayDescription, 'ebay-desc')}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {copiedField === 'ebay-desc' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea
                value={copy.ebayDescription}
                readOnly
                rows={6}
                className="w-full bg-slate-50 rounded p-2 text-xs border resize-none"
              />
            </div>
          </div>

          {/* Facebook Marketplace */}
          <div className="border rounded p-4 space-y-3">
            <h3 className="font-semibold text-sm mb-2">Facebook Marketplace</h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Title</label>
                <button
                  onClick={() => handleCopy(copy.facebookTitle, 'fb-title')}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {copiedField === 'fb-title' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-slate-50 rounded p-2 text-xs border">
                {copy.facebookTitle}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Description</label>
                <button
                  onClick={() => handleCopy(copy.facebookDescription, 'fb-desc')}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {copiedField === 'fb-desc' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea
                value={copy.facebookDescription}
                readOnly
                rows={6}
                className="w-full bg-slate-50 rounded p-2 text-xs border resize-none"
              />
            </div>
          </div>

          {/* Etsy */}
          <div className="border rounded p-4 space-y-3">
            <h3 className="font-semibold text-sm mb-2">Etsy</h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Title</label>
                <button
                  onClick={() => handleCopy(copy.etsyTitle, 'etsy-title')}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {copiedField === 'etsy-title' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-slate-50 rounded p-2 text-xs border">
                {copy.etsyTitle}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Description</label>
                <button
                  onClick={() => handleCopy(copy.etsyDescription, 'etsy-desc')}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {copiedField === 'etsy-desc' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea
                value={copy.etsyDescription}
                readOnly
                rows={6}
                className="w-full bg-slate-50 rounded p-2 text-xs border resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
