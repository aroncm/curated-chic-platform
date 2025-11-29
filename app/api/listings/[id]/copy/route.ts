import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INPUT_RATE_PER_TOKEN = 5 / 1_000_000; // gpt-4o input $5 / 1M tokens
const OUTPUT_RATE_PER_TOKEN = 15 / 1_000_000; // gpt-4o output $15 / 1M tokens

type Usage = {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_cost_usd: number | null;
};

function calculateUsageCost(rawUsage: any): Usage {
  const prompt_tokens = rawUsage?.prompt_tokens ?? rawUsage?.input_tokens ?? null;
  const completion_tokens = rawUsage?.completion_tokens ?? rawUsage?.output_tokens ?? null;

  if (prompt_tokens == null && completion_tokens == null) {
    return { prompt_tokens: null, completion_tokens: null, total_cost_usd: null };
  }

  const promptCost = prompt_tokens != null ? prompt_tokens * INPUT_RATE_PER_TOKEN : 0;
  const completionCost = completion_tokens != null ? completion_tokens * OUTPUT_RATE_PER_TOKEN : 0;

  return {
    prompt_tokens,
    completion_tokens,
    total_cost_usd: Number((promptCost + completionCost).toFixed(6)),
  };
}

async function logUsage(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  userId: string,
  listingId: string,
  usage: Usage
) {
  if (usage.prompt_tokens == null && usage.completion_tokens == null) return;
  await supabase.from('ai_usage').insert({
    user_id: userId,
    listing_id: listingId,
    item_id: null,
    endpoint: 'listing_copy',
    model: 'gpt-4o',
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_cost_usd: usage.total_cost_usd,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured on server.' },
      { status: 500 }
    );
  }

  const supabase = createSupabaseServerClient();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const listingId = params.id;

  // Fetch listing + related item, platform, images, purchase
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select(
      `
      id,
      item_id,
      listing_price,
      shipping_price,
      listing_url,
      date_listed,
      status,
      listing_platforms (
        name,
        slug,
        default_fee_percent
      ),
      items (
        owner_id,
        title,
        category,
        brand_or_maker,
        style_or_era,
        material,
        color,
        dimensions_guess,
        condition_summary,
        condition_grade,
        is_restored,
        estimated_low_price,
        estimated_high_price,
        suggested_list_price,
        item_images (url),
        purchases (purchase_price, additional_costs, source)
      )
    `
    )
    .eq('id', listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const item = (listing as any).items;
  if (!item) {
    return NextResponse.json(
      { error: 'Listing is not attached to an item' },
      { status: 400 }
    );
  }

  if (item.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const platform = (listing as any).listing_platforms;
  const images = (item.item_images as any[]) ?? [];
  const primaryImageUrl: string | null = images[0]?.url ?? null;

  const purchase = (item.purchases as any[])?.[0];
  const costBasis =
    purchase?.purchase_price != null
      ? Number(purchase.purchase_price) +
        (purchase.additional_costs ? Number(purchase.additional_costs) : 0)
      : null;

  const listPrice = listing.listing_price
    ? Number(listing.listing_price)
    : item.suggested_list_price
    ? Number(item.suggested_list_price)
    : null;

  // Build a rich, structured description of the item for the model
  const itemContext = `
ITEM CONTEXT
- Human title: ${item.title ?? 'Untitled item'}
- AI category: ${item.category ?? 'Unknown'}
- Brand / maker: ${item.brand_or_maker ?? 'Unknown'}
- Style / era: ${item.style_or_era ?? 'Unknown'}
- Material: ${item.material ?? 'Unknown'}
- Color: ${item.color ?? 'Unknown'}
- Approx. dimensions: ${item.dimensions_guess ?? 'Unknown'}
- Condition grade: ${item.condition_grade ?? 'Unknown'}
- Condition summary: ${item.condition_summary ?? 'Not provided'}
- Restored / repaired: ${item.is_restored ? 'Yes' : 'No'}
- Purchase source: ${purchase?.source ?? 'Unknown'}
- Cost basis (do NOT reveal to buyers): ${
    costBasis != null ? `$${costBasis.toFixed(2)}` : 'Unknown'
  }
- Suggested list price (internal): ${
    item.suggested_list_price
      ? `$${Number(item.suggested_list_price).toFixed(2)}`
      : 'Unknown'
  }
- Active listing price: ${
    listPrice != null ? `$${listPrice.toFixed(2)}` : 'Unknown'
  }
- Listing platform (current): ${platform?.name ?? 'Not set'}
`.trim();

  const systemPrompt = `
You are an expert listing copywriter for vintage and collectible home decor, glassware, barware, and luxury design objects.

You will receive:
- a structured summary of the item (condition, style, material, etc.)
- optionally a product image
- internal pricing info (cost basis, suggested price) that must NEVER be shown directly

Your job:
1. Write platform-optimized titles and descriptions for:
   - eBay
   - Facebook Marketplace
   - Etsy

2. Tone and format per platform:
   - eBay:
     - Title: up to ~80 characters, keyword-rich, start with what serious buyers search (maker, type, material, era).
     - Description: short intro sentence + bullet points (features, condition, size, shipping/care info).
     - Focus: searchability & collector keywords while staying honest.
   - Facebook Marketplace:
     - Title: clear and friendly, good for local buyers (“Vintage smoked glass decanter – excellent condition”).
     - Description: conversational, short paragraphs, highlight pickup/shipping flexibility, condition, and how it fits into a home.
     - Focus: convincing a busy local buyer quickly.
   - Etsy:
     - Title: descriptive, aesthetic, and SEO-aware, emphasizing style, era, and ambiance.
     - Description: 1–2 short paragraphs of “story” + bullet points (dimensions, condition details, materials, shipping).
     - Focus: mood, styling, and gift potential while staying accurate.

3. IMPORTANT:
   - Never mention cost basis, purchase price, or internal margin.
   - Never fabricate maker/brand or exact era if uncertain; use phrases like “likely”, “in the style of”, or “circa” when appropriate.
   - Emphasize defects honestly but concisely.
   - Use dimensions only if provided or reasonably inferable (but mark as “approx.” if not exact).

4. Assume the price is in USD. You do NOT need to include the exact price in the text unless it helps, and only if provided in the context.

Return ONLY JSON in this schema: no explanations, no extra text.
`.trim();

  try {
    const inputContent: any[] = [
      {
        type: 'input_text',
        text: `${systemPrompt}\n\n${itemContext}`,
      },
    ];

    if (primaryImageUrl) {
      inputContent.push({
        type: 'input_image',
        image_url: primaryImageUrl,
      });
    }

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: inputContent,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'listing_copy',
          schema: {
            type: 'object',
            properties: {
              ebayTitle: { type: 'string' },
              ebayDescription: { type: 'string' },
              facebookTitle: { type: 'string' },
              facebookDescription: { type: 'string' },
              etsyTitle: { type: 'string' },
              etsyDescription: { type: 'string' },
            },
            required: [
              'ebayTitle',
              'ebayDescription',
              'facebookTitle',
              'facebookDescription',
              'etsyTitle',
              'etsyDescription',
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const usage = calculateUsageCost((response as any).usage);

    const outputText = (response as any).output_text as string;
    const parsed = JSON.parse(outputText);

    // Best-effort usage logging
    try {
      await logUsage(supabase, user.id, listingId, usage);
    } catch (logErr) {
      console.error('Failed to log AI usage', logErr);
    }

    return NextResponse.json({ copy: parsed, usage });
  } catch (e: any) {
    console.error('Listing copy generation failed', e);
    return NextResponse.json(
      {
        error: 'Failed to generate listing copy',
        details: e.message,
      },
      { status: 500 }
    );
  }
}
