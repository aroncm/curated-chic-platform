import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'VintageLab',
  description: 'Vintage decor identification & resale workflow',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white">
            <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
              <div className="font-semibold text-sm">VintageLab</div>
              <nav className="flex gap-4 text-xs">
                <Link href="/items" className="hover:underline">
                  Inventory
                </Link>
                <Link href="/reporting" className="hover:underline">
                  Reporting
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-5xl mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
