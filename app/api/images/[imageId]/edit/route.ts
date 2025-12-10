import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for image processing
export const runtime = 'nodejs'; // Force Node.js runtime

// remove.bg pricing: ~$0.02 per image on paid tier (free tier limited)
const IMAGEN_COST_PER_IMAGE = 0.02;

async function logUsage(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
) {
  await supabase.from('ai_usage').insert({
    user_id: userId,
    item_id: null,
    listing_id: null,
    endpoint: 'image_edit',
    model: 'remove.bg-white-bg',
    prompt_tokens: null,
    completion_tokens: null,
    total_cost_usd: IMAGEN_COST_PER_IMAGE,
  } as any);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  // Check for remove.bg API key
  if (!process.env.REMOVEBG_API_KEY) {
    return NextResponse.json(
      { error: 'Remove.bg API key not configured on server.' },
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

  const { imageId } = await params;
  const body = await req.json();
  const prompt = body.prompt || 'remove background and replace on a clean white background to make it a product image to sell on ebay';

  // Fetch the image record
  const { data: image, error: imageError } = await supabase
    .from('item_images')
    .select('id, url, item_id, items(owner_id)')
    .eq('id', imageId)
    .maybeSingle();

  if (imageError || !image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Check ownership
  if (image.items?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const originalImageUrl = image.url;

  try {
    console.log(`Processing image with remove.bg -> white background: ${originalImageUrl}`);

    // Step 1: remove background using remove.bg
    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
      },
      body: new URLSearchParams({
        image_url: originalImageUrl,
        size: 'auto',
        crop: 'false',
        format: 'png',
      }),
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      throw new Error(`remove.bg failed: ${removeBgResponse.status} ${removeBgResponse.statusText} - ${errorText}`);
    }

    const transparentBuffer = Buffer.from(await removeBgResponse.arrayBuffer());
    console.log(`remove.bg returned ${transparentBuffer.byteLength} bytes`);

    // Step 2: flatten onto a pure white background to avoid transparency artifacts
    const editedBuffer = await sharp(transparentBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    console.log(`Final edited image size: ${editedBuffer.byteLength} bytes`);

    // Generate a unique filename for the edited image
    const timestamp = Date.now();
    const editedFilename = `edited_${timestamp}.png`;
    const storagePath = `${user.id}/${image.item_id}/${editedFilename}`;

    // Upload edited image to Supabase Storage
    console.log(`Uploading edited image to: ${storagePath}`);
    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(storagePath, editedBuffer, {
        contentType: 'image/png',
        cacheControl: '0', // No caching - always fetch fresh
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload edited image: ${uploadError.message}`);
    }

    // Get public URL for the edited image with cache busting
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(storagePath);

    // Add cache-busting parameter to prevent CDN/browser caching
    const editedUrl = `${urlData.publicUrl}?v=${timestamp}`;
    console.log(`Edited image uploaded to: ${editedUrl}`);

    // Update the item_images record with edited image info
    const { error: updateError } = await supabase
      .from('item_images')
      .update({
        edited_url: editedUrl,
        edit_prompt: prompt,
        edited_at: new Date().toISOString(),
      })
      .eq('id', imageId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update image record: ${updateError.message}`);
    }

    // Log usage
    try {
      await logUsage(supabase, user.id);
    } catch (logErr) {
      console.error('Failed to log AI usage', logErr);
    }

    return NextResponse.json({
      success: true,
      edited_url: editedUrl,
      original_url: originalImageUrl,
      prompt: prompt,
    });
  } catch (e: any) {
    console.error('Image editing failed', e?.details || e?.message || e);

    return NextResponse.json(
      {
        error: 'Image editing failed',
        details: e?.details || e?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
