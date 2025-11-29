import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const MergeSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient() as any;
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

  const { data: locations, error: locError } = await supabase
    .from('inventory_locations')
    .select('id')
    .in('id', [fromId, toId]);

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 });
  }
  if (!locations || locations.length !== 2) {
    return NextResponse.json(
      { error: 'Both locations must exist.' },
      { status: 400 }
    );
  }

  const { error: updateItemsError } = await supabase
    .from('items')
    .update({ location_id: toId } as any)
    .eq('location_id', fromId);

  if (updateItemsError) {
    return NextResponse.json({ error: updateItemsError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from('inventory_locations')
    .delete()
    .eq('id', fromId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
