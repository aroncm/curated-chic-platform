'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthConfirmPage() {
  const [message, setMessage] = useState('Completing sign-in…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.slice(1));
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
        throw new Error('No tokens found in URL.');
      } catch (e: any) {
        console.error('Auth confirm error', e);
        setError(e.message || 'Authentication failed.');
      }
    })();
  }, []);

  if (error) {
    return (
      <main className="p-4">
        <p className="text-sm text-red-600">{error}</p>
        <a href="/auth" className="text-sm text-blue-600 hover:underline mt-4 block">
          Back to sign in
        </a>
      </main>
    );
  }

  return <main className="p-4 text-sm">{message}</main>;
}
