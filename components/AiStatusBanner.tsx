'use client';

export function AiStatusBanner({
  status,
  error,
}: {
  status: 'idle' | 'pending' | 'complete' | 'error' | null;
  error: string | null;
}) {
  if (!status || status === 'idle') return null;

  const base = 'px-3 py-2 rounded text-xs mb-2';
  if (status === 'pending') {
    return (
      <div className={`${base} bg-yellow-50 text-yellow-800`}>
        AI analysis in progress…
      </div>
    );
  }
  if (status === 'complete') {
    return (
      <div className={`${base} bg-emerald-50 text-emerald-800`}>
        AI analysis complete. Review identification and pricing below.
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className={`${base} bg-red-50 text-red-800`}>
        AI analysis failed: {error || 'Unknown error'}
      </div>
    );
  }
  return null;
}
