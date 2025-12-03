'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type QueuedItem = {
  id: string;
  title: string;
  created_at: string;
  ai_status: 'idle' | 'pending' | 'complete' | 'error';
  image_count: number;
  thumbnail_url?: string;
  import_source?: 'manual' | 'email';
};

type ItemsQueueListProps = {
  items: QueuedItem[];
};

export function ItemsQueueList({ items }: ItemsQueueListProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeAll = async () => {
    if (items.length === 0) return;

    setAnalyzing(true);
    setError(null);
    setProgress({ current: 0, total: items.length });

    try {
      const itemIds = items.map(item => item.id);

      const response = await fetch('/api/items/batch-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Batch analysis failed');
      }

      // Refresh the page to show updated items
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to analyze items');
    } finally {
      setAnalyzing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  if (items.length === 0) {
    return null; // Don't show the queue section if there are no items
  }

  return (
    <div className="bg-white p-6 rounded shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">Items Queue</h2>
          <p className="text-sm text-slate-600">
            {items.length} item{items.length !== 1 ? 's' : ''} waiting for analysis
          </p>
        </div>
        <button
          onClick={handleAnalyzeAll}
          disabled={analyzing || items.length === 0}
          className="bg-emerald-600 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
        >
          {analyzing ? 'Analyzing...' : 'Analyze Items'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {analyzing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm mb-4">
          Processing {items.length} item{items.length !== 1 ? 's' : ''} (3 at a time)...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="border rounded p-4 space-y-2 hover:border-emerald-300 transition-colors"
          >
            {item.thumbnail_url && (
              <div className="aspect-square relative rounded overflow-hidden bg-slate-100">
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h3 className="font-medium text-sm line-clamp-2">{item.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {item.image_count} image{item.image_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-slate-400">
                Added {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                <span className="w-2 h-2 rounded-full bg-gray-400 mr-1.5"></span>
                Queued
              </span>
              {item.import_source === 'email' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Tip: Items are analyzed in batches of 3 to ensure reliable results. Larger batches may take a few minutes.
      </p>
    </div>
  );
}
