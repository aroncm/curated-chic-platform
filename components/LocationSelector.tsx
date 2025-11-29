'use client';

import { useEffect, useState } from 'react';

type Location = {
  id: string;
  name: string;
  notes: string | null;
};

export function LocationSelector({
  itemId,
  initialLocationId,
}: {
  itemId: string;
  initialLocationId: string | null;
}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string | ''>(
    initialLocationId ?? ''
  );
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = async () => {
    try {
      const res = await fetch('/api/inventory-locations');
      if (!res.ok) throw new Error('Failed to load locations');
      const data = await res.json();
      setLocations(data.locations || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const saveLocation = async (newLocationId: string | '') => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${itemId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: newLocationId || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update location');
      }
      setLocationId(newLocationId);
      setMessage('Location updated.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    saveLocation(e.target.value);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/inventory-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create location');
      }
      const { location } = await res.json();
      setNewName('');
      await loadLocations();
      await saveLocation(location.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium">Inventory location</label>
        <select
          className="border rounded px-2 py-1 text-xs bg-white"
          value={locationId}
          onChange={handleSelect}
          disabled={loading}
        >
          <option value="">— Not assigned —</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreate} className="space-y-1">
        <label className="text-[11px] font-medium">
          Create new location
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="border rounded px-2 py-1 text-xs flex-1"
            placeholder="e.g. Home – Shelf A, Storage – Box 3"
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

      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {message && (
        <p className="text-[11px] text-emerald-600">{message}</p>
      )}
    </div>
  );
}
