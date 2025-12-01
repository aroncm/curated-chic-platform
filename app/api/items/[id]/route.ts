import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { id } = params;

    // Update the item
    const { data, error } = await supabase
      .from('items')
      .update({
        title: body.title,
        status: body.status,
        category: body.category,
        condition_summary: body.condition_summary,
        updated_at: new Date().toISOString(),
      })
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
        // Update or insert purchase record
        const { error: purchaseError } = await supabase
          .from('purchases')
          .upsert({
            item_id: id,
            purchase_price: costValue,
            additional_costs: 0,
          }, {
            onConflict: 'item_id',
          });

        if (purchaseError) {
          console.error('Error updating purchase:', purchaseError);
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
        // Update or insert listing record
        const { error: listingError } = await supabase
          .from('listings')
          .upsert(listingData, {
            onConflict: 'item_id',
          });

        if (listingError) {
          console.error('Error updating listing:', listingError);
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
        // Update or insert sale record
        const { error: saleError } = await supabase
          .from('sales')
          .upsert(salesData, {
            onConflict: 'item_id',
          });

        if (saleError) {
          console.error('Error updating sale:', saleError);
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
