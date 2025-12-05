import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for image processing
export const runtime = 'nodejs'; // Force Node.js runtime

// Remove.bg pricing: $0.02 per image (50 free images/month)
const REMOVEBG_COST_PER_IMAGE = 0.02;

async function logUsage(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
) {
  await supabase.from('ai_usage').insert({
    user_id: userId,
    item_id: null,
    listing_id: null,
    endpoint: 'image_edit',
    model: 'remove.bg',
    prompt_tokens: null,
    completion_tokens: null,
    total_cost_usd: REMOVEBG_COST_PER_IMAGE,
  } as any);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  if (!process.env.REMOVEBG_API_KEY) {
    return NextResponse.json(
      { error: 'REMOVEBG_API_KEY not configured on server.' },
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
    console.log(`Processing image: ${originalImageUrl}`);

    // Call remove.bg API to get transparent background
    const formData = new FormData();
    formData.append('image_url', originalImageUrl);
    formData.append('size', 'auto');
    formData.append('type', 'product'); // Product type for better detection
    formData.append('format', 'png'); // PNG format
    formData.append('channels', 'rgba'); // RGBA for transparency
    formData.append('crop', 'false'); // Don't crop
    formData.append('semitransparency', 'true'); // Preserve glass/transparency

    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
      },
      body: formData,
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      console.error('Remove.bg error:', errorText);
      console.error('Remove.bg status:', removeBgResponse.status);
      throw new Error(`Remove.bg API failed: ${removeBgResponse.statusText}`);
    }

    // Get the transparent PNG from Remove.bg
    const transparentBuffer = Buffer.from(await removeBgResponse.arrayBuffer());
    console.log(`Received transparent image: ${transparentBuffer.byteLength} bytes`);

    // Process with sharp to add professional studio background and shadow
    const imageMetadata = await sharp(transparentBuffer).metadata();
    const width = imageMetadata.width || 1000;
    const height = imageMetadata.height || 1000;

    console.log('Creating professional studio gradient background');

    // Create a subtle gradient SVG: light gray top (248) to slightly darker bottom (238)
    // Plus a soft shadow at the bottom
    const studioGradientSVG = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="studioGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(248,248,248);stop-opacity:1" />
            <stop offset="70%" style="stop-color:rgb(242,242,242);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(238,238,238);stop-opacity:1" />
          </linearGradient>
          <radialGradient id="bottomShadow" cx="50%" cy="95%" r="40%">
            <stop offset="0%" style="stop-color:rgb(0,0,0);stop-opacity:0.03" />
            <stop offset="50%" style="stop-color:rgb(0,0,0);stop-opacity:0.01" />
            <stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:0" />
          </radialGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#studioGrad)" />
        <ellipse cx="${width/2}" cy="${height * 0.95}" rx="${width * 0.4}" ry="${height * 0.08}" fill="url(#bottomShadow)" />
      </svg>
    `;

    const backgroundBuffer = await sharp(Buffer.from(studioGradientSVG))
      .png()
      .toBuffer();

    console.log(`Studio gradient background created: ${backgroundBuffer.byteLength} bytes`);

    // Composite: gradient background + transparent object
    const editedBuffer = await sharp(backgroundBuffer)
      .composite([
        {
          input: transparentBuffer, // Add the object on top
          blend: 'over',
        },
      ])
      .png()
      .toBuffer();

    console.log(`Created final image with shadow: ${editedBuffer.byteLength} bytes`);

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
    console.error('Image editing failed', e);

    return NextResponse.json(
      {
        error: 'Image editing failed',
        details: e.message,
      },
      { status: 500 }
    );
  }
}
