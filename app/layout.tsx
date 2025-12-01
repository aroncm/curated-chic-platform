import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProfileDropdown } from '@/components/ProfileDropdown';

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
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
              <div className="font-semibold text-sm">VintageLab</div>
              <div className="flex items-center gap-6">
                <nav className="flex gap-4 text-xs">
                  <Link href="/items" className="hover:underline">
                    Add Items
                  </Link>
                  <Link href="/inventory" className="hover:underline">
                    Inventory
                  </Link>
                  <Link href="/inventory/metadata" className="hover:underline">
                    Metadata
                  </Link>
                  <Link href="/reporting" className="hover:underline">
                    Reporting
                  </Link>
                </nav>
                <ProfileDropdown />
              </div>
            </div>
          </header>
          <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
