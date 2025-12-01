'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AnalysisData = {
  category: string;
  brand_or_maker: string;
  style_or_era: string;
  material: string;
  color: string;
  dimensions_guess: string;
  condition_summary: string;
  estimated_low_price: number;
  estimated_high_price: number;
  suggested_list_price: number;
  reasoning?: string;
};

type AnalysisResultsViewProps = {
  itemId: string;
  currentTitle: string;
  analysis: AnalysisData;
  costBasis?: number | null;
};

export function AnalysisResultsView({
  itemId,
  currentTitle,
  analysis,
  costBasis,
}: AnalysisResultsViewProps) {
  const router = useRouter();
  const [title, setTitle] = useState(currentTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const handleUseAITitle = async () => {
    setSavingTitle(true);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: analysis.category }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      setTitle(analysis.category);
      setEditingTitle(false);
      router.refresh();
    } catch (err) {
      console.error('Error updating title:', err);
      alert('Failed to update title');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveCustomTitle = async () => {
    if (!title.trim()) {
      alert('Title cannot be empty');
      return;
    }

    setSavingTitle(true);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      setEditingTitle(false);
      router.refresh();
    } catch (err) {
      console.error('Error updating title:', err);
      alert('Failed to update title');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleReanalyze = async () => {
    if (!confirm('Re-analyze this item? This will overwrite the current analysis.')) {
      return;
    }

    setReanalyzing(true);
    try {
      const response = await fetch(`/api/items/${itemId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      router.refresh();
    } catch (err) {
      console.error('Error re-analyzing:', err);
      alert('Failed to re-analyze item');
    } finally {
      setReanalyzing(false);
    }
  };

  const potentialProfit = costBasis
    ? analysis.suggested_list_price - costBasis
    : null;

  return (
    <div className="bg-white p-6 rounded shadow-sm space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-lg font-semibold">AI Analysis Results</h2>
        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          className="text-xs text-slate-600 hover:text-emerald-600 disabled:opacity-50"
        >
          {reanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
        </button>
      </div>

      {/* Title Editor */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-slate-700">Item Title</label>
          {!editingTitle && (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              Edit
            </button>
          )}
        </div>

        {editingTitle ? (
          <div className="space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveCustomTitle}
                disabled={savingTitle}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingTitle ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleUseAITitle}
                disabled={savingTitle}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300 disabled:opacity-50"
              >
                Use AI Title: "{analysis.category}"
              </button>
              <button
                onClick={() => {
                  setTitle(currentTitle);
                  setEditingTitle(false);
                }}
                disabled={savingTitle}
                className="px-3 py-1.5 text-slate-600 text-xs hover:text-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium">{title}</p>
        )}

        {!editingTitle && title !== analysis.category && (
          <p className="text-xs text-slate-500 mt-1">
            AI suggested: "{analysis.category}"
          </p>
        )}
      </div>

      {/* Identification */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">Identification</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-600">Category:</dt>
          <dd className="font-medium">{analysis.category}</dd>

          <dt className="text-slate-600">Brand/Maker:</dt>
          <dd className="font-medium">{analysis.brand_or_maker}</dd>

          <dt className="text-slate-600">Style/Era:</dt>
          <dd className="font-medium">{analysis.style_or_era}</dd>

          <dt className="text-slate-600">Material:</dt>
          <dd className="font-medium">{analysis.material}</dd>

          <dt className="text-slate-600">Color:</dt>
          <dd className="font-medium">{analysis.color}</dd>

          <dt className="text-slate-600">Dimensions:</dt>
          <dd className="font-medium">{analysis.dimensions_guess}</dd>
        </dl>
      </div>

      {/* Condition */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Condition</h3>
        <p className="text-sm text-slate-700">{analysis.condition_summary}</p>
      </div>

      {/* Pricing */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">Pricing</h3>
        <div className="bg-slate-50 rounded p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Price Range:</span>
            <span className="font-medium">
              ${analysis.estimated_low_price.toFixed(2)} - ${analysis.estimated_high_price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Suggested List Price:</span>
            <span className="font-bold text-emerald-600 text-lg">
              ${analysis.suggested_list_price.toFixed(2)}
            </span>
          </div>
          {costBasis != null && (
            <>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-slate-600">Your Cost Basis:</span>
                <span className="font-medium">${costBasis.toFixed(2)}</span>
              </div>
              {potentialProfit != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Potential Profit:</span>
                  <span
                    className={`font-medium ${
                      potentialProfit > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {potentialProfit > 0 ? '+' : ''}${potentialProfit.toFixed(2)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Reasoning */}
      {analysis.reasoning && (
        <div className="border-t pt-4">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center justify-between w-full text-sm font-semibold mb-2 hover:text-emerald-600"
          >
            <span>Why this price? (AI Reasoning)</span>
            <span className="text-slate-400">{showReasoning ? '▼' : '▶'}</span>
          </button>
          {showReasoning && (
            <div className="bg-blue-50 rounded p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {analysis.reasoning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
