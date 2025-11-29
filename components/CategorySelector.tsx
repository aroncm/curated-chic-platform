'use client';

import { useEffect, useState } from 'react';

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

export function CategorySelector({
  itemId,
  initialCategoryId,
  aiCategory,
}: {
  itemId: string;
  initialCategoryId: string | null;
  aiCategory: string | null;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | ''>(
    initialCategoryId ?? ''
  );
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Failed to load categories');
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const assignCategory = async (categoryId: string | '') => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: categoryId || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to assign category');
      }
      setSelectedId(categoryId);
      setMessage('Category updated.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    assignCategory(e.target.value);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), parentId: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create category');
      }
      const { category } = await res.json();
      setCategories(prev =>
        [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName('');
      await assignCategory(category.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const selectedLabel =
    selectedId && categories.find(c => c.id === selectedId)?.name;

  return (
    <div className="mt-2 border-t pt-2 text-xs space-y-2">
      <div className="flex flex-col gap-1">
        <span className="font-medium">Category (structured)</span>
        <select
          className="border rounded px-2 py-1 text-xs bg-white"
          value={selectedId}
          onChange={handleSelectChange}
          disabled={loading}
        >
          <option value="">— No category selected —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {aiCategory && (
          <p className="text-[11px] text-slate-500">
            AI suggestion: <span className="italic">{aiCategory}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleCreate} className="space-y-1">
        <label className="block text-[11px] font-medium">
          Create new category
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border rounded px-2 py-1 text-xs"
            placeholder="e.g. Glassware - Paperweights"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-slate-900 text-white px-3 py-1 rounded text-[11px] disabled:opacity-50"
          >
            {creating ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      {message && (
        <p className="text-[11px] text-emerald-600">{message}</p>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}

      {selectedLabel && (
        <p className="text-[11px] text-slate-600">
          Selected category:{' '}
          <span className="font-medium">{selectedLabel}</span>
        </p>
      )}
    </div>
  );
}
