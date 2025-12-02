import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

// GET existing listing copy
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify user owns this item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Fetch listing copy
    const { data, error } = await (supabase as any)
      .from('listing_copy')
      .select('*')
      .eq('item_id', id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching listing copy:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch (error) {
    console.error('Error in GET /api/items/[id]/listing-copy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST/Update listing copy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify user owns this item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if listing copy already exists
    const { data: existingCopy } = await (supabase as any)
      .from('listing_copy')
      .select('id')
      .eq('item_id', id)
      .maybeSingle();

    const listingCopyData = {
      item_id: id,
      ebay_title: body.ebayTitle || null,
      ebay_description: body.ebayDescription || null,
      facebook_title: body.facebookTitle || null,
      facebook_description: body.facebookDescription || null,
      etsy_title: body.etsyTitle || null,
      etsy_description: body.etsyDescription || null,
    };

    if (existingCopy) {
      // Update existing copy
      const { data, error } = await (supabase as any)
        .from('listing_copy')
        .update(listingCopyData)
        .eq('item_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating listing copy:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    } else {
      // Insert new copy
      const { data, error } = await (supabase as any)
        .from('listing_copy')
        .insert(listingCopyData)
        .select()
        .single();

      if (error) {
        console.error('Error creating listing copy:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error('Error in POST /api/items/[id]/listing-copy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
