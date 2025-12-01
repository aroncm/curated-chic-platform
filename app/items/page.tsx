import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { AddItemForm } from '@/components/AddItemForm';
import { ItemsQueueList } from '@/components/ItemsQueueList';

export const dynamic = 'force-dynamic';

export default async function ItemsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p className="text-sm">
          You must be logged in to view items. (Wire up Supabase auth UI when ready.)
        </p>
      </main>
    );
  }

  // Fetch queued items (status='new' AND ai_status='idle')
  const { data: queuedItems, error: queueError } = await supabase
    .from('items')
    .select('id, title, created_at, ai_status, item_images(url)')
    .eq('owner_id', user.id)
    .eq('status', 'new')
    .eq('ai_status', 'idle')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Fetch analyzed items (status='identified' or later)
  const { data: analyzedItems, error: analyzedError } = await supabase
    .from('items')
    .select('id, title, status, created_at')
    .eq('owner_id', user.id)
    .in('status', ['identified', 'listed', 'sold'])
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (queueError || analyzedError) {
    return (
      <main>
        <p className="text-sm text-red-600">
          Error loading items: {queueError?.message || analyzedError?.message}
        </p>
      </main>
    );
  }

  // Transform queued items data
  const queuedItemsData = (queuedItems ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    created_at: item.created_at,
    ai_status: item.ai_status,
    image_count: item.item_images?.length || 0,
    thumbnail_url: item.item_images?.[0]?.url || undefined,
  }));

  return (
    <main className="space-y-6">
      {/* Add Item Form */}
      <AddItemForm />

      {/* Items Queue */}
      <ItemsQueueList items={queuedItemsData} />

      {/* Analyzed Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Analyzed Items</h2>
        </div>
        <table className="w-full text-xs md:text-sm bg-white rounded shadow-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(analyzedItems ?? []).map((item: any) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/items/${item.id}`} className="hover:underline">
                    {item.title}
                  </Link>
                </td>
                <td className="px-3 py-2 capitalize">{item.status}</td>
                <td className="px-3 py-2">
                  {item.created_at
                    ? new Date(item.created_at as any).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
            {analyzedItems?.length === 0 && queuedItemsData.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-4 text-xs text-slate-500 text-center"
                >
                  No items yet. Add an item above to get started.
                </td>
              </tr>
            )}
            {analyzedItems?.length === 0 && queuedItemsData.length > 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-4 text-xs text-slate-500 text-center"
                >
                  No analyzed items yet. Click "Analyze Items" above to process your queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
