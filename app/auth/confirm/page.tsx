'use client';

import { useEffect, useState } from 'react';

export default function AuthConfirmPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    (async () => {
      try {
        if (!access_token || !refresh_token) {
          throw new Error('No tokens found in URL.');
        }

        // Call server-side API to set session in httpOnly cookies
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to set session');
        }

        // Session is now set in httpOnly cookies, redirect to items
        window.location.replace('/items');
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

  return <main className="p-4 text-sm">Completing sign-in…</main>;
}
