import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { AddItemForm } from '@/components/AddItemForm';
import { ItemsQueueList } from '@/components/ItemsQueueList';
import { Breadcrumb } from '@/components/Breadcrumb';

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

  if (queueError) {
    return (
      <main>
        <p className="text-sm text-red-600">
          Error loading items: {queueError.message}
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
      <Breadcrumb items={[{ label: 'Add Items' }]} />

      {/* Add Item Form */}
      <AddItemForm />

      {/* Items Queue */}
      <ItemsQueueList items={queuedItemsData} />
    </main>
  );
}
