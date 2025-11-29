'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export function AuthForm() {
  const supabase = createClientComponentClient<Database>();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signInError) {
      setError(signInError.message);
      setStatus('error');
      return;
    }
    setStatus('sent');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <label className="block text-xs font-medium">Email</label>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="you@example.com"
        required
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {status === 'sent' && (
        <p className="text-xs text-emerald-600">
          Magic link sent. Check your email to finish signing in.
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-slate-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  );
}
