import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const CreateSourceSchema = z.object({
  name: z.string().min(1).max(200),
  sourceType: z.enum([
    'thrift_store',
    'estate_sale',
    'flea_market',
    'online_marketplace',
    'auction_house',
    'other',
  ]),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('acquisition_sources')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sources: data });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = CreateSourceSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, sourceType, notes } = parsed.data;

  const { data, error } = await supabase
    .from('acquisition_sources')
    .insert({
      name: name.trim(),
      source_type: sourceType,
      notes: notes ?? null,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Source with that name already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data });
}
