'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email.trim()) return;

  setStatus('sending');
  setError(null);

  const redirectTo =
  `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`;

  console.log('redirectTo used for magic link:', redirectTo);

const { error: signInError } = await supabase.auth.signInWithOtp({
  email: email.trim(),
  options: {
    emailRedirectTo: redirectTo,
    // remove flowType: 'pkce'
  },
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
