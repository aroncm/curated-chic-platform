import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createSupabaseServerClient(): SupabaseClient<Database> {
  // Loosen cookies() return shape for newer Next versions
  const cookieStore: any = cookies() as any;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore?.get?.(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        try {
          cookieStore?.set?.(name, value, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
            ...options,
          });
        } catch (error) {
          // Handle cookies() being called in a non-async context
          console.error('Error setting cookie:', error);
        }
      },
      remove(name: string, options?: any) {
        try {
          cookieStore?.set?.(name, '', {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            expires: new Date(0),
            ...options,
          });
        } catch (error) {
          console.error('Error removing cookie:', error);
        }
      },
    },
  });
}

