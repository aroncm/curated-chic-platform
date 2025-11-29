'use client';

import { useState } from 'react';

type Sale = {
  id?: string;
  sale_price?: number | null;
  shipping_cost?: number | null;
  platform_fees?: number | null;
  other_fees?: number | null;
  sale_date?: string | null;
};

export function SalesEditor({
  itemId,
  listingId,
  initialSale,
  costBasis,
}: {
  itemId: string;
  listingId?: string | null;
  initialSale?: Sale | null;
  costBasis: number | null;
}) {
  const [salePrice, setSalePrice] = useState(
    initialSale?.sale_price?.toString() ?? ''
  );
  const [shippingCost, setShippingCost] = useState(
    initialSale?.shipping_cost?.toString() ?? ''
  );
  const [platformFees, setPlatformFees] = useState(
    initialSale?.platform_fees?.toString() ?? ''
  );
  const [otherFees, setOtherFees] = useState(
    initialSale?.other_fees?.toString() ?? ''
  );
  const [saleDate, setSaleDate] = useState(
    initialSale?.sale_date ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numeric = (v: string) => (v.trim() === '' ? null : Number(v));

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${itemId}/sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salePrice: numeric(salePrice),
          shippingCost: numeric(shippingCost),
          platformFees: numeric(platformFees),
          otherFees: numeric(otherFees),
          saleDate: saleDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save sale');
      }
      setMessage('Sale saved and item marked as sold.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save();
  };

  const sale = numeric(salePrice) ?? 0;
  const shipCost = numeric(shippingCost) ?? 0;
  const platFees = numeric(platformFees) ?? 0;
  const other = numeric(otherFees) ?? 0;
  const totalFees = shipCost + platFees + other;
  const profit =
    costBasis != null ? sale - (costBasis + totalFees) : null;

  return (
    <div className="bg-white p-4 rounded shadow-sm text-sm space-y-3">
      <h3 className="font-semibold mb-1">Sale & profit</h3>
      <p className="text-xs text-slate-500 mb-2">
        Record the sale once the item is sold. This will mark the item as{' '}
        <span className="font-semibold">sold</span> and update reporting.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Sale price (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-2 py-1 text-sm"
              value={salePrice}
              onChange={e => setSalePrice(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Shipping cost (you pay)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-2 py-1 text-sm"
              value={shippingCost}
              onChange={e => setShippingCost(e.target.value)}
              placeholder="0 if buyer paid shipping"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Platform fees
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-2 py-1 text-sm"
              value={platformFees}
              onChange={e => setPlatformFees(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Other fees
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-2 py-1 text-sm"
              value={otherFees}
              onChange={e => setOtherFees(e.target.value)}
              placeholder="e.g. packing materials"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Sale date
            </label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={saleDate ?? ''}
              onChange={e => setSaleDate(e.target.value)}
            />
          </div>
        </div>

        {costBasis != null && (
          <p className="text-xs text-slate-600">
            Cost basis:{' '}
            <span className="font-medium">
              ${costBasis.toFixed(2)}
            </span>
            {' · '}
            Total fees:{' '}
            <span className="font-medium">
              ${totalFees.toFixed(2)}
            </span>
            {' · '}
            Profit:{' '}
            <span
              className={
                'font-semibold ' +
                (profit != null && profit < 0
                  ? 'text-red-600'
                  : 'text-emerald-600')
              }
            >
              {profit != null ? `$${profit.toFixed(2)}` : '—'}
            </span>
          </p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        {message && (
          <p className="text-xs text-emerald-600">{message}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-slate-900 text-white px-3 py-2 rounded text-xs disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save sale & mark sold'}
        </button>
      </form>
    </div>
  );
}
