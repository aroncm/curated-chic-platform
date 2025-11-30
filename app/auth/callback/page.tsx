'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const [message] = useState('Completing sign-in…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const code = url.searchParams.get('code');
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    const finish = () => window.location.replace('/items');

    (async () => {
      try {
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          finish();
          return;
        }
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          finish();
          return;
        }
        throw new Error('No code or tokens found.');
      } catch (e: any) {
         console.error('callback error', e);
        setError(e.message || 'Auth callback failed.');
      }
    })();
  }, []);

  if (error) {
    return <main className="p-4 text-sm text-red-600">{error}</main>;
  }
  return <main className="p-4 text-sm">{message}</main>;
}

