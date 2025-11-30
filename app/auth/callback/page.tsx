'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Completing sign-in…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      setError('Missing tokens in callback.');
      return;
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        window.location.replace('/items');
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <main className="p-4 text-sm text-red-600">{error}</main>;
  return <main className="p-4 text-sm">{message}</main>;
}
