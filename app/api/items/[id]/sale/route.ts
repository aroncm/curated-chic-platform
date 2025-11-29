import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const SaleSchema = z.object({
  salePrice: z.number().nullable().optional(),
  shippingCost: z.number().nullable().optional(),
  platformFees: z.number().nullable().optional(),
  otherFees: z.number().nullable().optional(),
  saleDate: z.string().nullable().optional(),
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
  const parsed = SaleSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { salePrice, shippingCost, platformFees, otherFees, saleDate } =
    parsed.data;

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

  const { data: existingSale, error: saleError } = await supabase
    .from('sales')
    .select('id')
    .eq('item_id', itemId)
    .maybeSingle();

  if (saleError) {
    return NextResponse.json({ error: saleError.message }, { status: 500 });
  }

  if (existingSale) {
    const { error: updateError } = await supabase
      .from('sales')
      .update({
        sale_price: salePrice ?? null,
        shipping_cost: shippingCost ?? null,
        platform_fees: platformFees ?? null,
        other_fees: otherFees ?? null,
        sale_date: saleDate ?? null,
      })
      .eq('id', existingSale.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabase
      .from('sales')
      .insert({
        item_id: itemId,
        sale_price: salePrice ?? null,
        shipping_cost: shippingCost ?? null,
        platform_fees: platformFees ?? null,
        other_fees: otherFees ?? null,
        sale_date: saleDate ?? null,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { error: updateItemStatusError } = await supabase
    .from('items')
    .update({ status: 'sold' })
    .eq('id', itemId);

  if (updateItemStatusError) {
    return NextResponse.json({ error: updateItemStatusError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
