'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AnalyzeButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/items/${itemId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      // Refresh the page to show the results
      router.refresh();
    } catch (error) {
      console.error('Error analyzing item:', error);
      alert('Failed to analyze item. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <button
      onClick={handleAnalyze}
      disabled={analyzing}
      className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {analyzing ? 'Analyzing...' : 'Analyze This Item'}
    </button>
  );
}
