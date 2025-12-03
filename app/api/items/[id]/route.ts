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

    // If status changed to 'new' or 'identified' (unlisted), clear listing_price
    if (body.status !== undefined && (body.status === 'new' || body.status === 'identified')) {
      await supabase
        .from('listings')
        .update({ listing_price: null })
        .eq('item_id', id);
    }

    // Update related data if provided
    if (body.cost !== undefined) {
      const costValue = Number(body.cost);
      if (!isNaN(costValue)) {
        if (costValue === 0) {
          // Delete the purchase record when cost is set to 0
          const { error: purchaseError } = await supabase
            .from('purchases')
            .delete()
            .eq('item_id', id);

          if (purchaseError) {
            console.error('Error deleting purchase:', purchaseError);
            return NextResponse.json({ error: 'Failed to clear cost' }, { status: 500 });
          }
        } else if (costValue > 0) {
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
    }

    if (body.listing_price !== undefined || body.date_listed !== undefined) {
      const listingData: any = { item_id: id };

      if (body.listing_price !== undefined) {
        const listingValue = Number(body.listing_price);
        if (!isNaN(listingValue)) {
          // Get current status - if status was just updated, use the new value; otherwise fetch current
          let currentStatus = body.status;
          if (!currentStatus) {
            const { data: itemData } = await supabase
              .from('items')
              .select('status')
              .eq('id', id)
              .single();
            currentStatus = itemData?.status;
          }

          if (listingValue === 0) {
            // Always allow clearing (set to null)
            listingData.listing_price = null;
          } else if (listingValue > 0) {
            // Only allow setting a positive listing_price if status is 'listed'
            if (currentStatus === 'listed') {
              listingData.listing_price = listingValue;
            } else {
              // Silently ignore attempt to set listing_price on unlisted item
              // (don't add it to listingData)
            }
          }
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
          // Only insert if listing_price is > 0 (don't create record for null/0)
          if (listingData.listing_price && listingData.listing_price > 0) {
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
    }

    if (body.sales_price !== undefined || body.date_sold !== undefined) {
      const salesData: any = { item_id: id };

      if (body.sales_price !== undefined) {
        const salesValue = Number(body.sales_price);
        if (!isNaN(salesValue)) {
          if (salesValue === 0) {
            // Set to null to clear the sales price
            salesData.sale_price = null;
          } else if (salesValue > 0) {
            salesData.sale_price = salesValue;
          }
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
          // Only insert if sale_price is > 0 (don't create record for null/0)
          if (salesData.sale_price && salesData.sale_price > 0) {
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin || false;

    // Build delete query - admins can delete any item, regular users only their own
    let query = supabase
      .from('items')
      .update({ is_deleted: true })
      .eq('id', id);

    // Only filter by owner_id if not admin
    if (!isAdmin) {
      query = query.eq('owner_id', user.id);
    }

    const { error } = await query;

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
