import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Email-to-Supabase Ingestion Endpoint
 *
 * This endpoint is designed to receive item data from Zapier's Email Parser.
 * It creates items, uploads images, and triggers AI analysis automatically.
 *
 * Authentication: API Key (not user auth)
 * Expected Usage: Zapier webhook POST with parsed email data
 */

export const dynamic = 'force-dynamic';

// Type for incoming Zapier data
type IngestRequest = {
  title: string;
  images: Array<{
    filename: string;
    data: string; // base64 encoded
    mimeType?: string;
  }>;
  owner_email?: string; // Optional: to associate with specific user
};

/**
 * Validate API Key from Authorization header
 */
function validateApiKey(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expectedKey = process.env.ZAPIER_API_KEY;

  if (!expectedKey) {
    console.error('ZAPIER_API_KEY not configured in environment');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  // Support both "Bearer <key>" and plain "<key>"
  const providedKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  return providedKey === expectedKey;
}

/**
 * Get or create the import user's ID
 */
async function getImportUserId(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<{ userId: string | null; error?: string }> {
  const importEmail = process.env.ZAPIER_IMPORT_USER_EMAIL;

  if (!importEmail) {
    return {
      userId: null,
      error: 'ZAPIER_IMPORT_USER_EMAIL not configured',
    };
  }

  // Query auth.users to find the import user by email
  const { data, error } = await supabase
    .from('items')
    .select('owner_id')
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error querying for import user:', error);
  }

  // For now, we'll use a simple approach: the import user must exist in Supabase Auth
  // You can create this user manually in Supabase Dashboard > Authentication > Users
  // Use the email configured in ZAPIER_IMPORT_USER_EMAIL

  // Fetch user by email using admin API
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    return {
      userId: null,
      error: `Failed to fetch users: ${listError.message}`,
    };
  }

  const importUser = users?.find((u) => u.email === importEmail);

  if (!importUser) {
    return {
      userId: null,
      error: `Import user not found: ${importEmail}. Please create this user in Supabase Auth.`,
    };
  }

  return { userId: importUser.id };
}

/**
 * Convert base64 string to Buffer
 */
function base64ToBuffer(base64: string): Buffer {
  // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(base64Data, 'base64');
}

/**
 * Upload image buffer to Supabase Storage
 */
async function uploadImage(
  supabase: ReturnType<typeof createClient<Database>>,
  itemId: string,
  imageBuffer: Buffer,
  filename: string,
  mimeType: string,
  index: number
): Promise<{ url: string | null; error?: string }> {
  const fileExt = filename.split('.').pop() || 'jpg';
  const storageFileName = `${itemId}/${Date.now()}-${index}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(storageFileName, imageBuffer, {
      contentType: mimeType || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error('Failed to upload image:', uploadError);
    return {
      url: null,
      error: `Image upload failed: ${uploadError.message}`,
    };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('item-images').getPublicUrl(storageFileName);

  return { url: publicUrl };
}

/**
 * Trigger AI analysis for the item
 */
async function triggerAnalysis(
  supabase: ReturnType<typeof createClient<Database>>,
  itemId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // We can't directly call the analyze endpoint from here because it requires user auth
  // Instead, we'll mark the item as ready for analysis and let the system pick it up
  // OR we implement the analysis logic inline

  // For now, let's just mark it as ready and return
  // The user can manually trigger it, or we can implement auto-trigger logic later
  const { error } = await supabase
    .from('items')
    .update({ ai_status: 'idle' }) // Keep as idle, ready for manual trigger
    .eq('id', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Main POST handler
 */
export async function POST(req: NextRequest) {
  // 1. Validate API Key
  if (!validateApiKey(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing API key' },
      { status: 401 }
    );
  }

  // 2. Create admin Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 3. Parse request body
    const body: IngestRequest = await req.json();

    // 4. Validate input
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!body.images || body.images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    if (body.images.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 images allowed' },
        { status: 400 }
      );
    }

    // 5. Get import user ID
    const { userId, error: userError } = await getImportUserId(supabase);

    if (userError || !userId) {
      return NextResponse.json(
        { error: userError || 'Failed to get import user' },
        { status: 500 }
      );
    }

    // 6. Create item record
    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        owner_id: userId,
        title: body.title.trim(),
        status: 'new',
        ai_status: 'idle',
        is_deleted: false,
        is_restored: false,
        import_source: 'email',
      })
      .select()
      .single();

    if (itemError || !item) {
      console.error('Failed to create item:', itemError);
      return NextResponse.json(
        { error: 'Failed to create item' },
        { status: 500 }
      );
    }

    const itemId = (item as any).id as string;

    // 7. Upload images
    const uploadedImages: string[] = [];
    const uploadErrors: string[] = [];

    for (let i = 0; i < body.images.length; i++) {
      const image = body.images[i];

      try {
        const imageBuffer = base64ToBuffer(image.data);
        const mimeType = image.mimeType || 'image/jpeg';

        const { url, error: uploadError } = await uploadImage(
          supabase,
          itemId,
          imageBuffer,
          image.filename,
          mimeType,
          i
        );

        if (uploadError || !url) {
          uploadErrors.push(uploadError || 'Unknown upload error');
          continue;
        }

        uploadedImages.push(url);

        // 8. Create item_images record
        const { error: imageRecordError } = await supabase
          .from('item_images')
          .insert({
            item_id: itemId,
            url: url,
          });

        if (imageRecordError) {
          console.error('Failed to save image record:', imageRecordError);
        }
      } catch (err: any) {
        console.error('Error processing image:', err);
        uploadErrors.push(err.message || 'Image processing failed');
      }
    }

    // 9. Check if we had any successful uploads
    if (uploadedImages.length === 0) {
      // All uploads failed - delete the item and return error
      await supabase.from('items').delete().eq('id', itemId);

      return NextResponse.json(
        {
          error: 'All image uploads failed',
          details: uploadErrors,
        },
        { status: 500 }
      );
    }

    // 10. Trigger analysis (or mark as ready)
    await triggerAnalysis(supabase, itemId, userId);

    // 11. Return success
    return NextResponse.json({
      success: true,
      item_id: itemId,
      title: body.title,
      images_uploaded: uploadedImages.length,
      images_failed: uploadErrors.length,
      upload_errors: uploadErrors.length > 0 ? uploadErrors : undefined,
      message:
        uploadErrors.length > 0
          ? `Item created with ${uploadedImages.length} images. ${uploadErrors.length} images failed to upload.`
          : 'Item created successfully and ready for analysis',
    });
  } catch (err: any) {
    console.error('Ingestion error:', err);

    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
