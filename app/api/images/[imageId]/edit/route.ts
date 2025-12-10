import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for image processing
export const runtime = 'nodejs'; // Force Node.js runtime

// Google Vertex AI Imagen pricing: ~$0.02 per image
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
    model: 'imagen-4.0-fast-generate',
    prompt_tokens: null,
    completion_tokens: null,
    total_cost_usd: IMAGEN_COST_PER_IMAGE,
  } as any);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  // Check for Google Cloud service account credentials
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'Google Cloud service account credentials not configured on server.' },
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
    console.log(`Processing image with Google Vertex AI (Imagen 4.0): ${originalImageUrl}`);

    // Fetch the original image as base64
    console.log('Fetching original image...');
    const imageResponse = await fetch(originalImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch original image: ${imageResponse.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    console.log(`Original image fetched: ${base64Image.length} bytes (base64)`);

    // Build a simple foreground mask so Imagen only edits the background.
    // This uses a quick grayscale + median filter + threshold; not perfect, but guides the model.
    let maskBase64: string | null = null;
    try {
      const maskBuffer = await sharp(imageBuffer)
        .greyscale()
        .median(3)
        .threshold(180) // tweak threshold if needed for darker backgrounds
        .png()
        .toBuffer();
      maskBase64 = maskBuffer.toString('base64');
      console.log(`Mask generated: ${maskBuffer.byteLength} bytes`);
    } catch (maskErr) {
      console.warn('Mask generation failed, proceeding without mask hint', maskErr);
    }

    // Initialize Vertex AI client with service account credentials
    const client = new PredictionServiceClient({
      apiEndpoint: 'us-central1-aiplatform.googleapis.com',
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'curated-chic-platform';
    const location = 'us-central1';
    const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration@006`;

    // Edit prompt for professional product photography; explicitly preserve the product
    const editPrompt =
      'Professional product photo on pure white studio background with soft shadow. Keep the product identical (shape, color, texture), only remove/replace the background.';

    console.log('Calling Google Vertex AI Imagen for image editing...');

    // Construct the prediction request with correct Imagen edit API format
    const instanceValue = helpers.toValue({
      prompt: editPrompt,
      // Pass raw bytes for the source image; Vertex will handle background masking.
      image: {
        bytesBase64Encoded: base64Image,
        mimeType,
      },
      ...(maskBase64
        ? {
            mask: {
              image: {
                bytesBase64Encoded: maskBase64,
                mimeType: 'image/png',
              },
            },
          }
        : {}),
    });

    const instances = [instanceValue];
    const parameter = helpers.toValue({
      editMode: 'EDIT_MODE_INPAINT',
      maskMode: 'MASK_MODE_BACKGROUND',
      sampleCount: 1,
      addWatermark: false,
      outputMimeType: 'image/png',
    });

    const request = {
      endpoint,
      instances: instances as any,
      parameters: parameter as any,
    };

    const response = await client.predict(request);
    console.log('Received response from Vertex AI');

    const predictions = response[0].predictions;
    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions returned from Vertex AI');
    }

    // Extract the edited image from response
    const prediction = predictions[0] as any;
    const editedBase64 = prediction?.bytesBase64Encoded || prediction?.structValue?.fields?.bytesBase64Encoded?.stringValue;

    if (!editedBase64 || typeof editedBase64 !== 'string') {
      console.error('Prediction response structure:', JSON.stringify(prediction, null, 2));
      throw new Error('No image data in prediction response');
    }

    const editedBuffer = Buffer.from(editedBase64, 'base64');
    console.log(`Received edited image: ${editedBuffer.byteLength} bytes`);

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
