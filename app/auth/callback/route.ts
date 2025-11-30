import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const redirectTo = new URL('/items', req.url);
  const res = NextResponse.redirect(redirectTo);

  if (!code) return res;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          res.cookies.set({
            name,
            value,
            path: '/',
            ...options,
          });
        },
        remove(name: string, options?: any) {
          res.cookies.set({
            name,
            value: '',
            path: '/',
            expires: new Date(0),
            ...options,
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  return res;
}


