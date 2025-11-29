import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createSupabaseServerClient(): SupabaseClient<Database> {
  return createServerComponentClient<Database>({ cookies });
}
