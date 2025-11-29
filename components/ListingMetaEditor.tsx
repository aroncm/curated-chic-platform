'use client';

import { useEffect, useState } from 'react';

type Listing = {
  id?: string;
  platform_id?: string | null;
  status?: 'draft' | 'live' | 'ended';
  listing_url?: string | null;
  listing_price?: number | null;
  shipping_price?: number | null;
  fees_estimate?: number | null;
  date_listed?: string | null;
};

type Platform = {
  id: string;
  name: string;
  slug: string;
  default_fee_percent: number | null;
};

const statusOptions: Listing['status'][] = ['draft', 'live', 'ended'];

export function ListingMetaEditor({
  itemId,
  initialListing,
}: {
  itemId: string;
  initialListing?: Listing | null;
}) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformId, setPlatformId] = useState<string | ''>(
    initialListing?.platform_id ?? ''
  );
  const [status, setStatus] = useState<Listing['status']>(
    initialListing?.status ?? 'draft'
  );
  const [listingUrl, setListingUrl] = useState(
    initialListing?.listing_url ?? ''
  );
  const [listingPrice, setListingPrice] = useState(
    initialListing?.listing_price?.toString() ?? ''
  );
  const [shippingPrice, setShippingPrice] = useState(
    initialListing?.shipping_price?.toString() ?? ''
  );
  const [feesEstimate, setFeesEstimate] = useState(
    initialListing?.fees_estimate?.toString() ?? ''
  );
  const [dateListed, setDateListed] = useState(
    initialListing?.date_listed ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        const res = await fetch('/api/platforms');
        if (!res.ok) throw new Error('Failed to load platforms');
        const data = await res.json();
        setPlatforms(data.platforms || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadPlatforms();
  }, []);

  const numeric = (v: string) => (v.trim() === '' ? null : Number(v));

  const save = async (newStatus?: Listing['status']) => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const body = {
        platformId: platformId || null,
        status: newStatus ?? status ?? 'draft',
        listingUrl: listingUrl || null,
        listingPrice: numeric(listingPrice),
        shippingPrice: numeric(shippingPrice),
        feesEstimate: numeric(feesEstimate),
        dateListed: dateListed || null,
      };

      const res = await fetch(`/api/items/${itemId}/listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save listing');
      }
      const json = await res.json();
      setStatus(json.status);
      setPlatformId(json.platformId || '');
      setDateListed(json.dateListed || '');
      setMessage(
        newStatus === 'live'
          ? 'Listing saved and item marked as listed.'
          : 'Listing saved.'
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    save();
  };

  const handleMarkListed = (e: React.MouseEvent) => {
    e.preventDefault();
    save('live');
  };

  const selectedPlatform = platforms.find(p => p.id === platformId);
  const showHintFee =
    !feesEstimate && selectedPlatform?.default_fee_percent != null;

  return (
    <div className="bg-white p-4 rounded shadow-sm text-sm space-y-3">
      <h3 className="font-semibold mb-1">Listing settings</h3>
      <p className="text-xs text-slate-500 mb-2">
        Choose the platform, set the list price, and track estimated fees.
      </p>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Platform
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={platformId}
              onChange={e => setPlatformId(e.target.value)}
            >
              <option value="">— Select platform —</option>
              {platforms.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {showHintFee && (
              <p className="text-[11px] text-slate-500 mt-1">
                Typical fee:{' '}
                {selectedPlatform!.default_fee_percent!.toFixed(2)}%
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Status
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={status}
              onChange={e =>
                setStatus(e.target.value as Listing['status'])
              }
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>
                  {s ? s[0].toUpperCase() + s.slice(1) : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Date listed
            </label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={dateListed ?? ''}
              onChange={e => setDateListed(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Listing URL (optional)
          </label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full border rounded px-2 py-1 text-sm"
            value={listingUrl}
            onChange={e => setListingUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              List price (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-2 py-1 text-sm"
              value={listingPrice}
              onChange={e => setListingPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Shipping charge to buyer
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-2 py-1 text-sm"
              value={shippingPrice}
              onChange={e => setShippingPrice(e.target.value)}
              placeholder="0 if buyer pays or local pickup"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Est. platform fees
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-2 py-1 text-sm"
              value={feesEstimate}
              onChange={e => setFeesEstimate(e.target.value)}
              placeholder={
                selectedPlatform?.default_fee_percent != null
                  ? `e.g. ${
                      selectedPlatform.default_fee_percent
                    }% of price`
                  : 'Estimated total fees'
              }
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {message && (
          <p className="text-xs text-emerald-600">{message}</p>
        )}

        <div className="flex gap-2">
          <button
            disabled={saving}
            className="bg-slate-900 text-white px-3 py-2 rounded text-xs disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save listing'}
          </button>
          <button
            disabled={saving}
            onClick={handleMarkListed}
            className="bg-emerald-600 text-white px-3 py-2 rounded text-xs disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & mark listed'}
          </button>
        </div>
      </form>
    </div>
  );
}
