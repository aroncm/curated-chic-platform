import { createSupabaseServerClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';

type SearchParams = {
  from?: string;
  to?: string;
};

type AiUsageStats = {
  totalCost: number;
  callCount: number;
};

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p className="text-sm">
          You must be logged in to view reporting.
        </p>
      </main>
    );
  }

  const from = searchParams.from || '';
  const to = searchParams.to || '';

  let query = supabase
    .from('items')
    .select(
      `
      id,
      title,
      status,
      created_at,
      category,
      brand_or_maker,
      estimated_low_price,
      estimated_high_price,
      suggested_list_price,
      purchases(purchase_price, additional_costs, purchase_date),
      listings(listing_price, date_listed, listing_platforms(name)),
      sales(sale_price, shipping_cost, platform_fees, other_fees, sale_date)
    `
    )
    .eq('owner_id', user.id)
    .eq('is_deleted', false);

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data: items, error } = await query;

  if (error) {
    return (
      <main>
        <p className="text-sm text-red-600">
          Error loading reporting: {error.message}
        </p>
      </main>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
      case 'identified':
        return 'Unlisted';
      case 'listed':
        return 'Listed';
      case 'sold':
        return 'Sold';
      default:
        return status;
    }
  };

  const rows = (items ?? []).map((item: any) => {
    const purchase = item.purchases?.[0];
    const listing = item.listings?.[0];
    const sale = item.sales?.[0];

    const costBasis =
      purchase?.purchase_price != null
        ? Number(purchase.purchase_price) +
          (purchase.additional_costs ? Number(purchase.additional_costs) : 0)
        : null;

    const realizedProfit =
      sale?.sale_price != null
        ? Number(sale.sale_price) -
          ((costBasis ?? 0) +
            (sale.shipping_cost ? Number(sale.shipping_cost) : 0) +
            (sale.platform_fees ? Number(sale.platform_fees) : 0) +
            (sale.other_fees ? Number(sale.other_fees) : 0))
        : null;

    const platformName =
      listing?.listing_platforms?.name ?? 'Unlisted';

    return {
      id: item.id,
      title: item.title,
      status: item.status,
      statusLabel: getStatusLabel(item.status),
      category: item.category,
      platform: platformName,
      purchase_price: purchase?.purchase_price
        ? Number(purchase.purchase_price)
        : null,
      additional_costs: purchase?.additional_costs
        ? Number(purchase.additional_costs)
        : null,
      cost_basis: costBasis,
      suggested_price: item.suggested_list_price
        ? Number(item.suggested_list_price)
        : null,
      listing_price: listing?.listing_price
        ? Number(listing.listing_price)
        : null,
      date_listed: listing?.date_listed ?? null,
      sale_price: sale?.sale_price ? Number(sale.sale_price) : null,
      shipping_cost: sale?.shipping_cost
        ? Number(sale.shipping_cost)
        : null,
      platform_fees: sale?.platform_fees
        ? Number(sale.platform_fees)
        : null,
      other_fees: sale?.other_fees ? Number(sale.other_fees) : null,
      realized_profit: realizedProfit,
    };
  });

  const totalCostBasis = rows.reduce(
    (sum, r) => sum + (r.cost_basis ?? 0),
    0
  );
  const totalRealizedProfit = rows.reduce(
    (sum, r) => sum + (r.realized_profit ?? 0),
    0
  );

  const listedButNotSold = rows.filter(
    r => r.status === 'listed' && r.sale_price == null
  );
  const soldRows = rows.filter(r => r.status === 'sold');

  let aiUsage: AiUsageStats = { totalCost: 0, callCount: 0 };
  try {
    const { data: usageData, error: usageError } = await supabase
      .from('ai_usage')
      .select('total_cost_usd')
      .eq('user_id', user.id);

    if (!usageError && usageData) {
      aiUsage = {
        totalCost: (usageData as any[]).reduce(
          (sum, u) => sum + (u.total_cost_usd ?? 0),
          0
        ),
        callCount: usageData.length,
      };
    }
  } catch (e) {
    aiUsage = { totalCost: 0, callCount: 0 };
  }

  return (
    <main className="space-y-6">
      <Breadcrumb items={[{ label: 'Reporting' }]} />

      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Reporting</h2>
          <p className="text-xs text-slate-500">
            Track cost basis, listings, and realized profit across platforms.
          </p>
        </div>
        <a
          href={`/api/reporting/export${from || to ? `?from=${from || ''}&to=${to || ''}` : ''}`}
          className="text-xs bg-slate-900 text-white px-3 py-2 rounded"
        >
          Export CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-xs bg-white p-3 rounded shadow-sm">
        <div>
          <label className="block text-[11px] font-medium mb-1">
            From (created)
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border rounded px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1">
            To (created)
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border rounded px-2 py-1 text-xs"
          />
        </div>
        <button
          className="bg-slate-900 text-white px-3 py-2 rounded text-xs"
          type="submit"
        >
          Apply
        </button>
      </form>

      <section className="grid md:grid-cols-4 gap-3 text-xs">
        <div className="bg-white rounded p-3 shadow-sm">
          <div className="text-[11px] text-slate-500">Total cost basis</div>
          <div className="text-lg font-semibold">
            ${totalCostBasis.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sum of purchase price + additional costs for all items.
          </div>
        </div>

        <div className="bg-white rounded p-3 shadow-sm">
          <div className="text-[11px] text-slate-500">Realized profit</div>
          <div className="text-lg font-semibold">
            ${totalRealizedProfit.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across all sold items (after shipping & fees).
          </div>
        </div>

        <div className="bg-white rounded p-3 shadow-sm">
          <div className="text-[11px] text-slate-500">
            Listed but not yet sold
          </div>
          <div className="text-lg font-semibold">
            {listedButNotSold.length} items
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Keep an eye on time to sell and adjust prices.
          </div>
        </div>

        <div className="bg-white rounded p-3 shadow-sm">
          <div className="text-[11px] text-slate-500">AI spend (est.)</div>
          <div className="text-lg font-semibold">
            ${aiUsage.totalCost.toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {aiUsage.callCount} calls (estimate, based on token usage).
          </div>
        </div>
      </section>

      <section className="bg-white rounded shadow-sm overflow-x-auto">
        <table className="w-full text-[11px] md:text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Platform</th>
              <th className="text-right px-3 py-2">Cost basis</th>
              <th className="text-right px-3 py-2">Suggested</th>
              <th className="text-right px-3 py-2">List price</th>
              <th className="text-left px-3 py-2">Date listed</th>
              <th className="text-right px-3 py-2">Sale price</th>
              <th className="text-right px-3 py-2">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/items/${row.id}`}
                    className="hover:underline"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.statusLabel}</td>
                <td className="px-3 py-2">
                  {row.category || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2">
                  {row.platform || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.cost_basis != null
                    ? `$${row.cost_basis.toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.suggested_price != null
                    ? `$${row.suggested_price.toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.listing_price != null
                    ? `$${row.listing_price.toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-3 py-2">
                  {row.date_listed
                    ? new Date(row.date_listed).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.sale_price != null
                    ? `$${row.sale_price.toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.realized_profit != null
                    ? `$${row.realized_profit.toFixed(2)}`
                    : row.status === 'sold'
                    ? '0.00'
                    : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-4 text-xs text-slate-500"
                >
                  No items found for this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {soldRows.length > 0 && (
        <section className="text-[11px] text-slate-500">
          Showing {rows.length} items; {soldRows.length} sold.
        </section>
      )}
    </main>
  );
}
