import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const CreatePlatformSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  defaultFeePercent: z.number().min(0).max(100).nullable().optional(),
});

export async function GET() {
  const supabase = createSupabaseServerClient() as any;
  const { data, error } = await supabase
    .from('listing_platforms')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ platforms: data });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient() as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();
  const parsed = CreatePlatformSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, slug, defaultFeePercent } = parsed.data;

  const { data, error } = await supabase
    .from('listing_platforms')
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      default_fee_percent: defaultFeePercent ?? null,
    } as any)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Platform with that name or slug already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ platform: data });
}
