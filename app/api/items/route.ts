import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

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
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    // Create the item with a temporary title - AI will set the real title
    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        owner_id: user.id,
        title: 'Analyzing...', // Temporary title until AI identifies it
        status: 'new',
        ai_status: 'idle',
        is_deleted: false,
        is_restored: false,
      })
      .select()
      .single();

    if (itemError || !item) {
      console.error('Failed to create item:', itemError);
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }

    const itemId = (item as any).id as string;
    const itemTitle = (item as any).title as string;

    // Upload images to Supabase Storage
    const imageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}/${Date.now()}-${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Failed to upload image:', uploadError);
        // Clean up: delete the item if image upload fails
        await supabase.from('items').delete().eq('id', itemId);
        return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(fileName);

      imageUrls.push(publicUrl);

      // Save image URL to database
      const { error: imageError } = await supabase
        .from('item_images')
        .insert({
          item_id: itemId,
          url: publicUrl,
        });

      if (imageError) {
        console.error('Failed to save image record:', imageError);
      }
    }

    return NextResponse.json({
      success: true,
      item: {
        id: itemId,
        title: itemTitle,
        imageCount: imageUrls.length,
      },
    });
  } catch (e: any) {
    console.error('Create item error:', e);
    return NextResponse.json(
      { error: 'Failed to create item', details: e.message },
      { status: 500 }
    );
  }
}
