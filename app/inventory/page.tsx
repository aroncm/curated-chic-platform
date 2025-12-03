import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { ItemsInventoryTable } from '@/components/ItemsInventoryTable';
import { Breadcrumb } from '@/components/Breadcrumb';

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

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.is_admin || false;

  // Build query - admins see all items, regular users see only their own
  let query = supabase
    .from('items')
    .select(
      `
      id,
      title,
      status,
      suggested_list_price,
      import_source,
      item_images(url),
      purchases(purchase_price, additional_costs),
      listings(listing_price, date_listed, listing_platforms(name)),
      sales(sale_price, sale_date, shipping_cost, platform_fees, other_fees)
    `
    )
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Only filter by owner_id if not admin
  if (!isAdmin) {
    query = query.eq('owner_id', user.id);
  }

  const { data: allItems, error: allItemsError } = await query;

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

    // Calculate total fees (shipping + platform + other)
    const totalFees = sale
      ? (sale.shipping_cost ? Number(sale.shipping_cost) : 0) +
        (sale.platform_fees ? Number(sale.platform_fees) : 0) +
        (sale.other_fees ? Number(sale.other_fees) : 0)
      : null;

    return {
      id: item.id,
      title: item.title,
      status: item.status,
      platform: listing?.listing_platforms?.name || null,
      cost,
      suggested_price: item.suggested_list_price ? Number(item.suggested_list_price) : null,
      listing_price: listing?.listing_price ? Number(listing.listing_price) : null,
      sales_price: sale?.sale_price ? Number(sale.sale_price) : null,
      date_listed: listing?.date_listed || null,
      date_sold: sale?.sale_date || null,
      thumbnail_url: item.item_images?.[0]?.url || null,
      shipping_cost: sale?.shipping_cost ? Number(sale.shipping_cost) : null,
      platform_fees: sale?.platform_fees ? Number(sale.platform_fees) : null,
      other_fees: sale?.other_fees ? Number(sale.other_fees) : null,
      total_fees: totalFees,
      import_source: item.import_source,
    };
  });

  return (
    <main className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/items' },
          { label: 'Inventory' },
        ]}
      />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventory Management</h2>
      </div>
      <ItemsInventoryTable items={inventoryItems} />
    </main>
  );
}
