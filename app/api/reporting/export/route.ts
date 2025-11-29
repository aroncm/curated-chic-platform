import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

function csvEscape(value: string): string {
  const needsQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';

  let query = supabase
    .from('items')
    .select(
      `
      id,
      title,
      status,
      category,
      purchases(purchase_price, additional_costs),
      listings(listing_price, date_listed, listing_platforms(name)),
      sales(sale_price, shipping_cost, platform_fees, other_fees)
    `
    )
    .eq('owner_id', user.id)
    .eq('is_deleted', false);

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data: items, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

    const platformName = listing?.listing_platforms?.name ?? 'Unlisted';

    return {
      title: item.title,
      status: item.status,
      category: item.category ?? '',
      platform: platformName,
      cost_basis: costBasis,
      listing_price: listing?.listing_price
        ? Number(listing.listing_price)
        : null,
      date_listed: listing?.date_listed ?? '',
      sale_price: sale?.sale_price ? Number(sale.sale_price) : null,
      profit: realizedProfit,
    };
  });

  const header = [
    'title',
    'status',
    'category',
    'platform',
    'cost_basis',
    'listing_price',
    'date_listed',
    'sale_price',
    'profit',
  ];

  const csvBody = rows
    .map(r =>
      [
        r.title ?? '',
        r.status ?? '',
        r.category ?? '',
        r.platform ?? '',
        r.cost_basis != null ? r.cost_basis.toFixed(2) : '',
        r.listing_price != null ? r.listing_price.toFixed(2) : '',
        r.date_listed ? new Date(r.date_listed).toISOString().slice(0, 10) : '',
        r.sale_price != null ? r.sale_price.toFixed(2) : '',
        r.profit != null ? r.profit.toFixed(2) : '',
      ]
        .map(v => csvEscape(String(v)))
        .join(',')
    )
    .join('\n');

  const csv = `${header.join(',')}\n${csvBody}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="report.csv"',
    },
  });
}
