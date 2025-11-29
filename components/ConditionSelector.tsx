'use client';

import { useState } from 'react';

const grades = ['mint', 'excellent', 'very_good', 'good', 'fair', 'poor'] as const;

type ConditionGrade = (typeof grades)[number] | null;

type Props = {
  itemId: string;
  initialGrade: ConditionGrade;
  initialIsRestored: boolean;
  initialSummary: string | null;
};

export function ConditionSelector({
  itemId,
  initialGrade,
  initialIsRestored,
  initialSummary,
}: Props) {
  const [grade, setGrade] = useState<ConditionGrade>(initialGrade);
  const [isRestored, setIsRestored] = useState<boolean>(!!initialIsRestored);
  const [summary, setSummary] = useState<string>(initialSummary ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${itemId}/condition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionGrade: grade,
          isRestored,
          conditionSummary: summary || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save condition');
      }
      setMessage('Condition saved.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-xs">
      <div className="flex gap-2 items-center">
        <label className="text-[11px] font-medium">Condition grade</label>
        <select
          className="border rounded px-2 py-1 text-xs bg-white"
          value={grade ?? ''}
          onChange={e =>
            setGrade(e.target.value ? (e.target.value as ConditionGrade) : null)
          }
        >
          <option value="">Unspecified</option>
          {grades.map(g => (
            <option key={g} value={g}>
              {g.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <label className="inline-flex items-center gap-2 text-[11px] font-medium">
        <input
          type="checkbox"
          checked={isRestored}
          onChange={e => setIsRestored(e.target.checked)}
        />
        Restored / repaired
      </label>

      <div className="space-y-1">
        <label className="block text-[11px] font-medium">Condition notes</label>
        <textarea
          className="w-full border rounded px-2 py-1 text-xs min-h-[70px]"
          placeholder="Chips, scratches, cloudiness, label wear, etc."
          value={summary}
          onChange={e => setSummary(e.target.value)}
        />
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {message && <p className="text-[11px] text-emerald-600">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-slate-900 text-white px-3 py-1 rounded text-[11px] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save condition'}
      </button>
    </form>
  );
}
