import { InventoryManager } from '@/components/InventoryManager';

export default function InventoryPage() {
  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">Inventory Management</h2>
      <p className="text-xs text-slate-500">
        Manage categories, platforms, acquisition sources, inventory locations, and tags
        without touching SQL.
      </p>
      <InventoryManager />
    </main>
  );
}
