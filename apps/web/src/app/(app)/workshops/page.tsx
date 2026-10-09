'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, qs, Workshop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, fmtDate, fmtTime, startOfDay, toDateInput } from '@/lib/format';
import { Badge, Button, Card, Chip, DateTile, EmptyState, ErrorBanner, FilterLabel, Icon, Input, LinkButton, PageHeader, SearchInput, Seats, Select, Spinner, Table, tbodyCls, theadCls, Th, titleCase } from '@/components/ui';

type Preset = 'any' | 'today' | 'week' | 'month';

export default function WorkshopsPage() {
  const { user } = useAuth();
  const router = useRouter();
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

  const today = startOfDay(new Date());
  const range = (p: Exclude<Preset, 'any'>) => p === 'today' ? [toDateInput(today), toDateInput(today)] : p === 'week' ? [toDateInput(today), toDateInput(addDays(today, 6))] : [toDateInput(today), toDateInput(addDays(today, 29))];
  function preset(p: Preset) {
    if (p === 'any') { setFrom(''); setTo(''); return; }
    const [f, t] = range(p);
    setFrom(f); setTo(t);
  }
  const is = (p: Exclude<Preset, 'any'>) => { const [f, t] = range(p); return from === f && to === t; };
  const weekWithSeats = is('week') && availability === 'available' && status === 'SCHEDULED';
  const filtered = !!(q || status || availability || from || to);
  const clear = () => { setQ(''); setStatus(''); setAvailability(''); setFrom(''); setTo(''); };

  const open = items?.filter((w) => w.status === 'SCHEDULED') ?? [];
  const seatsOpen = open.reduce((n, w) => n + w.seatsAvailable, 0);

  return (
    <>
      <PageHeader title="Workshops" subtitle="Find a workshop and see how many seats are left."
        actions={user?.role === 'MANAGER' && <LinkButton href="/workshops/new"><Icon name="plus" />New workshop</LinkButton>} />

      <Card aria-label="Filters" className="mb-6 p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <FilterLabel label="Search"><SearchInput placeholder="Code, title or instructor" value={q} onChange={(e) => setQ(e.target.value)} /></FilterLabel>
          <FilterLabel label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option><option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
            </Select>
          </FilterLabel>
          <FilterLabel label="Seats">
            <Select value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="">Any availability</option><option value="available">Seats available</option><option value="full">Full</option>
            </Select>
          </FilterLabel>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-ink-100 pt-4">
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
            <FilterLabel label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></FilterLabel>
            <FilterLabel label="To"><Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></FilterLabel>
          </div>
          <div role="group" aria-label="Quick date ranges" className="flex flex-wrap items-center gap-2 pb-1">
            <Chip active={is('today')} onClick={() => preset('today')}>Today</Chip>
            <Chip active={is('week') && !weekWithSeats} onClick={() => preset('week')}>Next 7 days</Chip>
            <Chip active={is('month')} onClick={() => preset('month')}>Next 30 days</Chip>
            <span className="mx-1 hidden h-5 w-px bg-ink-200 sm:block" aria-hidden />
            <Chip active={weekWithSeats} onClick={() => { preset('week'); setAvailability('available'); setStatus('SCHEDULED'); }}>This week, seats open</Chip>
          </div>
          {filtered && <Button variant="ghost" size="sm" className="mb-1 ml-auto" onClick={clear}><Icon name="x" className="h-3.5 w-3.5" />Clear filters</Button>}
        </div>
      </Card>

      <div className="mb-3 min-h-5 text-sm text-ink-600" aria-live="polite">
        {items && items.length > 0 && <>
          <span className="font-medium text-ink-900">{items.length} workshop{items.length === 1 ? '' : 's'}</span>
          {open.length > 0 && <> · {seatsOpen} seat{seatsOpen === 1 ? '' : 's'} open across {open.length} scheduled</>}
        </>}
      </div>

      <ErrorBanner error={error} onRetry={load} />
      {items === null ? <Spinner label="Loading workshops…" /> : items.length === 0 && !error ? (
        <EmptyState icon="calendar" title={filtered ? 'No workshops match these filters' : 'No workshops yet'}>
          {filtered ? <Button variant="secondary" size="sm" onClick={clear}>Clear filters</Button> : user?.role === 'MANAGER' ? 'Create the first workshop to get started.' : 'A manager needs to schedule workshops first.'}
        </EmptyState>
      ) : items.length > 0 && (
        <>
          {/* Phones and small tablets: cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((w) => (
              <li key={w.id}>
                <Link href={`/workshops/${w.id}`} className="block rounded-xl border border-ink-200 bg-white p-4 shadow-card transition-colors hover:border-ink-300 active:bg-ink-50">
                  <div className="flex gap-3">
                    <DateTile iso={w.startsAt} muted={w.status !== 'SCHEDULED'} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-ink-900">{w.title}</p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-600">{w.code} · {w.instructor}</p>
                      <p className="text-[0.8125rem] text-ink-600">{fmtTime(w.startsAt)}–{fmtTime(w.endsAt)} · {w.location}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <Seats taken={w.activeRegistrations} capacity={w.capacity} status={w.status} />
                    <StatusBadges w={w} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table caption="Workshops" minWidth={760}>
              <thead className={theadCls}><tr><Th>Workshop</Th><Th>When</Th><Th>Seats</Th><Th>Status</Th></tr></thead>
              <tbody className={tbodyCls}>
                {items.map((w) => (
                  <tr key={w.id} onClick={() => router.push(`/workshops/${w.id}`)} className="cursor-pointer align-middle transition-colors hover:bg-navy-50/60">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3.5">
                        <DateTile iso={w.startsAt} muted={w.status !== 'SCHEDULED'} />
                        <div className="min-w-0">
                          <Link href={`/workshops/${w.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink-900 hover:text-navy-700 hover:underline">{w.title}</Link>
                          <p className="text-[0.8125rem] text-ink-600"><span className="font-medium text-ink-700">{w.code}</span> · {w.instructor} · {w.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5"><p className="text-ink-900">{fmtDate(w.startsAt)}</p><p className="text-[0.8125rem] text-ink-600">{fmtTime(w.startsAt)}–{fmtTime(w.endsAt)}</p></td>
                    <td className="px-4 py-3.5"><Seats taken={w.activeRegistrations} capacity={w.capacity} status={w.status} /></td>
                    <td className="px-4 py-3.5"><StatusBadges w={w} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}

function StatusBadges({ w }: { w: Workshop }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={w.status}>{titleCase(w.status)}</Badge>
      {w.status === 'SCHEDULED' && w.seatsAvailable === 0 && <Badge tone="FULL">Full</Badge>}
    </span>
  );
}
