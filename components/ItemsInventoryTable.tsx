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
    <div className="bg-white rounded shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold w-20">Image</th>
              <th className="text-left px-4 py-3 font-semibold w-48">Item Name</th>
              <th className="text-left px-4 py-3 font-semibold w-28">Status</th>
              <th className="text-left px-4 py-3 font-semibold w-36">Platform</th>
              <th className="text-left px-4 py-3 font-semibold w-24">Cost</th>
              <th className="text-left px-4 py-3 font-semibold w-28">Suggested Price</th>
              <th className="text-left px-4 py-3 font-semibold w-32">Date Listed</th>
              <th className="text-left px-4 py-3 font-semibold w-28">Sales Price</th>
              <th className="text-left px-4 py-3 font-semibold w-32">Date Sold</th>
              <th className="text-left px-4 py-3 font-semibold w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-slate-500 text-sm"
                >
                  No items in inventory yet. Add items to get started.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    {/* Image */}
                    <td className="px-4 py-3">
                      {item.thumbnail_url ? (
                        <div className="relative w-12 h-12">
                          <Image
                            src={item.thumbnail_url}
                            alt={item.title}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">
                          No img
                        </div>
                      )}
                    </td>

                    {/* Item Name */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/items/${item.id}`}
                        className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium block truncate"
                        title={item.title}
                      >
                        {item.title}
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
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
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      )}
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.platform ?? item.platform ?? ''}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              platform: e.target.value || null,
                            })
                          }
                          placeholder="e.g., eBay"
                          className="w-28 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="text-slate-700 block truncate" title={item.platform || ''}>
                          {item.platform || '—'}
                        </span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-500 text-sm">$</span>
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
                            className="w-24 pl-5 pr-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-700">
                          {item.cost != null ? `$${Number(item.cost).toFixed(2)}` : '—'}
                        </span>
                      )}
                    </td>

                    {/* Listing Price */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={
                              editValues.listing_price ?? item.listing_price ?? ''
                            }
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                listing_price: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            placeholder="0.00"
                            className="w-24 pl-5 pr-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-700">
                          {item.listing_price != null
                            ? `$${Number(item.listing_price).toFixed(2)}`
                            : '—'}
                        </span>
                      )}
                    </td>

                    {/* Date Listed */}
                    <td className="px-4 py-3">
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
                          className="w-32 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="text-slate-700">
                          {item.date_listed || '—'}
                        </span>
                      )}
                    </td>

                    {/* Sales Price */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-500 text-sm">$</span>
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
                            className="w-24 pl-5 pr-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-700">
                          {item.sales_price != null
                            ? `$${Number(item.sales_price).toFixed(2)}`
                            : '—'}
                        </span>
                      )}
                    </td>

                    {/* Date Sold */}
                    <td className="px-4 py-3">
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
                          className="w-32 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="text-slate-700">
                          {item.date_sold || '—'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(item.id)}
                            disabled={saving}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="text-xs text-slate-600 hover:text-slate-700 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-xs text-slate-600 hover:text-emerald-600 font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
