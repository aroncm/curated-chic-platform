export const dynamic = 'force-dynamic';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Welcome to VintageLab</h1>
      <p className="text-sm text-slate-600">
        Upload items, run AI identification, track listings and profit across platforms.
      </p>
      <div className="flex gap-3 text-sm">
        <Link
          href="/items"
          className="bg-slate-900 text-white px-4 py-2 rounded"
        >
          Go to Items
        </Link>
        <Link
          href="/reporting"
          className="border border-slate-300 px-4 py-2 rounded"
        >
          View Reporting
        </Link>
      </div>
    </main>
  );
}
