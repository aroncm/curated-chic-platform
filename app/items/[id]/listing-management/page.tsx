import Image from 'next/image';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { ListingCopyManager } from '@/components/ListingCopyManager';
import { Breadcrumb } from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';

export default async function ListingManagementPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();

  const { data: item, error } = await supabase
    .from('items')
    .select(
      [
        'id',
        'title',
        'category',
        'brand_or_maker',
        'style_or_era',
        'material',
        'color',
        'dimensions_guess',
        'condition_summary',
        'condition_grade',
        'estimated_low_price',
        'estimated_high_price',
        'suggested_list_price',
        'item_images(*)',
      ].join(',')
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !item) {
    return (
      <main>
        <p className="text-sm text-red-600">
          Error loading item: {error?.message || 'Item not found'}
        </p>
      </main>
    );
  }

  const itemData = item as any;
  const images = (itemData.item_images || []) as Array<{
    id: string;
    url: string;
  }>;
  const primaryImage = images[0];

  return (
    <main className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Inventory', href: '/inventory' },
          { label: itemData.title || 'Item', href: `/items/${itemData.id}` },
          { label: 'Listing Management' },
        ]}
      />

      {/* Header with item info */}
      <div className="bg-white p-6 rounded shadow-sm">
        <div className="flex items-start gap-4">
          {/* Primary Image */}
          {primaryImage && (
            <div className="relative w-32 h-32 flex-shrink-0">
              <Image
                src={primaryImage.url}
                alt={itemData.title}
                fill
                className="object-cover rounded"
              />
            </div>
          )}

          {/* Item Details */}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold mb-2">{itemData.title}</h1>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-slate-600">Category:</div>
              <div className="font-medium">{itemData.category || '—'}</div>

              <div className="text-slate-600">Brand/Maker:</div>
              <div className="font-medium">{itemData.brand_or_maker || '—'}</div>

              <div className="text-slate-600">Style/Era:</div>
              <div className="font-medium">{itemData.style_or_era || '—'}</div>

              <div className="text-slate-600">Material:</div>
              <div className="font-medium">{itemData.material || '—'}</div>

              <div className="text-slate-600">Condition:</div>
              <div className="font-medium">
                {itemData.condition_grade || 'See summary'}
              </div>

              <div className="text-slate-600">Condition Summary:</div>
              <div className="font-medium col-span-1">
                {itemData.condition_summary || '—'}
              </div>

              <div className="text-slate-600">Suggested List Price:</div>
              <div className="font-medium text-emerald-600">
                ${itemData.suggested_list_price ? Number(itemData.suggested_list_price).toFixed(2) : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listing Copy Manager */}
      <ListingCopyManager itemId={itemData.id} />
    </main>
  );
}
