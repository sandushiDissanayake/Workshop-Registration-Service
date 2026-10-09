'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, qs, Registration } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { Avatar, Badge, Button, EmptyState, ErrorBanner, FilterLabel, Icon, PageHeader, SearchInput, Select, Spinner, Table, tbodyCls, theadCls, Th } from '@/components/ui';

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
      <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <FilterLabel label="Search"><SearchInput placeholder="Attendee name, email, workshop code or title" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></FilterLabel>
        <FilterLabel label="Status">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All records</option><option value="ACTIVE">Active</option><option value="CANCELLED">Cancelled</option>
          </Select>
        </FilterLabel>
      </div>
      <ErrorBanner error={error} onRetry={load} />
      {!data ? <Spinner label="Loading history…" /> : data.items.length === 0 && !error ? (
        <EmptyState icon="list" title={q || status ? 'No records match your search' : 'No registrations yet'}>
          {q || status ? 'Try a different name, email or workshop code.' : 'Registrations will appear here as soon as staff add them.'}
        </EmptyState>
      ) : (
        <>
          <Table caption="Registration history" minWidth={820}>
            <thead className={theadCls}><tr><Th>Attendee</Th><Th>Workshop</Th><Th>Registered</Th><Th>Status</Th></tr></thead>
            <tbody className={tbodyCls}>
              {data.items.map((r) => (
                <tr key={r.id} className={r.status === 'CANCELLED' ? 'bg-ink-50/70' : ''}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.attendeeName} className={r.status === 'CANCELLED' ? '!bg-ink-100 !text-ink-500' : ''} />
                      <div className="min-w-0"><p className="font-medium text-ink-900">{r.attendeeName}</p><p className="text-[0.8125rem] text-ink-600">{r.attendeeEmail}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><Link href={`/workshops/${r.workshopId}`} className="font-medium text-navy-700 hover:underline">{r.workshopTitle}</Link><p className="text-[0.8125rem] text-ink-600">{r.workshopCode}</p></td>
                  <td className="px-4 py-3.5 text-ink-800">{fmtDateTime(r.registeredAt)}<p className="text-[0.8125rem] text-ink-600">by {r.registeredBy.name}</p></td>
                  <td className="px-4 py-3.5">
                    <Badge tone={r.status}>{r.status === 'ACTIVE' ? 'Active' : 'Cancelled'}</Badge>
                    {r.status === 'CANCELLED' && r.cancelledAt && r.cancelledBy && (
                      <p className="mt-1 max-w-64 text-[0.8125rem] text-ink-600">{fmtDateTime(r.cancelledAt)} by {r.cancelledBy.name}{r.cancelReason ? ` — ${r.cancelReason}` : ''}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-600">
            <span aria-live="polite">{data.total} record{data.total === 1 ? '' : 's'} · page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><Icon name="chevron-left" className="h-3.5 w-3.5" />Previous</Button>
              <Button variant="secondary" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next<Icon name="chevron-right" className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
