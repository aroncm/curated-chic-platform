import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { UploadItemForm } from '@/components/UploadItemForm';

export const dynamic = 'force-dynamic';

export default async function ItemsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p className="text-sm">
          You must be logged in to view items. (Wire up Supabase auth UI when ready.)
        </p>
      </main>
    );
  }

  const { data: items, error } = await supabase
    .from('items')
    .select('id, title, status, created_at')
    .eq('owner_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main>
        <p className="text-sm text-red-600">Error loading items: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <UploadItemForm />

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Your Items</h2>
      </div>
      <table className="w-full text-xs md:text-sm bg-white rounded shadow-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">Title</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item: any) => (
            <tr key={item.id} className="border-t">
              <td className="px-3 py-2">
                <Link href={`/items/${item.id}`} className="hover:underline">
                  {item.title}
                </Link>
              </td>
              <td className="px-3 py-2 capitalize">{item.status}</td>
              <td className="px-3 py-2">
                {item.created_at
                  ? new Date(item.created_at as any).toLocaleDateString()
                  : '—'}
              </td>
            </tr>
          ))}
          {items?.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="px-3 py-4 text-xs text-slate-500"
              >
                No items yet. Create a few test items in Supabase and refresh.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
