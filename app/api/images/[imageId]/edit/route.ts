import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { VertexAI } from '@google-cloud/vertexai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for image processing

// Imagen pricing: $0.02 per image for edit operations
const IMAGEN_COST_PER_EDIT = 0.02;

type Usage = {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_cost_usd: number | null;
};

async function logUsage(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  imageId: string,
  cost: number
) {
  await supabase.from('ai_usage').insert({
    user_id: userId,
    item_id: null,
    listing_id: null,
    endpoint: 'image_edit',
    model: 'imagen-3.0-generate-001',
    prompt_tokens: null,
    completion_tokens: null,
    total_cost_usd: cost,
  } as any);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    return NextResponse.json(
      { error: 'GOOGLE_CLOUD_PROJECT not configured on server.' },
      { status: 500 }
    );
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return NextResponse.json(
      { error: 'GOOGLE_APPLICATION_CREDENTIALS_JSON not configured on server.' },
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
    // Download the original image
    console.log(`Downloading image from: ${originalImageUrl}`);
    const imageResponse = await fetch(originalImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.log(`Downloaded ${imageBuffer.byteLength} bytes, mime type: ${mimeType}`);

    // Parse Google credentials from JSON string
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    // Initialize Vertex AI with credentials
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: 'us-central1',
      googleAuthOptions: {
        credentials: credentials,
      },
    });

    // Get the Imagen model
    const generativeModel = vertexAI.getGenerativeModel({
      model: 'imagen-3.0-generate-001',
    });

    // Prepare the image part for Imagen
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageBuffer).toString('base64'),
        mimeType: mimeType,
      },
    };

    console.log(`Sending edit request to Imagen with prompt: ${prompt}`);

    // Generate edited image using Imagen
    const result = await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            imagePart,
            { text: prompt }
          ],
        },
      ],
    });

    const response = result.response;

    // Check if response contains an image
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates returned from Imagen');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error('No content parts in Imagen response');
    }

    // Find the inline data (image) in the response
    let editedImageData: string | null = null;
    let editedMimeType = 'image/png';

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        editedImageData = part.inlineData.data;
        editedMimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!editedImageData) {
      throw new Error('No image data returned from Imagen');
    }

    console.log(`Received edited image from Imagen, mime type: ${editedMimeType}`);

    // Convert base64 to buffer
    const editedBuffer = Buffer.from(editedImageData, 'base64');

    // Generate a unique filename for the edited image
    const timestamp = Date.now();
    const extension = editedMimeType.split('/')[1] || 'png';
    const editedFilename = `edited_${timestamp}.${extension}`;
    const storagePath = `${user.id}/${image.item_id}/${editedFilename}`;

    // Upload edited image to Supabase Storage
    console.log(`Uploading edited image to: ${storagePath}`);
    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(storagePath, editedBuffer, {
        contentType: editedMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload edited image: ${uploadError.message}`);
    }

    // Get public URL for the edited image
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(storagePath);

    const editedUrl = urlData.publicUrl;
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
      await logUsage(supabase, user.id, imageId, IMAGEN_COST_PER_EDIT);
    } catch (logErr) {
      console.error('Failed to log AI usage', logErr);
    }

    return NextResponse.json({
      success: true,
      edited_url: editedUrl,
      original_url: originalImageUrl,
      prompt: prompt,
      usage: {
        prompt_tokens: null,
        completion_tokens: null,
        total_cost_usd: IMAGEN_COST_PER_EDIT,
      },
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
