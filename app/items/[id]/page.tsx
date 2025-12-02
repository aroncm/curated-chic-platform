import Image from 'next/image';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { AiStatusBanner } from '@/components/AiStatusBanner';
import { AnalysisResultsView } from '@/components/AnalysisResultsView';
import { Breadcrumb } from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';

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
        'reasoning',
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

  const itemData = item as any;

  const images = (itemData as any).item_images || [];
  const purchase = (itemData as any).purchases?.[0];

  const costBasis =
    purchase?.purchase_price != null
      ? Number(purchase.purchase_price) +
        (purchase.additional_costs ? Number(purchase.additional_costs) : 0)
      : null;

  return (
    <main className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Inventory', href: '/inventory' },
          { label: itemData.title || 'Item Details' },
        ]}
      />

      <AiStatusBanner status={(itemData as any).ai_status} error={(itemData as any).ai_error} />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{itemData.title}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Status:{' '}
            <span className="capitalize font-medium">{itemData.status}</span>
          </p>
        </div>
        {itemData.ai_status === 'idle' && (
          <div className="flex gap-2">
            <form action={`/api/items/${itemData.id}/analyze`} method="post">
              <button className="bg-emerald-600 text-white px-4 py-2 rounded text-sm">
                Analyze This Item
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Show images if AI analysis hasn't been done yet */}
      {itemData.ai_status !== 'complete' && images.length > 0 && (
        <div className="flex gap-4 overflow-x-auto">
          {images.map((img: any) => (
            <div key={img.id} className="relative w-40 h-40 flex-shrink-0">
              <Image
                src={img.url}
                alt={itemData.title}
                fill
                className="object-cover rounded"
              />
            </div>
          ))}
        </div>
      )}

      {/* AI Analysis Results (if complete) - now includes images */}
      {itemData.ai_status === 'complete' && (
        <AnalysisResultsView
          itemId={itemData.id}
          currentTitle={itemData.title}
          analysis={{
            category: itemData.category,
            brand_or_maker: itemData.brand_or_maker,
            style_or_era: itemData.style_or_era,
            material: itemData.material,
            color: itemData.color,
            dimensions_guess: itemData.dimensions_guess,
            condition_summary: itemData.condition_summary,
            condition_grade: itemData.condition_grade,
            estimated_low_price: itemData.estimated_low_price,
            estimated_high_price: itemData.estimated_high_price,
            suggested_list_price: itemData.suggested_list_price,
            reasoning: itemData.reasoning,
          }}
          costBasis={costBasis}
          images={images}
        />
      )}
    </main>
  );
}
