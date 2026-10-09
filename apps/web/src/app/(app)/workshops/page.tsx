'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, qs, Workshop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, fmtDate, fmtTime, startOfDay, toDateInput } from '@/lib/format';
import { Badge, Button, EmptyState, ErrorBanner, Input, PageHeader, Seats, Select, Spinner } from '@/components/ui';

type Preset = 'any' | 'today' | 'week' | 'month';

export default function WorkshopsPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [availability, setAvailability] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState<Workshop[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await api<Workshop[]>(`/workshops${qs({
        q: q.trim(), status, availability,
        from: from ? new Date(`${from}T00:00`).toISOString() : undefined,
        to: to ? addDays(new Date(`${to}T00:00`), 1).toISOString() : undefined,
      })}`));
    } catch (e) { setError(e); setItems((cur) => cur ?? []); }
  }, [q, status, availability, from, to]);

  // Debounce text search; other filters apply immediately through the same effect.
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  function preset(p: Preset) {
    const today = startOfDay(new Date());
    if (p === 'any') { setFrom(''); setTo(''); }
    if (p === 'today') { setFrom(toDateInput(today)); setTo(toDateInput(today)); }
    if (p === 'week') { setFrom(toDateInput(today)); setTo(toDateInput(addDays(today, 6))); }
    if (p === 'month') { setFrom(toDateInput(today)); setTo(toDateInput(addDays(today, 29))); }
  }
  const filtered = !!(q || status || availability || from || to);
  const clear = () => { setQ(''); setStatus(''); setAvailability(''); setFrom(''); setTo(''); };

  return (
    <>
      <PageHeader title="Workshops" subtitle="Find a workshop and see how many seats are left."
        actions={user?.role === 'MANAGER' && <Link href="/workshops/new" className="rounded-md bg-teal-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-800">New workshop</Link>} />

      <section aria-label="Filters" className="mb-5 space-y-3 rounded-lg border border-stone-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2"><span className="mb-1 block text-xs font-medium text-stone-600">Search</span>
            <Input type="search" placeholder="Code, title or instructor" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <label><span className="mb-1 block text-xs font-medium text-stone-600">Status</span>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option><option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
            </Select></label>
          <label><span className="mb-1 block text-xs font-medium text-stone-600">Seats</span>
            <Select value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="">Any availability</option><option value="available">Seats available</option><option value="full">Full</option>
            </Select></label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label><span className="mb-1 block text-xs font-medium text-stone-600">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label><span className="mb-1 block text-xs font-medium text-stone-600">To</span><Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" onClick={() => preset('today')}>Today</Button>
            <Button variant="secondary" onClick={() => preset('week')}>Next 7 days</Button>
            <Button variant="secondary" onClick={() => preset('month')}>Next 30 days</Button>
            <Button variant="secondary" onClick={() => { preset('week'); setAvailability('available'); setStatus('SCHEDULED'); }}>This week with seats</Button>
          </div>
          {filtered && <Button variant="ghost" onClick={clear}>Clear filters</Button>}
        </div>
      </section>

      <ErrorBanner error={error} onRetry={load} />
      {items === null ? <Spinner label="Loading workshops…" /> : items.length === 0 && !error ? (
        <EmptyState title={filtered ? 'No workshops match these filters' : 'No workshops yet'}>
          {filtered ? <button className="underline" onClick={clear}>Clear filters</button> : user?.role === 'MANAGER' ? 'Create the first workshop to get started.' : 'A manager needs to schedule workshops first.'}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 md:table-header-group">
              <tr><th className="px-4 py-2.5 font-medium">Workshop</th><th className="px-4 py-2.5 font-medium">When</th><th className="px-4 py-2.5 font-medium">Seats</th><th className="px-4 py-2.5 font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((w) => (
                <tr key={w.id} className="block px-4 py-3 hover:bg-stone-50 md:table-row md:px-0 md:py-0">
                  <td className="block md:table-cell md:px-4 md:py-3">
                    <Link href={`/workshops/${w.id}`} className="font-medium text-teal-900 hover:underline">{w.title}</Link>
                    <p className="text-xs text-stone-500"><span className="font-mono">{w.code}</span> · {w.instructor} · {w.location}</p>
                  </td>
                  <td className="block py-1 md:table-cell md:px-4 md:py-3">{fmtDate(w.startsAt)}<p className="text-xs text-stone-500">{fmtTime(w.startsAt)}–{fmtTime(w.endsAt)}</p></td>
                  <td className="block py-1 md:table-cell md:px-4 md:py-3"><Seats taken={w.activeRegistrations} capacity={w.capacity} status={w.status} /></td>
                  <td className="block py-1 md:table-cell md:px-4 md:py-3">
                    <Badge tone={w.status}>{w.status.charAt(0) + w.status.slice(1).toLowerCase()}</Badge>
                    {w.status === 'SCHEDULED' && w.seatsAvailable === 0 && <span className="ml-1.5"><Badge tone="FULL">Full</Badge></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items && items.length > 0 && <p className="mt-2 text-xs text-stone-500" aria-live="polite">{items.length} workshop{items.length === 1 ? '' : 's'}</p>}
    </>
  );
}
