'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, qs, Registration } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { Badge, Button, EmptyState, ErrorBanner, Input, PageHeader, Select, Spinner } from '@/components/ui';

const PAGE = 25;

export default function HistoryPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; items: Registration[] } | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setData(await api(`/registrations${qs({ q: q.trim(), status, limit: PAGE, offset: page * PAGE })}`)); }
    catch (e) { setError(e); setData((d) => d ?? { total: 0, items: [] }); }
  }, [q, status, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const pages = data ? Math.max(Math.ceil(data.total / PAGE), 1) : 1;

  return (
    <>
      <PageHeader title="Registration history" subtitle="Every registration and cancellation, with who did it and when. Records are never deleted." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-2"><span className="mb-1 block text-xs font-medium text-stone-600">Search</span>
          <Input type="search" placeholder="Attendee name, email, workshop code or title" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></label>
        <label><span className="mb-1 block text-xs font-medium text-stone-600">Status</span>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All records</option><option value="ACTIVE">Active</option><option value="CANCELLED">Cancelled</option>
          </Select></label>
      </div>
      <ErrorBanner error={error} onRetry={load} />
      {!data ? <Spinner label="Loading history…" /> : data.items.length === 0 && !error ? (
        <EmptyState title={q || status ? 'No records match your search' : 'No registrations yet'} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-4 py-2.5 font-medium">Attendee</th><th className="px-4 py-2.5 font-medium">Workshop</th><th className="px-4 py-2.5 font-medium">Registered</th><th className="px-4 py-2.5 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.items.map((r) => (
                  <tr key={r.id} className={r.status === 'CANCELLED' ? 'bg-stone-50/60' : ''}>
                    <td className="px-4 py-3"><p className="font-medium">{r.attendeeName}</p><p className="text-xs text-stone-500">{r.attendeeEmail}</p></td>
                    <td className="px-4 py-3"><Link href={`/workshops/${r.workshopId}`} className="text-teal-900 hover:underline">{r.workshopTitle}</Link><p className="font-mono text-xs text-stone-500">{r.workshopCode}</p></td>
                    <td className="px-4 py-3">{fmtDateTime(r.registeredAt)}<p className="text-xs text-stone-500">by {r.registeredBy.name}</p></td>
                    <td className="px-4 py-3">
                      <Badge tone={r.status}>{r.status === 'ACTIVE' ? 'Active' : 'Cancelled'}</Badge>
                      {r.status === 'CANCELLED' && r.cancelledAt && r.cancelledBy && (
                        <p className="mt-1 text-xs text-stone-500">{fmtDateTime(r.cancelledAt)} by {r.cancelledBy.name}{r.cancelReason ? ` — ${r.cancelReason}` : ''}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
            <span aria-live="polite">{data.total} record{data.total === 1 ? '' : 's'} · page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
