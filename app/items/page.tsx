import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { AddItemForm } from '@/components/AddItemForm';
import { ItemsQueueList } from '@/components/ItemsQueueList';
import { ItemsInventoryTable } from '@/components/ItemsInventoryTable';

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

  // Fetch all items for inventory table
  const { data: allItems, error: allItemsError } = await supabase
    .from('items')
    .select(
      `
      id,
      title,
      status,
      item_images(url),
      purchases(purchase_price, additional_costs),
      listings(listing_price, listing_platforms(name))
    `
    )
    .eq('owner_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (queueError || allItemsError) {
    return (
      <main>
        <p className="text-sm text-red-600">
          Error loading items: {queueError?.message || allItemsError?.message}
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

  // Transform all items for inventory table
  const inventoryItems = (allItems ?? []).map((item: any) => {
    const purchase = item.purchases?.[0];
    const listing = item.listings?.[0];
    const cost = purchase?.purchase_price
      ? Number(purchase.purchase_price) +
        (purchase.additional_costs ? Number(purchase.additional_costs) : 0)
      : null;

    return {
      id: item.id,
      title: item.title,
      status: item.status,
      platform: listing?.listing_platforms?.name || null,
      cost,
      listing_price: listing?.listing_price ? Number(listing.listing_price) : null,
      sales_price: null, // TODO: Add sales data when available
      thumbnail_url: item.item_images?.[0]?.url || null,
    };
  });

  return (
    <main className="space-y-6">
      {/* Add Item Form */}
      <AddItemForm />

      {/* Items Queue */}
      <ItemsQueueList items={queuedItemsData} />

      {/* Inventory Management Table */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Inventory Management</h2>
        </div>
        <ItemsInventoryTable items={inventoryItems} />
      </div>
    </main>
  );
}
