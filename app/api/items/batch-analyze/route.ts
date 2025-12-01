import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

const BATCH_SIZE = 3; // Process 3 items at a time to avoid timeouts

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemIds } = await req.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Verify all items belong to user
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('id, owner_id')
      .in('id', itemIds);

    if (fetchError) {
      console.error('Error fetching items:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch items', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items found with provided IDs' },
        { status: 404 }
      );
    }

    // Check ownership
    const unauthorized = items.some((item: any) => item.owner_id !== user.id);
    if (unauthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Process in batches of 3 to avoid timeouts
    const results = [];

    for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
      const batch = itemIds.slice(i, i + BATCH_SIZE);

      // Analyze items in parallel within batch
      const batchResults = await Promise.allSettled(
        batch.map(async (itemId) => {
          // Call the analyze endpoint for each item
          const response = await fetch(
            `${req.nextUrl.origin}/api/items/${itemId}/analyze`,
            {
              method: 'POST',
              headers: {
                cookie: req.headers.get('cookie') || '', // Forward auth cookies
              },
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.details || 'Analysis failed');
          }

          const data = await response.json();
          return { itemId, status: 'success' as const, data };
        })
      );

      // Collect results
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            itemId: batch[idx],
            status: 'error' as const,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
    }

    const totalErrors = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: results.length,
      totalErrors,
    });
  } catch (e: any) {
    console.error('Batch analysis error:', e);
    return NextResponse.json(
      {
        error: 'Batch analysis failed',
        details: e.message,
      },
      { status: 500 }
    );
  }
}
