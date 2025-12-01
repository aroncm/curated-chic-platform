import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
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
    endpoint: 'analyze',
    model: 'gpt-4o',
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_cost_usd: usage.total_cost_usd,
  } as any);
}

export async function POST(
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

  // Fetch item + images + purchase info
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select(
      `
      id,
      owner_id,
      title,
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

  const images = (item as any).item_images || [];
  if (images.length === 0) {
    return NextResponse.json(
      { error: 'Item has no images to analyze.' },
      { status: 400 }
    );
  }

  const primaryImageUrl: string = images[0].url;
  const purchase = (item as any).purchases?.[0];
  const costBasis =
    purchase?.purchase_price != null
      ? Number(purchase.purchase_price) +
        (purchase.additional_costs ? Number(purchase.additional_costs) : 0)
      : null;

  // Mark AI as pending
  await supabase
    .from('items')
    .update({ ai_status: 'pending', ai_error: null })
    .eq('id', itemId);

  // Rich analysis prompt with debug_notes
  const systemPrompt = `
You are an expert appraiser and cataloger of vintage and collectible home decor,
with deep experience in glassware, barware, crystal, ceramics, and luxury design objects.

You will receive:
- One primary photo of the item.
- No additional context (assume typical US resale context).

Your job is to:

1. IDENTIFY THE OBJECT
   - Describe what the item is in clear, buyer-facing language.
   - If possible, infer: object type, maker/brand, style or design era, primary material, and color.
   - If maker/brand or era is uncertain, use hedged language like:
     "likely", "in the style of", "circa", "appears to be", etc.
   - Do NOT invent a specific brand or designer if there is no strong visual evidence (logo, hallmark, iconic design).
   - Look for specific identifying features: hallmarks, signatures, design patterns, construction methods.

2. ESTIMATE DIMENSIONS
   - Provide approximate dimensions based on the photo and typical proportions for similar objects.
   - Label clearly as approximate, e.g. "approx. 9 in tall, 3 in wide".

3. ASSESS CONDITION
   - Look for chips, cracks, scratches, cloudiness, label wear, discoloration, repairs, etc.
   - Summarize in a short, listing-ready condition blurb suitable for eBay/Etsy/Facebook.
   - Always include both positives and any flaws, even if minor.
   - Be specific: "minor scratching to base" vs. "some wear"

4. PRICING FOR US ONLINE RESALE
   - Assume resale on US online marketplaces (eBay, Etsy, Chairish, Facebook Marketplace, etc.), not retail MSRP.
   - Estimate a realistic LOW and HIGH resale price range in USD for a single item in the condition shown.
     - LOW price = fair, "move it quickly" price that should sell reasonably fast.
     - HIGH price = optimistic but still realistic asking price for a patient seller.
   - Take into account: desirability, maker, style, era, material, and condition.
   - Avoid extreme prices unless the piece clearly appears rare or high-end.

5. SUGGESTED LIST PRICE
   - Suggest ONE practical list price in USD that balances speed vs. profit
     for a typical non-professional seller.
   - This should usually be between the low and high estimate, closer to the middle.

6. DETAILED REASONING (IMPORTANT - USER WILL SEE THIS)
   - Provide a comprehensive explanation of your identification and pricing decisions.
   - Structure your reasoning as follows:

   **Identification Rationale:**
   - What specific visual cues led you to this identification?
   - What design elements, construction methods, or hallmarks did you observe?
   - Why did you assign this particular era/style?
   - If uncertain, explain what evidence is missing.

   **Price Justification:**
   - What comparable items did you consider?
   - What recent sale prices or listings informed your estimate?
   - How did condition affect the valuation?
   - What market factors influenced your suggestion?
   - Why is this a good price for a non-professional seller?

   Example reasoning:
   "This appears to be a mid-century Scandinavian art glass decanter based on the organic form,
   smoky grey color, and controlled bubble inclusions typical of 1960s Nordic glasswork. However,
   without a visible maker's mark, I cannot attribute it to a specific manufacturer like Holmegaard
   or Riihimäki.

   Similar unmarked Scandinavian decanters in comparable condition typically sell for $80-150 on
   eBay and Etsy. The visible wear on the glass stopper (minor scratching, no chips) and light
   cloudiness inside the neck reduce value from mint condition pieces ($180-250).

   I suggest $95 as a balanced list price because it's below typical retail ($120-140) but above
   quick-sale prices, giving you room to negotiate while attracting serious vintage glassware collectors."

OUTPUT FORMAT (IMPORTANT):
- You MUST return ONLY valid JSON matching this schema:

{
  "category": string,             // e.g. "Vintage cut crystal decanter"
  "brand_or_maker": string,      // e.g. "Likely Bohemian" or "Unknown"
  "style_or_era": string,        // e.g. "Mid-century modern", "Art Deco", "Contemporary"
  "material": string,            // e.g. "Lead crystal", "Pressed glass"
  "color": string,               // e.g. "Clear", "Smoky grey", "Amber"
  "dimensions_guess": string,    // e.g. "Approx. 9 in tall, 3 in wide"
  "condition_summary": string,   // short, listing-ready condition text
  "estimated_low_price": number,
  "estimated_high_price": number,
  "suggested_list_price": number,
  "reasoning": string            // DETAILED explanation (3-5 paragraphs, see format above)
}

Rules:
- All prices must be numbers (no currency symbols) and in USD.
- Never mention your own uncertainty about prices in the numeric fields;
  reflect uncertainty in the text fields using words like "approx.", "likely", etc.
- The "reasoning" field should be 3-5 paragraphs, detailed enough for a user to understand
  exactly how you arrived at your conclusions.
- Do NOT include any extra fields or any text outside the JSON.
`.trim();

  try {
    // Use Chat Completions API with proper system/user message separation
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this vintage/collectible item and provide a detailed identification and valuation.',
            },
            {
              type: 'image_url',
              image_url: {
                url: primaryImageUrl,
                detail: 'high', // Request high-detail image analysis
              },
            },
          ],
        },
      ],
      temperature: 0.7, // Balance between creativity and consistency
      max_tokens: 2000, // Ensure enough tokens for detailed analysis
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'valuation',
          schema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              brand_or_maker: { type: 'string' },
              style_or_era: { type: 'string' },
              material: { type: 'string' },
              color: { type: 'string' },
              dimensions_guess: { type: 'string' },
              condition_summary: { type: 'string' },
              estimated_low_price: { type: 'number' },
              estimated_high_price: { type: 'number' },
              suggested_list_price: { type: 'number' },
              reasoning: { type: 'string' },
            },
            required: [
              'category',
              'brand_or_maker',
              'style_or_era',
              'material',
              'color',
              'dimensions_guess',
              'condition_summary',
              'estimated_low_price',
              'estimated_high_price',
              'suggested_list_price',
              'reasoning',
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const usage = calculateUsageCost(response.usage);

    // Parse JSON response from chat completion
    const outputText = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(outputText);

    // Log reasoning for debugging
    if (parsed.reasoning) {
      console.log(`AI reasoning for item ${itemId}:`, parsed.reasoning);
    }

    // Fetch current status to advance from "new" -> "identified"
    const { data: currentItem } = await supabase
      .from('items')
      .select('status')
      .eq('id', itemId)
      .maybeSingle();

    const newStatus =
      currentItem?.status === 'new' ? 'identified' : currentItem?.status;

    const { error: updateError } = await supabase
      .from('items')
      .update({
        status: newStatus,
        // PRESERVE user's title - don't overwrite with AI category
        category: parsed.category,
        brand_or_maker: parsed.brand_or_maker,
        style_or_era: parsed.style_or_era,
        material: parsed.material,
        color: parsed.color,
        dimensions_guess: parsed.dimensions_guess,
        condition_summary: parsed.condition_summary,
        estimated_low_price: parsed.estimated_low_price,
        estimated_high_price: parsed.estimated_high_price,
        suggested_list_price: parsed.suggested_list_price,
        reasoning: parsed.reasoning, // Store detailed reasoning in database
        ai_status: 'complete',
        ai_error: null,
      })
      .eq('id', itemId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Best-effort usage logging
    try {
      await logUsage(supabase, user.id, itemId, usage);
    } catch (logErr) {
      console.error('Failed to log AI usage', logErr);
    }

    return NextResponse.json({
      success: true,
      valuation: {
        category: parsed.category,
        brand_or_maker: parsed.brand_or_maker,
        style_or_era: parsed.style_or_era,
        material: parsed.material,
        color: parsed.color,
        dimensions_guess: parsed.dimensions_guess,
        condition_summary: parsed.condition_summary,
        estimated_low_price: parsed.estimated_low_price,
        estimated_high_price: parsed.estimated_high_price,
        suggested_list_price: parsed.suggested_list_price,
        reasoning: parsed.reasoning, // Return reasoning to client
      },
      costBasis,
      status: newStatus,
      usage,
    });
  } catch (e: any) {
    console.error('Item analysis failed', e);

    // Mark AI as errored
    await supabase
      .from('items')
      .update({ ai_status: 'error', ai_error: e.message })
      .eq('id', itemId);

    return NextResponse.json(
      {
        error: 'AI analysis failed',
        details: e.message,
      },
      { status: 500 }
    );
  }
}
