import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { z } from 'zod';

const ListingSchema = z.object({
  platformId: z.string().uuid().nullable(),
  status: z.enum(['draft', 'live', 'ended']),
  listingUrl: z.string().url().nullable().optional(),
  listingPrice: z.number().nullable().optional(),
  shippingPrice: z.number().nullable().optional(),
  feesEstimate: z.number().nullable().optional(),
  dateListed: z.string().date().nullable().optional().or(z.null()),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const itemId = params.id;
  const json = await req.json();
  const parsed = ListingSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    platformId,
    status,
    listingUrl,
    listingPrice,
    shippingPrice,
    feesEstimate,
    dateListed,
  } = parsed.data;

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, owner_id')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  if (item.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (platformId) {
    const { data: plat, error: platError } = await supabase
      .from('listing_platforms')
      .select('id')
      .eq('id', platformId)
      .maybeSingle();
    if (platError || !plat) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 400 }
      );
    }
  }

  const { data: existingListing, error: listError } = await supabase
    .from('listings')
    .select('id')
    .eq('item_id', itemId)
    .maybeSingle();

  let listingId: string | null = null;

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  if (existingListing) {
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        platform_id: platformId ?? null,
        status,
        listing_url: listingUrl ?? null,
        listing_price: listingPrice ?? null,
        shipping_price: shippingPrice ?? null,
        fees_estimate: feesEstimate ?? null,
        date_listed: dateListed ?? null,
      })
      .eq('id', existingListing.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    listingId = existingListing.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('listings')
      .insert({
        item_id: itemId,
        platform_id: platformId ?? null,
        status,
        listing_url: listingUrl ?? null,
        listing_price: listingPrice ?? null,
        shipping_price: shippingPrice ?? null,
        fees_estimate: feesEstimate ?? null,
        date_listed: dateListed ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    listingId = inserted.id;
  }

  // Update item status if listing is live
  if (status === 'live') {
    const { error: updateItemStatusError } = await supabase
      .from('items')
      .update({ status: 'listed' })
      .eq('id', itemId);

    if (updateItemStatusError) {
      return NextResponse.json({ error: updateItemStatusError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    listingId,
    status,
    platformId,
    dateListed,
  });
}
