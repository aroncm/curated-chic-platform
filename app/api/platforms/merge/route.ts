import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';

const MergeSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
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

  const { data: platforms, error: platError } = await supabase
    .from('listing_platforms')
    .select('id')
    .in('id', [fromId, toId]);

  if (platError) {
    return NextResponse.json({ error: platError.message }, { status: 500 });
  }
  if (!platforms || platforms.length !== 2) {
    return NextResponse.json(
      { error: 'Both platforms must exist.' },
      { status: 400 }
    );
  }

  const { error: updateListingsError } = await supabase
    .from('listings')
    .update({ platform_id: toId })
    .eq('platform_id', fromId);

  if (updateListingsError) {
    return NextResponse.json({ error: updateListingsError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from('listing_platforms')
    .delete()
    .eq('id', fromId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
