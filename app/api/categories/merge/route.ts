import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const MergeSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
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

  // Ensure both categories exist
  const { data: cats, error: catsError } = await supabase
    .from('categories')
    .select('id')
    .in('id', [fromId, toId]);

  if (catsError) {
    return NextResponse.json({ error: catsError.message }, { status: 500 });
  }
  if (!cats || cats.length !== 2) {
    return NextResponse.json(
      { error: 'Both categories must exist.' },
      { status: 400 }
    );
  }

  // Repoint items.category_id
  const { error: updateItemsError } = await supabase
    .from('items')
    .update({ category_id: toId })
    .eq('category_id', fromId);

  if (updateItemsError) {
    return NextResponse.json({ error: updateItemsError.message }, { status: 500 });
  }

  // Optional: reparent children categories
  const { error: updateChildrenError } = await supabase
    .from('categories')
    .update({ parent_id: toId })
    .eq('parent_id', fromId);

  if (updateChildrenError) {
    return NextResponse.json({ error: updateChildrenError.message }, { status: 500 });
  }

  // Delete the old category
  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', fromId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
