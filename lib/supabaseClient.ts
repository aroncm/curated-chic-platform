import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createSupabaseServerClient(): SupabaseClient<Database> {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        try {
          cookieStore.set(name, value, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
            ...options,
          });
        } catch (error) {
          // Cookies can only be set in Server Actions or Route Handlers
          // Ignore errors in other contexts
        }
      },
      remove(name: string, options?: any) {
        try {
          cookieStore.set(name, '', {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            expires: new Date(0),
            ...options,
          });
        } catch (error) {
          // Cookies can only be removed in Server Actions or Route Handlers
          // Ignore errors in other contexts
        }
      },
    },
  });
}

