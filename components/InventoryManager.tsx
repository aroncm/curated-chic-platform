'use client';

import { useEffect, useState } from 'react';

type Category = { id: string; name: string; parent_id: string | null };
type Platform = {
  id: string;
  name: string;
  slug: string;
  default_fee_percent: number | null;
};
type AcquisitionSource = {
  id: string;
  name: string;
  source_type: string;
  notes: string | null;
};
type Location = { id: string; name: string; notes: string | null };
type Tag = { id: string; name: string };

type MergeState = {
  fromId: string;
  toId: string;
};

function MergeControls({
  label,
  items,
  mergeEndpoint,
  onMerged,
}: {
  label: string;
  items: { id: string; name: string }[];
  mergeEndpoint: string;
  onMerged: () => void;
}) {
  const [state, setState] = useState<MergeState>({
    fromId: '',
    toId: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.fromId || !state.toId || state.fromId === state.toId) {
      setError('Pick two different entries to merge.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(mergeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Merge failed');
      }
      setMessage('Merged successfully.');
      setState({ fromId: '', toId: '' });
      onMerged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleMerge} className="space-y-1 text-xs">
      <div className="font-medium text-[11px]">Merge {label}</div>
      <div className="flex flex-wrap gap-2">
        <select
          className="border rounded px-2 py-1 text-xs bg-white"
          value={state.fromId}
          onChange={e =>
            setState(prev => ({ ...prev, fromId: e.target.value }))
          }
        >
          <option value="">From…</option>
          {items.map(i => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-xs bg-white"
          value={state.toId}
          onChange={e =>
            setState(prev => ({ ...prev, toId: e.target.value }))
          }
        >
          <option value="">Into…</option>
          {items.map(i => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-slate-900 text-white px-3 py-1 rounded text-[11px] disabled:opacity-50"
        >
          {loading ? 'Merging…' : 'Merge'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {message && (
        <p className="text-[11px] text-emerald-600">{message}</p>
      )}
    </form>
  );
}

export function InventoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [sources, setSources] = useState<AcquisitionSource[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // new entries
  const [newCategory, setNewCategory] = useState('');
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformSlug, setNewPlatformSlug] = useState('');
  const [newPlatformFee, setNewPlatformFee] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] =
    useState<AcquisitionSource['source_type']>('other');
  const [newLocationName, setNewLocationName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catsRes, platsRes, sourcesRes, locsRes, tagsRes] =
        await Promise.all([
          fetch('/api/categories'),
          fetch('/api/platforms'),
          fetch('/api/acquisition-sources'),
          fetch('/api/inventory-locations'),
          fetch('/api/tags'),
        ]);

      if (!catsRes.ok) throw new Error('Failed to load categories');
      if (!platsRes.ok) throw new Error('Failed to load platforms');
      if (!sourcesRes.ok)
        throw new Error('Failed to load acquisition sources');
      if (!locsRes.ok) throw new Error('Failed to load locations');
      if (!tagsRes.ok) throw new Error('Failed to load tags');

      const catsJson = await catsRes.json();
      const platsJson = await platsRes.json();
      const sourcesJson = await sourcesRes.json();
      const locsJson = await locsRes.json();
      const tagsJson = await tagsRes.json();

      setCategories(catsJson.categories || []);
      setPlatforms(platsJson.platforms || []);
      setSources(sourcesJson.sources || []);
      setLocations(locsJson.locations || []);
      setTags(tagsJson.tags || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory.trim(), parentId: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create category');
      setNewCategory('');
      setCategories(prev =>
        [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  const createPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatformName.trim() || !newPlatformSlug.trim()) return;
    try {
      const res = await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlatformName.trim(),
          slug: newPlatformSlug.trim(),
          defaultFeePercent:
            newPlatformFee.trim() === ''
              ? null
              : Number(newPlatformFee),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create platform');
      setNewPlatformName('');
      setNewPlatformSlug('');
      setNewPlatformFee('');
      setPlatforms(prev =>
        [...prev, data.platform].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  const createSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    try {
      const res = await fetch('/api/acquisition-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim(),
          sourceType: newSourceType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create source');
      setNewSourceName('');
      setNewSourceType('other');
      setSources(prev =>
        [...prev, data.source].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  const createLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    try {
      const res = await fetch('/api/inventory-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName.trim() }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || 'Failed to create location');
      setNewLocationName('');
      setLocations(prev =>
        [...prev, data.location].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  const createTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create tag');
      setNewTagName('');
      setTags(prev =>
        [...prev, data.tag].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading && !categories.length && !platforms.length) {
    return <div className="text-sm">Loading inventory settings…</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load inventory settings: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Categories */}
      <section className="bg-white p-4 rounded shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Categories</h3>
          <button
            type="button"
            onClick={loadAll}
            className="text-xs underline"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Structured categories like "Glassware - Paperweights", "Barware",
          etc. Used for reporting and filtering.
        </p>

        <form
          onSubmit={createCategory}
          className="flex flex-wrap gap-2 text-xs items-center"
        >
          <input
            type="text"
            className="border rounded px-2 py-1 flex-1 min-w-[160px]"
            placeholder="New category name"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
          />
          <button
            type="submit"
            className="bg-slate-900 text-white px-3 py-1 rounded"
          >
            Add category
          </button>
        </form>

        <div className="flex flex-wrap gap-1 text-xs">
          {categories.map(c => (
            <span
              key={c.id}
              className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50"
            >
              {c.name}
            </span>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-slate-400">No categories yet.</p>
          )}
        </div>

        <MergeControls
          label="categories"
          items={categories}
          mergeEndpoint="/api/categories/merge"
          onMerged={loadAll}
        />
      </section>

      {/* Platforms */}
      <section className="bg-white p-4 rounded shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Listing platforms</h3>
          <button
            type="button"
            onClick={loadAll}
            className="text-xs underline"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Platforms you list on, like eBay, Facebook Marketplace, Etsy, or
          auction houses.
        </p>

        <form
          onSubmit={createPlatform}
          className="grid md:grid-cols-4 gap-2 text-xs items-center"
        >
          <input
            type="text"
            className="border rounded px-2 py-1"
            placeholder="Name (e.g. eBay)"
            value={newPlatformName}
            onChange={e => setNewPlatformName(e.target.value)}
          />
          <input
            type="text"
            className="border rounded px-2 py-1"
            placeholder="Slug (e.g. ebay)"
            value={newPlatformSlug}
            onChange={e => setNewPlatformSlug(e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1"
            placeholder="Default fee % (optional)"
            value={newPlatformFee}
            onChange={e => setNewPlatformFee(e.target.value)}
          />
          <button
            type="submit"
            className="bg-slate-900 text-white px-3 py-1 rounded"
          >
            Add platform
          </button>
        </form>

        <div className="flex flex-wrap gap-2 text-xs">
          {platforms.map(p => (
            <span
              key={p.id}
              className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50"
            >
              {p.name}
              {p.default_fee_percent != null && (
                <span className="text-[11px] text-slate-500">
                  {' '}
                  · {p.default_fee_percent}%
                </span>
              )}
            </span>
          ))}
          {platforms.length === 0 && (
            <p className="text-xs text-slate-400">No platforms yet.</p>
          )}
        </div>

        <MergeControls
          label="platforms"
          items={platforms}
          mergeEndpoint="/api/platforms/merge"
          onMerged={loadAll}
        />
      </section>

      {/* Acquisition sources */}
      <section className="bg-white p-4 rounded shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Acquisition sources</h3>
          <button
            type="button"
            onClick={loadAll}
            className="text-xs underline"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Where you buy items: thrift stores, estate sales, flea markets, etc.
        </p>

        <form
          onSubmit={createSource}
          className="grid md:grid-cols-3 gap-2 text-xs items-center"
        >
          <input
            type="text"
            className="border rounded px-2 py-1"
            placeholder="Name (e.g. Local Thrift)"
            value={newSourceName}
            onChange={e => setNewSourceName(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1"
            value={newSourceType}
            onChange={e =>
              setNewSourceType(e.target.value as AcquisitionSource['source_type'])
            }
          >
            <option value="thrift_store">Thrift store</option>
            <option value="estate_sale">Estate sale</option>
            <option value="flea_market">Flea market</option>
            <option value="online_marketplace">Online marketplace</option>
            <option value="auction_house">Auction house</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            className="bg-slate-900 text-white px-3 py-1 rounded"
          >
            Add source
          </button>
        </form>

        <div className="flex flex-wrap gap-2 text-xs">
          {sources.map(s => (
            <span
              key={s.id}
              className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50"
            >
              {s.name}
              <span className="text-[11px] text-slate-500">
                {' '}
                · {s.source_type.replace('_', ' ')}
              </span>
            </span>
          ))}
          {sources.length === 0 && (
            <p className="text-xs text-slate-400">No sources yet.</p>
          )}
        </div>

        <MergeControls
          label="sources"
          items={sources}
          mergeEndpoint="/api/acquisition-sources/merge"
          onMerged={loadAll}
        />
      </section>

      {/* Locations */}
      <section className="bg-white p-4 rounded shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Inventory locations</h3>
          <button
            type="button"
            onClick={loadAll}
            className="text-xs underline"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Physical storage locations: shelves, bins, rooms, or offsite storage.
        </p>

        <form
          onSubmit={createLocation}
          className="flex flex-wrap gap-2 text-xs items-center"
        >
          <input
            type="text"
            className="border rounded px-2 py-1 flex-1 min-w-[160px]"
            placeholder="Name (e.g. Closet – Shelf B)"
            value={newLocationName}
            onChange={e => setNewLocationName(e.target.value)}
          />
          <button
            type="submit"
            className="bg-slate-900 text-white px-3 py-1 rounded"
          >
            Add location
          </button>
        </form>

        <div className="flex flex-wrap gap-2 text-xs">
          {locations.map(l => (
            <span
              key={l.id}
              className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50"
            >
              {l.name}
            </span>
          ))}
          {locations.length === 0 && (
            <p className="text-xs text-slate-400">No locations yet.</p>
          )}
        </div>

        <MergeControls
          label="locations"
          items={locations}
          mergeEndpoint="/api/inventory-locations/merge"
          onMerged={loadAll}
        />
      </section>

      {/* Tags */}
      <section className="bg-white p-4 rounded shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Tags</h3>
          <button
            type="button"
            onClick={loadAll}
            className="text-xs underline"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Cross-cutting labels like "Barware", "Holiday", "Giftable",
          "Midcentury", etc. Used for flexible grouping.
        </p>

        <form
          onSubmit={createTag}
          className="flex flex-wrap gap-2 text-xs items-center"
        >
          <input
            type="text"
            className="border rounded px-2 py-1 flex-1 min-w-[160px]"
            placeholder="New tag (e.g. Barware)"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
          />
          <button
            type="submit"
            className="bg-slate-900 text-white px-3 py-1 rounded"
          >
            Add tag
          </button>
        </form>

        <div className="flex flex-wrap gap-2 text-xs">
          {tags.map(t => (
            <span
              key={t.id}
              className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50"
            >
              {t.name}
            </span>
          ))}
          {tags.length === 0 && (
            <p className="text-xs text-slate-400">No tags yet.</p>
          )}
        </div>

        <MergeControls
          label="tags"
          items={tags}
          mergeEndpoint="/api/tags/merge"
          onMerged={loadAll}
        />
      </section>
    </div>
  );
}
