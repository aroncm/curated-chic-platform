import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error_description = requestUrl.searchParams.get('error_description');

  if (error_description) {
    console.error('Auth callback error:', error_description);
    return NextResponse.redirect(new URL('/auth?error=' + encodeURIComponent(error_description), requestUrl.origin));
  }

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/auth?error=auth_failed', requestUrl.origin));
    }

    // Redirect to items page after successful authentication
    return NextResponse.redirect(new URL('/items', requestUrl.origin));
  }

  // No code provided - this might be a hash-based redirect, let client handle it
  // Redirect to a client page that can process hash fragments
  return NextResponse.redirect(new URL('/auth/confirm', requestUrl.origin));
}
