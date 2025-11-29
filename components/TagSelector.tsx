'use client';

import { useEffect, useState } from 'react';

type Tag = { id: string; name: string };

export function TagSelector({
  itemId,
  initialTagIds,
}: {
  itemId: string;
  initialTagIds: string[];
}) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTagIds);
  const [newTagName, setNewTagName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTags = async () => {
    try {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('Failed to load tags');
      const data = await res.json();
      setAllTags(data.tags || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const toggleTag = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${itemId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save tags');
      }
      setMessage('Tags saved.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create tag');
      }
      const { tag } = await res.json();
      setNewTagName('');
      await loadTags();
      setSelectedIds(prev =>
        prev.includes(tag.id) ? prev : [...prev, tag.id]
      );
      setMessage('Tag created and applied.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium">Tags</label>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-slate-900 text-white px-3 py-1 rounded text-[11px] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save tags'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Use for concepts like “Barware”, “Holiday”, “Giftable”, “Smoky Glass”.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {allTags.map(tag => {
          const active = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={
                'px-2 py-1 rounded-full text-[11px] border ' +
                (active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200')
              }
            >
              {tag.name}
            </button>
          );
        })}
        {allTags.length === 0 && (
          <p className="text-[11px] text-slate-400">
            No tags yet. Create one below.
          </p>
        )}
      </div>

      <form onSubmit={handleCreateTag} className="space-y-1">
        <label className="text-[11px] font-medium">Create new tag</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="border rounded px-2 py-1 text-xs flex-1"
            placeholder="e.g. Barware, Holiday, Giftable"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !newTagName.trim()}
            className="bg-slate-900 text-white px-3 py-1 rounded text-[11px] disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {message && (
        <p className="text-[11px] text-emerald-600">{message}</p>
      )}
    </div>
  );
}
