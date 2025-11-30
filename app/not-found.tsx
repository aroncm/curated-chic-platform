import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-slate-600 mb-6">Page not found</p>
        <Link
          href="/"
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
