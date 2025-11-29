import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const MergeSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient() as any; // 
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = MergeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fromId, toId } = parsed.data;
  if (fromId === toId) {
    return NextResponse.json(
      { error: 'fromId and toId must be different.' },
      { status: 400 }
    );
  }

  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('id')
    .in('id', [fromId, toId]);

  if (tagsError) {
    return NextResponse.json({ error: tagsError.message }, { status: 500 });
  }
  if (!tags || tags.length !== 2) {
    return NextResponse.json(
      { error: 'Both tags must exist.' },
      { status: 400 }
    );
  }

  // 1) Fetch all item_ids that have fromId
  const { data: itemRows, error: itemTagsError } = await supabase
    .from('item_tags')
    .select('item_id')
    .eq('tag_id', fromId);

  if (itemTagsError) {
    return NextResponse.json({ error: itemTagsError.message }, { status: 500 });
  }

  const itemIds = (itemRows ?? []).map((r: any) => r.item_id);
  if (itemIds.length > 0) {
    // 2) Upsert (item_id, toId) pairs
    const rowsToInsert = itemIds.map((itemId: any) => ({
      item_id: itemId,
      tag_id: toId,
    }));

    const { error: insertError } = await supabase
      .from('item_tags')
      .upsert(rowsToInsert, { onConflict: 'item_id,tag_id' });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // 3) Delete all item_tags with fromId
  const { error: deleteTagLinksError } = await supabase
    .from('item_tags')
    .delete()
    .eq('tag_id', fromId);

  if (deleteTagLinksError) {
    return NextResponse.json({ error: deleteTagLinksError.message }, { status: 500 });
  }

  // 4) Delete tag itself
  const { error: deleteTagError } = await supabase
    .from('tags')
    .delete()
    .eq('id', fromId);

  if (deleteTagError) {
    return NextResponse.json({ error: deleteTagError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
