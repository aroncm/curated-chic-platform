import Image from 'next/image';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { AiStatusBanner } from '@/components/AiStatusBanner';
import { ListingCopy } from '@/components/ListingCopy';
import { SalesEditor } from '@/components/SalesEditor';
import { ListingMetaEditor } from '@/components/ListingMetaEditor';
import { CategorySelector } from '@/components/CategorySelector';
import { ConditionSelector } from '@/components/ConditionSelector';
import { LocationSelector } from '@/components/LocationSelector';
import { TagSelector } from '@/components/TagSelector';

export default async function ItemDetailPage({
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
        'status',
        'category',
        'category_id',
        'brand_or_maker',
        'style_or_era',
        'material',
        'color',
        'dimensions_guess',
        'condition_summary',
        'condition_grade',
        'is_restored',
        'location_id',
        'estimated_low_price',
        'estimated_high_price',
        'suggested_list_price',
        'ai_status',
        'ai_error',
        'owner_id',
        'item_images(*)',
        'purchases(*)',
        'listings(*)',
        'sales(*)',
      ].join(',')
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return (
      <main>
        <p className="text-sm text-red-600">Error loading item: {error.message}</p>
      </main>
    );
  }

  if (!item) return <main>Item not found.</main>;

  const { data: itemTags } = await supabase
    .from('item_tags')
    .select('tag_id')
    .eq('item_id', (item as any).id);

  const initialTagIds: string[] = itemTags?.map((t: any) => t.tag_id) ?? [];

  const images = (item as any).item_images || [];
  const purchase = (item as any).purchases?.[0];
  const listing = (item as any).listings?.[0];
  const sale = (item as any).sales?.[0];

  const costBasis =
    purchase?.purchase_price != null
      ? Number(purchase.purchase_price) +
        (purchase.additional_costs ? Number(purchase.additional_costs) : 0)
      : null;

  return (
    <main className="space-y-6">
      <AiStatusBanner status={(item as any).ai_status} error={(item as any).ai_error} />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{item.title}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Status:{' '}
            <span className="capitalize font-medium">{item.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <form action={`/api/items/${item.id}/analyze`} method="post">
            <button className="bg-emerald-600 text-white px-4 py-2 rounded text-sm">
              Run AI analysis
            </button>
          </form>
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex gap-4 overflow-x-auto">
          {images.map((img: any) => (
            <div key={img.id} className="relative w-40 h-40 flex-shrink-0">
              <Image
                src={img.url}
                alt={item.title}
                fill
                className="object-cover rounded"
              />
            </div>
          ))}
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-6">
        {/* Left panel: identification, condition, location, tags */}
        <div className="bg-white p-4 rounded shadow-sm space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Identification & valuation</h3>
            <p>
              <span className="font-medium">AI category (free-text):</span>{' '}
              {item.category || '—'}
            </p>
            <CategorySelector
              itemId={item.id}
              initialCategoryId={item.category_id}
              aiCategory={item.category}
            />
            <p className="mt-2">
              <span className="font-medium">Brand/maker:</span>{' '}
              {item.brand_or_maker || '—'}
            </p>
            <p>
              <span className="font-medium">Style/era:</span>{' '}
              {item.style_or_era || '—'}
            </p>
            <p>
              <span className="font-medium">Material:</span>{' '}
              {item.material || '—'}
            </p>
            <p>
              <span className="font-medium">Color:</span>{' '}
              {item.color || '—'}
            </p>
            <p>
              <span className="font-medium">Dimensions (approx):</span>{' '}
              {item.dimensions_guess || '—'}
            </p>
            <p className="mt-2">
              <span className="font-medium">Price range:</span>{' '}
              {item.estimated_low_price && item.estimated_high_price
                ? `$${Number(item.estimated_low_price).toFixed(
                    0
                  )} – $${Number(item.estimated_high_price).toFixed(0)}`
                : '—'}
            </p>
            <p>
              <span className="font-medium">Suggested list price:</span>{' '}
              {item.suggested_list_price
                ? `$${Number(item.suggested_list_price).toFixed(0)}`
                : '—'}
            </p>
            {purchase && (
              <p>
                <span className="font-medium">Purchase:</span>{' '}
                {purchase.source || 'unknown'} –{' '}
                {purchase.purchase_price
                  ? `$${Number(purchase.purchase_price).toFixed(2)}`
                  : 'price unknown'}
              </p>
            )}
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold mb-2">
              Condition & location
            </h4>
            <ConditionSelector
              itemId={item.id}
              initialGrade={item.condition_grade}
              initialIsRestored={item.is_restored}
              initialSummary={item.condition_summary}
            />
            <div className="mt-3">
              <LocationSelector
                itemId={item.id}
                initialLocationId={item.location_id}
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <TagSelector itemId={item.id} initialTagIds={initialTagIds} />
          </div>
        </div>

        {/* Right panel: listing meta & copy */}
        <div className="space-y-4">
          <ListingMetaEditor itemId={item.id} initialListing={listing} />
          {listing ? (
            <ListingCopy listingId={listing.id} />
          ) : (
            <div className="bg-white p-4 rounded shadow-sm text-sm">
              <h3 className="font-semibold mb-2">Listing copy</h3>
              <p className="text-slate-500 text-xs">
                Run AI analysis to generate suggested titles and descriptions
                for eBay, Facebook, and Etsy.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Sales & profit editor */}
      <section>
        <SalesEditor
          itemId={item.id}
          listingId={listing?.id}
          initialSale={sale}
          costBasis={costBasis}
        />
      </section>
    </main>
  );
}
