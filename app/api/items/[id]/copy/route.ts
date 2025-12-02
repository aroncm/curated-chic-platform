import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build',
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
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  itemId: string,
  usage: Usage
) {
  if (usage.prompt_tokens == null && usage.completion_tokens == null) return;
  await supabase.from('ai_usage').insert({
    user_id: userId,
    item_id: itemId,
    listing_id: null,
    endpoint: 'item_copy',
    model: 'gpt-4o',
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_cost_usd: usage.total_cost_usd,
  } as any);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured on server.' },
      { status: 500 }
    );
  }

  const supabase = createSupabaseServerClient() as any;

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: itemId } = await params;

  // Fetch item + images + purchase info (NO listing required)
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select(
      `
      id,
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
    `
    )
    .eq('id', itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (item.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const images = (item.item_images as any[]) ?? [];
  const primaryImageUrl: string | null = images[0]?.url ?? null;

  const purchase = (item.purchases as any[])?.[0];
  const costBasis =
    purchase?.purchase_price != null
      ? Number(purchase.purchase_price) +
        (purchase.additional_costs ? Number(purchase.additional_costs) : 0)
      : null;

  // Build item context
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
`.trim();

  const systemPrompt = `
You are an expert listing copywriter for vintage and collectible home decor, glassware, barware, and luxury design objects.

SELLER CONTEXT:
The seller is an experienced and tasteful interior designer with deep knowledge of vintage decorative arts, design history, and styling. Your copy should reflect her expertise, refined taste, and authoritative voice when describing items.

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
     - Tone: Professional, authoritative, and knowledgeable. Speak with confidence about design details.
     - Focus: searchability & collector keywords. Draw on patterns from top-performing eBay listings in vintage decor.
   - Facebook Marketplace:
     - Title: clear and friendly, good for local buyers ("Vintage smoked glass decanter – excellent condition").
     - Description: casual and conversational, like talking to a friend. Use shorter sentences and a warm, approachable tone. Highlight pickup/shipping flexibility, condition, and how it fits into a home.
     - Tone: Informal and friendly, less formal than eBay/Etsy. Think "chatty neighbor" not "design expert."
     - Focus: convincing a busy local buyer quickly with relatable, everyday language.
   - Etsy:
     - Title: descriptive, aesthetic, and SEO-aware, emphasizing style, era, and ambiance.
     - Description: 1–2 short paragraphs of "story" + bullet points (dimensions, condition details, materials, shipping).
     - Tone: Curated and sophisticated, emphasizing aesthetic and styling potential.
     - Focus: mood, styling, gift potential, and artisanal appeal. Apply best practices from high-performing vintage Etsy shops.

3. CRITICAL WRITING RULES:
   - NEVER use tentative or uncertain language like "likely", "possibly", "maybe", "appears to be", "in the style of", "circa", etc.
   - Only state what you can definitively confirm from the provided information. Omit details you cannot verify.
   - Never mention cost basis, purchase price, or internal margin.
   - Never fabricate maker/brand or exact era if uncertain. If unsure, simply don't mention it rather than hedging.
   - Emphasize defects honestly but concisely.
   - Use dimensions only if provided. Mark as "approximately" ONLY if explicitly stated as approximate in the data.
   - Write with authority and expertise, as befits an experienced interior designer's knowledge.

4. Apply patterns from top-performing listings:
   - Use the language, keywords, and formatting patterns that drive the most engagement on each platform.
   - For eBay: emphasize maker, era, and collector appeal when known.
   - For Facebook: lead with visual appeal and how the piece fits into modern homes.
   - For Etsy: storytelling about ambiance, gifting, and unique character.

5. Assume the price is in USD. You do NOT need to include the exact price in the text unless it helps, and only if provided in the context.

Return ONLY JSON in this schema: no explanations, no extra text.
`.trim();

  try {
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: primaryImageUrl
          ? [
              { type: 'text', text: itemContext },
              { type: 'image_url', image_url: { url: primaryImageUrl } },
            ]
          : itemContext,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
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

    const usage = calculateUsageCost(response.usage);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }
    const parsed = JSON.parse(content);

    // Best-effort usage logging
    try {
      await logUsage(supabase, user.id, itemId, usage);
    } catch (logErr) {
      console.error('Failed to log AI usage', logErr);
    }

    return NextResponse.json({ copy: parsed, usage });
  } catch (e: any) {
    console.error('Item copy generation failed', e);
    return NextResponse.json(
      {
        error: 'Failed to generate listing copy',
        details: e.message,
      },
      { status: 500 }
    );
  }
}
