'use client';

import { useEffect, useState } from 'react';

type CopyPayload = {
  ebayTitle: string;
  ebayDescription: string;
  facebookTitle: string;
  facebookDescription: string;
  etsyTitle: string;
  etsyDescription: string;
};

export function ListingCopy({ listingId }: { listingId: string }) {
  const [copy, setCopy] = useState<CopyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings/${listingId}/copy`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load listing copy');
        }
        const data = await res.json();
        setCopy(data.copy);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [listingId]);

  if (loading)
    return (
      <div className="bg-white p-4 rounded shadow-sm text-xs">
        Loading copy…
      </div>
    );
  if (error)
    return (
      <div className="bg-white p-4 rounded shadow-sm text-xs text-red-600">
        {error}
      </div>
    );
  if (!copy)
    return (
      <div className="bg-white p-4 rounded shadow-sm text-xs">
        No listing copy yet.
      </div>
    );

  const Section = ({
    title,
    heading,
    body,
  }: {
    title: string;
    heading: string;
    body: string;
  }) => (
    <div className="border rounded p-3 text-xs flex flex-col gap-1">
      <div className="font-semibold mb-1">{title}</div>
      <div className="border rounded px-2 py-1 bg-slate-50 text-[11px]">
        {heading}
      </div>
      <textarea
        readOnly
        className="w-full border rounded px-2 py-1 min-h-[80px] text-[11px]"
        value={body}
      />
    </div>
  );

  return (
    <div className="bg-white p-4 rounded shadow-sm text-xs space-y-3">
      <h3 className="font-semibold mb-1">Listing copy</h3>
      <p className="text-[11px] text-slate-500 mb-2">
        Copy and paste into eBay, Facebook Marketplace, or Etsy. You can tweak
        per platform as needed.
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        <Section
          title="eBay"
          heading={copy.ebayTitle}
          body={copy.ebayDescription}
        />
        <Section
          title="Facebook Marketplace"
          heading={copy.facebookTitle}
          body={copy.facebookDescription}
        />
        <Section
          title="Etsy"
          heading={copy.etsyTitle}
          body={copy.etsyDescription}
        />
      </div>
    </div>
  );
}
