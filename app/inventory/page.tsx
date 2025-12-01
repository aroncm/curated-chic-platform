import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { ItemsInventoryTable } from '@/components/ItemsInventoryTable';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p className="text-sm">
          You must be logged in to view inventory. (Wire up Supabase auth UI when ready.)
        </p>
      </main>
    );
  }

  // Fetch all items with related data
  const { data: allItems, error: allItemsError } = await supabase
    .from('items')
    .select(
      `
      id,
      title,
      status,
      item_images(url),
      purchases(purchase_price, additional_costs),
      listings(listing_price, date_listed, listing_platforms(name)),
      sales(sale_price, sale_date)
    `
    )
    .eq('owner_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (allItemsError) {
    return (
      <main>
        <p className="text-sm text-red-600">
          Error loading inventory: {allItemsError.message}
        </p>
      </main>
    );
  }

  // Transform all items for inventory table
  const inventoryItems = (allItems ?? []).map((item: any) => {
    const purchase = item.purchases?.[0];
    const listing = item.listings?.[0];
    const sale = item.sales?.[0];
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
      sales_price: sale?.sale_price ? Number(sale.sale_price) : null,
      date_listed: listing?.date_listed || null,
      date_sold: sale?.sale_date || null,
      thumbnail_url: item.item_images?.[0]?.url || null,
    };
  });

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventory Management</h2>
      </div>
      <ItemsInventoryTable items={inventoryItems} />
    </main>
  );
}
