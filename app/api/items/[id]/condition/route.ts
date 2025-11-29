import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const ConditionSchema = z.object({
  conditionGrade: z
    .enum(['mint', 'excellent', 'very_good', 'good', 'fair', 'poor'])
    .nullable()
    .optional(),
  isRestored: z.boolean().optional(),
  conditionSummary: z.string().nullable().optional(),
});

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
  const parsed = ConditionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { conditionGrade, isRestored, conditionSummary } = parsed.data;

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

  const { error: updateError } = await supabase
    .from('items')
    .update({
      condition_grade: conditionGrade ?? null,
      is_restored: isRestored ?? false,
      condition_summary: conditionSummary ?? null,
    })
    .eq('id', itemId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
