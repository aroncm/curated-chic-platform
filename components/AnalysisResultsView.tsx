'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { EditImageButton } from './EditImageButton';

type AnalysisData = {
  category: string;
  brand_or_maker: string;
  style_or_era: string;
  material: string;
  color: string;
  dimensions_guess: string;
  condition_summary: string;
  condition_grade?: string;
  estimated_low_price: number;
  estimated_high_price: number;
  suggested_list_price: number;
  reasoning?: string;
};

type ItemImage = {
  id: string;
  url: string;
  edited_url?: string | null;
};

type AnalysisResultsViewProps = {
  itemId: string;
  currentTitle: string;
  analysis: AnalysisData;
  costBasis?: number | null;
  images?: ItemImage[];
};

export function AnalysisResultsView({
  itemId,
  currentTitle,
  analysis,
  costBasis,
  images = [],
}: AnalysisResultsViewProps) {
  const router = useRouter();
  const [reanalyzeFiles, setReanalyzeFiles] = useState<File[]>([]);
  const [reanalyzePreviews, setReanalyzePreviews] = useState<string[]>([]);
  const [reanalyzing, setReanalyzing] = useState(false);

  // Manage Item form state
  const [itemName, setItemName] = useState(currentTitle);
  const [category, setCategory] = useState(analysis.category);
  const [condition, setCondition] = useState(analysis.condition_summary);
  const [inventoryLocation, setInventoryLocation] = useState('');
  const [cost, setCost] = useState(costBasis?.toString() || '');
  const [salesPrice, setSalesPrice] = useState('');
  const [salesFees, setSalesFees] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReanalyzeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Clean up old previews
    reanalyzePreviews.forEach(url => URL.revokeObjectURL(url));

    // Generate new previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));

    setReanalyzeFiles(selectedFiles);
    setReanalyzePreviews(newPreviews);
  };

  const handleReanalyze = async () => {
    if (reanalyzeFiles.length === 0) {
      alert('Please select new images to upload before re-analyzing');
      return;
    }

    if (!confirm('Re-analyze this item with new images? This will overwrite the current analysis.')) {
      return;
    }

    setReanalyzing(true);
    try {
      // First, upload new images (this will replace existing images)
      const formData = new FormData();
      formData.append('title', itemName);
      reanalyzeFiles.forEach(file => {
        formData.append('images', file);
      });

      const uploadResponse = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload new images');
      }

      // Then trigger re-analysis
      const analyzeResponse = await fetch(`/api/items/${itemId}/analyze`, {
        method: 'POST',
      });

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed');
      }

      // Clean up previews
      reanalyzePreviews.forEach(url => URL.revokeObjectURL(url));
      setReanalyzeFiles([]);
      setReanalyzePreviews([]);

      router.refresh();
    } catch (err) {
      console.error('Error re-analyzing:', err);
      alert('Failed to re-analyze item');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      alert('Item name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: itemName.trim(),
        category: category.trim(),
        condition_summary: condition.trim(),
        cost: cost ? Number(cost) : null,
        sales_price: salesPrice ? Number(salesPrice) : null,
      };

      console.log('Saving item with payload:', payload);

      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to save item');
      }

      router.refresh();
      alert('Item saved successfully!');
    } catch (err: any) {
      console.error('Error saving item:', err);
      alert(`Failed to save item: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const potentialProfit = costBasis
    ? analysis.suggested_list_price - costBasis
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-4">AI Analysis Results</h2>

        {/* Images */}
        {images.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Product Images</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img: ItemImage) => (
                <div key={img.id} className="flex-shrink-0">
                  <div className="relative w-40 h-40 mb-2">
                    <Image
                      src={img.edited_url || img.url}
                      alt="Item"
                      fill
                      className="object-cover rounded border border-slate-200"
                    />
                    {img.edited_url && (
                      <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded">
                        Edited
                      </div>
                    )}
                  </div>
                  <EditImageButton
                    imageId={img.id}
                    originalUrl={img.url}
                    editedUrl={img.edited_url}
                    itemTitle={currentTitle}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Identification & Valuation - Condensed */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">Identification & Valuation</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-600">Item Name:</dt>
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

            <dt className="text-slate-600">Condition:</dt>
            <dd className="font-medium">{analysis.condition_grade || 'See summary'}</dd>

            <dt className="text-slate-600">Condition Summary:</dt>
            <dd className="font-medium col-span-1">{analysis.condition_summary}</dd>

            <dt className="text-slate-600">Price Range:</dt>
            <dd className="font-medium">
              ${analysis.estimated_low_price.toFixed(2)} - ${analysis.estimated_high_price.toFixed(2)}
            </dd>

            <dt className="text-slate-600">Suggested List Price:</dt>
            <dd className="font-bold text-emerald-600">
              ${analysis.suggested_list_price.toFixed(2)}
            </dd>

            {costBasis != null && (
              <>
                <dt className="text-slate-600">Your Cost Basis:</dt>
                <dd className="font-medium">${costBasis.toFixed(2)}</dd>
              </>
            )}

            {potentialProfit != null && (
              <>
                <dt className="text-slate-600">Potential Profit:</dt>
                <dd
                  className={`font-medium ${
                    potentialProfit > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {potentialProfit > 0 ? '+' : ''}${potentialProfit.toFixed(2)}
                </dd>
              </>
            )}
          </dl>
        </div>

        {/* AI Reasoning - Expanded by default */}
        {analysis.reasoning && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-2">AI Reasoning</h3>
            <div className="bg-blue-50 rounded p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {analysis.reasoning}
            </div>
          </div>
        )}
      </div>

      {/* Re-analyze Section */}
      <div className="bg-white p-6 rounded shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Re-Analyze Item</h3>
        <p className="text-sm text-slate-600 mb-4">
          Upload new images for a more accurate assessment. The AI may recommend different angles or clearer photos to improve the analysis.
        </p>

        {/* Hidden file input */}
        <input
          type="file"
          id="reanalyze-images"
          accept="image/*"
          multiple
          onChange={handleReanalyzeFileSelect}
          disabled={reanalyzing}
          className="hidden"
        />

        {/* Custom upload button */}
        <button
          type="button"
          onClick={() => document.getElementById('reanalyze-images')?.click()}
          disabled={reanalyzing}
          className="w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 mb-4"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium">
            {reanalyzeFiles.length > 0 ? `${reanalyzeFiles.length} image(s) selected` : 'Click to Upload New Images'}
          </span>
        </button>

        {/* Image Previews */}
        {reanalyzePreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {reanalyzePreviews.map((preview, idx) => (
              <div key={idx} className="relative aspect-square">
                <img
                  src={preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover rounded border border-slate-200"
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleReanalyze}
          disabled={reanalyzing || reanalyzeFiles.length === 0}
          className="w-full bg-emerald-600 text-white px-6 py-3 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
        >
          {reanalyzing ? 'Re-Analyzing...' : 'Re-Analyze Item'}
        </button>
      </div>

      {/* Manage Item Section */}
      <div className="bg-white p-6 rounded shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Manage Item</h3>

        <div className="space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Condition
            </label>
            <textarea
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Two-column layout for smaller fields */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Inventory Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Inventory Location
              </label>
              <input
                type="text"
                value={inventoryLocation}
                onChange={(e) => setInventoryLocation(e.target.value)}
                placeholder="e.g., Shelf A"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Suggested Listing Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Suggested Listing Price
              </label>
              <div className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-slate-50 text-slate-700">
                ${analysis.suggested_list_price.toFixed(2)}
              </div>
              <p className="text-xs text-slate-500 mt-1">From AI analysis</p>
            </div>

            {/* Sales Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sales Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={salesPrice}
                  onChange={(e) => setSalesPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  disabled
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Will be set when sold</p>
            </div>

            {/* Sales Fees */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sales Fees
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={salesFees}
                  onChange={(e) => setSalesFees(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  disabled
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Will be calculated when sold</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-4">
            <button
              onClick={handleSaveItem}
              disabled={saving}
              className="flex-1 bg-slate-600 text-white px-6 py-4 rounded-lg text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Item'}
            </button>
            <button
              onClick={() => router.push(`/items/${itemId}/listing-management`)}
              className="flex-1 bg-emerald-600 text-white px-6 py-4 rounded-lg text-base font-semibold hover:bg-emerald-700 transition-colors"
            >
              Continue to Listing Management
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
