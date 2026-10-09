'use client';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, qs, Registration, Workshop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate, fmtDateTime, fmtTime } from '@/lib/format';
import { Avatar, BackLink, Badge, Button, Card, DateTile, EmptyState, ErrorBanner, Field, Icon, Input, Modal, Seats, Select, Spinner, SuccessNote, Table, tbodyCls, theadCls, Th, titleCase } from '@/components/ui';
import { WorkshopForm } from '@/components/WorkshopForm';

export default function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [w, setW] = useState<Workshop | null>(null);
  const [regs, setRegs] = useState<Registration[] | null>(null);
  const [filter, setFilter] = useState<'' | 'ACTIVE' | 'CANCELLED'>('');
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);
  const [toCancel, setToCancel] = useState<Registration | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ws, rs] = await Promise.all([
        api<Workshop>(`/workshops/${id}`),
        api<{ items: Registration[] }>(`/workshops/${id}/registrations${qs({ limit: 200 })}`),
      ]);
      setW(ws); setRegs(rs.items);
    } catch (e) { setError(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error && !w) {
    return <><BackLink href="/workshops">All workshops</BackLink><ErrorBanner error={error} onRetry={load} /></>;
  }
  if (!w || !regs) return <Spinner label="Loading workshop…" />;

  const open = w.status === 'SCHEDULED' && new Date(w.endsAt) >= new Date();
  const shown = regs.filter((r) => !filter || r.status === filter);
  const activeN = regs.filter((r) => r.status === 'ACTIVE').length;

  return (
    <>
      <BackLink href="/workshops">All workshops</BackLink>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <DateTile iso={w.startsAt} muted={w.status !== 'SCHEDULED'} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-ink-600">{w.code}</p>
              <Badge tone={w.status}>{titleCase(w.status)}</Badge>
            </div>
            <h1 className="mt-0.5 text-[1.75rem] font-semibold leading-tight">{w.title}</h1>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
              <Meta icon="calendar" label="Date">{fmtDate(w.startsAt)}</Meta>
              <Meta icon="clock" label="Time">{fmtTime(w.startsAt)}–{fmtTime(w.endsAt)}</Meta>
              <Meta icon="user" label="Instructor">{w.instructor}</Meta>
              <Meta icon="pin" label="Location">{w.location}</Meta>
            </dl>
          </div>
        </div>
        {isManager && !editing && <Button variant="secondary" onClick={() => setEditing(true)}><Icon name="edit" />Edit workshop</Button>}
      </header>

      {editing ? (
        <Card className="mb-6 max-w-3xl p-6">
          <h2 className="mb-5 text-lg font-semibold">Edit workshop</h2>
          <WorkshopForm initial={w} activeCount={w.activeRegistrations} submitLabel="Save changes" onCancel={() => setEditing(false)}
            onSubmit={async (p) => { await api(`/workshops/${w.id}`, { method: 'PATCH', body: { ...p, description: p.description } }); setEditing(false); await load(); }} />
        </Card>
      ) : w.description && <p className="mb-6 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-700">{w.description}</p>}

      <div className="mb-8 grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card aria-label="Seats" className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Seats</h2>
          <Seats size="lg" taken={w.activeRegistrations} capacity={w.capacity} status={w.status} />
          {!open && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-[0.8125rem] text-ink-700"><Icon name="info" className="mt-0.5 h-4 w-4 text-ink-500" />
              {w.status !== 'SCHEDULED' ? `This workshop is ${w.status.toLowerCase()}, so registration is closed.` : 'This workshop has ended, so registration is closed.'}</p>
          )}
        </Card>
        <Card aria-label="Register an attendee" className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Register an attendee</h2>
          {open && w.seatsAvailable > 0 ? <RegisterForm workshopId={w.id} onDone={load} /> :
            <p className="flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-sm text-ink-700"><Icon name="info" className="mt-0.5 h-4 w-4 text-ink-500" />
              {open ? 'This workshop is full. Cancel an existing registration to free a seat.' : 'Registration is closed for this workshop.'}</p>}
        </Card>
      </div>

      <section aria-labelledby="regs-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="regs-title" className="text-lg font-semibold">Registrations</h2>
            <p className="text-sm text-ink-600">{activeN} active · {regs.length - activeN} cancelled · history is never deleted</p>
          </div>
          <div className="w-44"><Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter registrations">
            <option value="">All records</option><option value="ACTIVE">Active only</option><option value="CANCELLED">Cancelled only</option>
          </Select></div>
        </div>
        <ErrorBanner error={error} onRetry={load} />
        {shown.length === 0 ? <EmptyState icon="users" title={regs.length ? 'No registrations match this filter' : 'No one has registered yet'}>{!regs.length && open && 'Use the form above to register the first attendee.'}</EmptyState> : (
          <Table caption="Registrations for this workshop" minWidth={720}>
            <thead className={theadCls}><tr><Th>Attendee</Th><Th>Registered</Th><Th>Status</Th><Th /></tr></thead>
            <tbody className={tbodyCls}>
              {shown.map((r) => (
                <tr key={r.id} className={r.status === 'CANCELLED' ? 'bg-ink-50/70' : ''}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.attendeeName} className={r.status === 'CANCELLED' ? '!bg-ink-100 !text-ink-500' : ''} />
                      <div className="min-w-0"><p className={`font-medium ${r.status === 'CANCELLED' ? 'text-ink-600' : 'text-ink-900'}`}>{r.attendeeName}</p><p className="text-[0.8125rem] text-ink-600">{r.attendeeEmail}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-ink-800">{fmtDateTime(r.registeredAt)}<p className="text-[0.8125rem] text-ink-600">by {r.registeredBy.name}</p></td>
                  <td className="px-4 py-3.5">
                    <Badge tone={r.status}>{r.status === 'ACTIVE' ? 'Active' : 'Cancelled'}</Badge>
                    {r.status === 'CANCELLED' && r.cancelledAt && r.cancelledBy && (
                      <p className="mt-1 max-w-64 text-[0.8125rem] text-ink-600">{fmtDateTime(r.cancelledAt)} by {r.cancelledBy.name}{r.cancelReason ? ` — ${r.cancelReason}` : ''}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">{r.status === 'ACTIVE' && <Button variant="secondary" size="sm" onClick={() => setToCancel(r)}>Cancel registration</Button>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      {toCancel && <CancelDialog reg={toCancel} onClose={() => setToCancel(null)} onDone={async () => { setToCancel(null); await load(); }} />}
    </>
  );
}

function Meta({ icon, label, children }: { icon: 'calendar' | 'clock' | 'user' | 'pin'; label: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5"><dt className="sr-only">{label}</dt><Icon name={icon} className="h-4 w-4 text-ink-500" /><dd>{children}</dd></div>;
}

function RegisterForm({ workshopId, onDone }: { workshopId: string; onDone: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Enter the attendee’s name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    setErrors(errs); setDone(null);
    if (Object.keys(errs).length) return;
    setBusy(true); setError(null);
    try {
      await api(`/workshops/${workshopId}/registrations`, { method: 'POST', body: { attendeeName: name.trim(), attendeeEmail: email.trim() } });
      setDone(`${name.trim()} is registered.`); setName(''); setEmail('');
      await onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WORKSHOP_FULL') await onDone(); // someone else took the last seat; refresh the numbers
      setError(err);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <ErrorBanner error={error} />
      {done && <SuccessNote>{done}</SuccessNote>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Attendee name" error={errors.name}>{(id, a) => <Input id={id} {...a} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}</Field>
        <Field label="Attendee email" error={errors.email}>{(id, a) => <Input id={id} {...a} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />}</Field>
      </div>
      <Button type="submit" disabled={busy}><Icon name="plus" />{busy ? 'Registering…' : 'Register attendee'}</Button>
    </form>
  );
}

function CancelDialog({ reg, onClose, onDone }: { reg: Registration; onClose: () => void; onDone: () => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function confirm() {
    setBusy(true); setError(null);
    try { await api(`/registrations/${reg.id}/cancel`, { method: 'POST', body: { reason: reason.trim() || undefined } }); await onDone(); }
    catch (e) { setError(e); setBusy(false); }
  }
  return (
    <Modal title="Cancel this registration?" onClose={onClose}>
      <p className="mb-4 text-sm leading-relaxed text-ink-700"><strong className="font-semibold text-ink-900">{reg.attendeeName}</strong> ({reg.attendeeEmail}) will lose their seat. The record stays in the history with your name and the time.</p>
      <ErrorBanner error={error} />
      <div className="my-4"><Field label="Reason" optional>{(id) => <Input id={id} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}</Field></div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Keep registration</Button>
        <Button variant="danger" onClick={confirm} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel registration'}</Button>
      </div>
    </Modal>
  );
}
