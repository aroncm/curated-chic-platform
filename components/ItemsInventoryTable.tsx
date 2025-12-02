'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

type ItemInventoryRow = {
  id: string;
  title: string;
  status: 'new' | 'identified' | 'listed' | 'sold';
  platform: string | null;
  cost: number | null;
  suggested_price: number | null;
  listing_price: number | null;
  sales_price: number | null;
  date_listed: string | null;
  date_sold: string | null;
  thumbnail_url: string | null;
};

type ItemsInventoryTableProps = {
  items: ItemInventoryRow[];
};

export function ItemsInventoryTable({ items }: ItemsInventoryTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ItemInventoryRow>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleEdit = (item: ItemInventoryRow) => {
    setEditingId(item.id);
    setEditValues({
      status: item.status,
      platform: item.platform,
      cost: item.cost,
      listing_price: item.listing_price,
      sales_price: item.sales_price,
      date_listed: item.date_listed,
      date_sold: item.date_sold,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSave = async (itemId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      setEditingId(null);
      setEditValues({});
      router.refresh();
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${itemTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(itemId);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      router.refresh();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'Unlisted';
      case 'identified':
        return 'Unlisted';
      case 'listed':
        return 'Listed';
      case 'sold':
        return 'Sold';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
      case 'identified':
        return 'bg-slate-100 text-slate-700';
      case 'listed':
        return 'bg-blue-100 text-blue-700';
      case 'sold':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="bg-white rounded shadow-sm p-8 text-center text-slate-500">
          No items in inventory yet. Add items to get started.
        </div>
      ) : (
        items.map((item) => {
          const isEditing = editingId === item.id;

          return (
            <div key={item.id} className="bg-white rounded shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {/* Image */}
                <div className="flex-shrink-0">
                  {item.thumbnail_url ? (
                    <div className="relative w-24 h-24">
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-sm">
                      No image
                    </div>
                  )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <Link
                        href={`/items/${item.id}`}
                        className="text-lg font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        {isEditing ? (
                          <select
                            value={editValues.status || item.status}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                status: e.target.value as ItemInventoryRow['status'],
                              })
                            }
                            className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="new">Unlisted</option>
                            <option value="identified">Unlisted</option>
                            <option value="listed">Listed</option>
                            <option value="sold">Sold</option>
                          </select>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        )}
                        {!isEditing && item.platform && (
                          <span className="text-sm text-slate-600">{item.platform}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(item.id)}
                            disabled={saving}
                            className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            disabled={deleting === item.id}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            disabled={deleting === item.id}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                          >
                            {deleting === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-sm">
                    {/* Platform (only in edit mode) */}
                    {isEditing && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Platform
                        </label>
                        <input
                          type="text"
                          value={editValues.platform ?? item.platform ?? ''}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              platform: e.target.value || null,
                            })
                          }
                          placeholder="eBay"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {/* Cost */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Cost
                      </label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.cost ?? item.cost ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                cost: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <div className="text-slate-900 font-medium">
                          {item.cost != null ? `$${Number(item.cost).toFixed(2)}` : '—'}
                        </div>
                      )}
                    </div>

                    {/* Suggested Price */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Suggested Price
                      </label>
                      <div className="text-slate-900 font-medium">
                        {item.suggested_price != null ? `$${Number(item.suggested_price).toFixed(2)}` : '—'}
                      </div>
                    </div>

                    {/* Listing Price */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Listing Price
                      </label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.listing_price ?? item.listing_price ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                listing_price: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <div className="text-slate-900 font-medium">
                          {item.listing_price != null
                            ? `$${Number(item.listing_price).toFixed(2)}`
                            : '—'}
                        </div>
                      )}
                    </div>

                    {/* Date Listed */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Date Listed
                      </label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editValues.date_listed ?? item.date_listed ?? ''}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              date_listed: e.target.value || null,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <div className="text-slate-900">
                          {item.date_listed || '—'}
                        </div>
                      )}
                    </div>

                    {/* Sales Price */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Sales Price
                      </label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.sales_price ?? item.sales_price ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                sales_price: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <div className="text-slate-900 font-medium">
                          {item.sales_price != null
                            ? `$${Number(item.sales_price).toFixed(2)}`
                            : '—'}
                        </div>
                      )}
                    </div>

                    {/* Date Sold */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Date Sold
                      </label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editValues.date_sold ?? item.date_sold ?? ''}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              date_sold: e.target.value || null,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <div className="text-slate-900">
                          {item.date_sold || '—'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
