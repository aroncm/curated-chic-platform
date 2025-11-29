import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const MergeSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient() as SupabaseClient<Database>;
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

  const { data: sources, error: srcError } = await supabase
    .from('acquisition_sources')
    .select('id')
    .in('id', [fromId, toId]);

  if (srcError) {
    return NextResponse.json({ error: srcError.message }, { status: 500 });
  }
  if (!sources || sources.length !== 2) {
    return NextResponse.json(
      { error: 'Both sources must exist.' },
      { status: 400 }
    );
  }

  const { error: updatePurchasesError } = await supabase
    .from('purchases')
    .update({ source_id: toId } as any)
    .eq('source_id', fromId);

  if (updatePurchasesError) {
    return NextResponse.json({ error: updatePurchasesError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from('acquisition_sources')
    .delete()
    .eq('id', fromId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
