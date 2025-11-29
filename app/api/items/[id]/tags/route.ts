import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const TagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServerClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: itemId } = await params;

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, owner_id')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  if ((item as any).owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from('item_tags')
    .select('tag_id')
    .eq('item_id', itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tagIds: (rows ?? []).map((r: any) => r.tag_id),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServerClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: itemId } = await params;
  const json = await req.json();
  const parsed = TagsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tagIds } = parsed.data;

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, owner_id')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  if ((item as any).owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate tags exist (if any)
  if (tagIds.length > 0) {
    const { data: existingTags, error: tagsError } = await supabase
      .from('tags')
      .select('id')
      .in('id', tagIds);

    if (tagsError) {
      return NextResponse.json({ error: tagsError.message }, { status: 500 });
    }

    const existingIds = new Set((existingTags ?? []).map((t: any) => t.id));
    const missing = tagIds.filter(id => !existingIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Some tags do not exist', missing },
        { status: 400 }
      );
    }
  }

  // Clear existing tags
  const { error: deleteError } = await supabase
    .from('item_tags')
    .delete()
    .eq('item_id', itemId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert new tags
  if (tagIds.length > 0) {
    const rowsToInsert = tagIds.map(tagId => ({
      item_id: itemId,
      tag_id: tagId,
    }));

    const { error: insertError } = await supabase
      .from('item_tags')
      .insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
