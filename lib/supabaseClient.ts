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
        cookieStore?.set?.(name, value, { path: '/', ...options });
      },
      remove(name: string, options?: any) {
        cookieStore?.set?.(name, '', {
          path: '/',
          expires: new Date(0),
          ...options,
        });
      },
    },
  });
}

