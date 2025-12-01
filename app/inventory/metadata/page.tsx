import { InventoryManager } from '@/components/InventoryManager';

export const dynamic = 'force-dynamic';

export default function MetadataPage() {
  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">Metadata Management</h2>
      <p className="text-xs text-slate-500">
        Manage categories, platforms, acquisition sources, inventory locations, and tags
        without touching SQL.
      </p>
      <InventoryManager />
    </main>
  );
}
