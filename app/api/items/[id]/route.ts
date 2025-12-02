import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

export async function PATCH(
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
    const body = await request.json();
    const { id } = await params;

    // Build update object with only provided fields
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.condition_summary !== undefined) updateData.condition_summary = body.condition_summary;

    // Update the item
    const { data, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update related data if provided
    if (body.cost !== undefined) {
      const costValue = Number(body.cost);
      if (!isNaN(costValue) && costValue > 0) {
        // Check if purchase record exists
        const { data: existingPurchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('item_id', id)
          .maybeSingle();

        if (existingPurchase) {
          // Update existing purchase
          const { error: purchaseError } = await supabase
            .from('purchases')
            .update({
              purchase_price: costValue,
              additional_costs: 0,
            })
            .eq('item_id', id);

          if (purchaseError) {
            console.error('Error updating purchase:', purchaseError);
            return NextResponse.json({ error: 'Failed to update cost' }, { status: 500 });
          }
        } else {
          // Insert new purchase
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert({
              item_id: id,
              purchase_price: costValue,
              additional_costs: 0,
            });

          if (purchaseError) {
            console.error('Error creating purchase:', purchaseError);
            return NextResponse.json({ error: 'Failed to save cost' }, { status: 500 });
          }
        }
      }
    }

    if (body.listing_price !== undefined || body.date_listed !== undefined) {
      const listingData: any = { item_id: id };

      if (body.listing_price !== undefined) {
        const listingValue = Number(body.listing_price);
        if (!isNaN(listingValue) && listingValue > 0) {
          listingData.listing_price = listingValue;
        }
      }

      if (body.date_listed !== undefined) {
        listingData.date_listed = body.date_listed || null;
      }

      if (Object.keys(listingData).length > 1) {
        // Check if listing record exists
        const { data: existingListing } = await supabase
          .from('listings')
          .select('id')
          .eq('item_id', id)
          .maybeSingle();

        if (existingListing) {
          // Update existing listing
          const { error: listingError } = await supabase
            .from('listings')
            .update(listingData)
            .eq('item_id', id);

          if (listingError) {
            console.error('Error updating listing:', listingError);
            return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
          }
        } else {
          // Insert new listing
          const { error: listingError } = await supabase
            .from('listings')
            .insert(listingData);

          if (listingError) {
            console.error('Error creating listing:', listingError);
            return NextResponse.json({ error: 'Failed to save listing' }, { status: 500 });
          }
        }
      }
    }

    if (body.sales_price !== undefined || body.date_sold !== undefined) {
      const salesData: any = { item_id: id };

      if (body.sales_price !== undefined) {
        const salesValue = Number(body.sales_price);
        if (!isNaN(salesValue) && salesValue > 0) {
          salesData.sale_price = salesValue;
        }
      }

      if (body.date_sold !== undefined) {
        salesData.sale_date = body.date_sold || null;
      }

      if (Object.keys(salesData).length > 1) {
        // Check if sale record exists
        const { data: existingSale } = await supabase
          .from('sales')
          .select('id')
          .eq('item_id', id)
          .maybeSingle();

        if (existingSale) {
          // Update existing sale
          const { error: saleError } = await supabase
            .from('sales')
            .update(salesData)
            .eq('item_id', id);

          if (saleError) {
            console.error('Error updating sale:', saleError);
            return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
          }
        } else {
          // Insert new sale
          const { error: saleError } = await supabase
            .from('sales')
            .insert(salesData);

          if (saleError) {
            console.error('Error creating sale:', saleError);
            return NextResponse.json({ error: 'Failed to save sale' }, { status: 500 });
          }
        }
      }
    }

    if (body.platform !== undefined && body.platform) {
      // Find or create platform
      let platformId = null;
      const { data: platformData, error: platformFetchError } = await supabase
        .from('listing_platforms')
        .select('id')
        .eq('name', body.platform)
        .single();

      if (platformFetchError && platformFetchError.code !== 'PGRST116') {
        console.error('Error fetching platform:', platformFetchError);
      } else if (platformData) {
        platformId = platformData.id;
      } else {
        // Create new platform
        const slug = body.platform.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const { data: newPlatform, error: platformInsertError } = await supabase
          .from('listing_platforms')
          .insert({ name: body.platform, slug })
          .select('id')
          .single();

        if (platformInsertError) {
          console.error('Error creating platform:', platformInsertError);
        } else {
          platformId = newPlatform.id;
        }
      }

      if (platformId) {
        // Update listing with platform
        await supabase
          .from('listings')
          .update({ platform_id: platformId })
          .eq('item_id', id);
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PATCH /api/items/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Soft delete: set is_deleted to true
    const { error } = await supabase
      .from('items')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error deleting item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/items/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
