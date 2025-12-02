import { createSupabaseServerClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumb } from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';

export default async function ListingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p className="text-sm">
          You must be logged in to view listings.
        </p>
      </main>
    );
  }

  // Fetch all items with listing copy
  const { data: items, error } = await supabase
    .from('items')
    .select(
      `
      id,
      title,
      status,
      category,
      suggested_list_price,
      item_images(url),
      listings(listing_price, date_listed, listing_platforms(name)),
      listing_copy(id, ebay_title, facebook_title, etsy_title, updated_at)
    `
    )
    .eq('owner_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main>
        <p className="text-sm text-red-600">
          Error loading listings: {error.message}
        </p>
      </main>
    );
  }

  const itemsWithCopy = (items ?? []).filter((item: any) => item.listing_copy);
  const itemsWithoutCopy = (items ?? []).filter((item: any) => !item.listing_copy);

  return (
    <main className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/items' },
          { label: 'Listing' },
        ]}
      />

      <div>
        <h2 className="text-xl font-semibold">Listing Management</h2>
        <p className="text-sm text-slate-600 mt-1">
          Manage sales copy and listings for your items across platforms.
        </p>
      </div>

      {/* Items with listing copy */}
      {itemsWithCopy.length > 0 && (
        <section>
          <h3 className="text-base font-semibold mb-3">
            Items with Sales Copy ({itemsWithCopy.length})
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {itemsWithCopy.map((item: any) => {
              const listing = item.listings?.[0];
              const copy = item.listing_copy;
              const thumbnail = item.item_images?.[0]?.url;

              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}/listing-management`}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {thumbnail && (
                    <div className="relative w-full h-48">
                      <Image
                        src={thumbnail}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-sm mb-2 line-clamp-1">
                      {item.title}
                    </h4>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-medium capitalize">{item.status}</span>
                      </div>
                      {listing?.listing_price && (
                        <div className="flex justify-between">
                          <span>Listed at:</span>
                          <span className="font-medium">
                            ${Number(listing.listing_price).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Copy updated:</span>
                        <span className="font-medium">
                          {new Date(copy.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-emerald-600 hover:text-emerald-700">
                      View/Edit Listing Copy →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Items without listing copy */}
      {itemsWithoutCopy.length > 0 && (
        <section>
          <h3 className="text-base font-semibold mb-3">
            Items Without Sales Copy ({itemsWithoutCopy.length})
          </h3>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Item</th>
                    <th className="text-left px-4 py-3 font-medium">Category</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Suggested Price</th>
                    <th className="text-right px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {itemsWithoutCopy.map((item: any) => {
                    const thumbnail = item.item_images?.[0]?.url;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {thumbnail && (
                              <div className="relative w-12 h-12 flex-shrink-0">
                                <Image
                                  src={thumbnail}
                                  alt={item.title}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                            )}
                            <span className="font-medium">{item.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.category || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize">{item.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {item.suggested_list_price
                            ? `$${Number(item.suggested_list_price).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/items/${item.id}/listing-management`}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Generate Copy
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {itemsWithCopy.length === 0 && itemsWithoutCopy.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-slate-600 mb-4">
            No items yet. Add items from the Inventory to get started.
          </p>
          <Link
            href="/items"
            className="inline-block bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
          >
            Add Items
          </Link>
        </div>
      )}
    </main>
  );
}
