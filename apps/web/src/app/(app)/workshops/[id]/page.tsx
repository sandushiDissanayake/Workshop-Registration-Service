'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, qs, Registration, Workshop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDateTime, fmtRange } from '@/lib/format';
import { Badge, Button, EmptyState, ErrorBanner, Field, Input, Modal, Seats, Select, Spinner } from '@/components/ui';
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
    return <><ErrorBanner error={error} onRetry={load} /><p className="mt-3 text-sm"><Link href="/workshops" className="underline">Back to workshops</Link></p></>;
  }
  if (!w || !regs) return <Spinner label="Loading workshop…" />;

  const open = w.status === 'SCHEDULED' && new Date(w.endsAt) >= new Date();
  const shown = regs.filter((r) => !filter || r.status === filter);

  return (
    <>
      <p className="mb-3 text-sm"><Link href="/workshops" className="text-stone-600 hover:underline">← All workshops</Link></p>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-stone-500">{w.code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{w.title}</h1>
          <p className="mt-1 text-sm text-stone-600">{w.instructor} · {w.location}</p>
          <p className="text-sm text-stone-600">{fmtRange(w.startsAt, w.endsAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={w.status}>{w.status.charAt(0) + w.status.slice(1).toLowerCase()}</Badge>
          {isManager && !editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit workshop</Button>}
        </div>
      </header>

      {editing ? (
        <div className="mb-6 max-w-3xl rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Edit workshop</h2>
          <WorkshopForm initial={w} activeCount={w.activeRegistrations} submitLabel="Save changes" onCancel={() => setEditing(false)}
            onSubmit={async (p) => { await api(`/workshops/${w.id}`, { method: 'PATCH', body: { ...p, description: p.description } }); setEditing(false); await load(); }} />
        </div>
      ) : w.description && <p className="mb-5 max-w-3xl text-sm text-stone-700">{w.description}</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-stone-200 bg-white p-4" aria-label="Seats">
          <h2 className="mb-2 text-sm font-semibold">Seats</h2>
          <Seats taken={w.activeRegistrations} capacity={w.capacity} status={w.status} />
          {!open && <p className="mt-2 text-xs text-stone-500">{w.status !== 'SCHEDULED' ? `This workshop is ${w.status.toLowerCase()}, so registration is closed.` : 'This workshop has ended, so registration is closed.'}</p>}
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-4 lg:col-span-2" aria-label="Register an attendee">
          <h2 className="mb-2 text-sm font-semibold">Register an attendee</h2>
          {open && w.seatsAvailable > 0 ? <RegisterForm workshopId={w.id} onDone={load} /> :
            <p className="text-sm text-stone-600">{open ? 'This workshop is full. Cancel an existing registration to free a seat.' : 'Registration is closed for this workshop.'}</p>}
        </section>
      </div>

      <section aria-label="Registrations">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Registrations <span className="text-sm font-normal text-stone-500">({regs.length} total incl. cancelled)</span></h2>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="!w-auto" aria-label="Filter registrations">
            <option value="">All records</option><option value="ACTIVE">Active only</option><option value="CANCELLED">Cancelled only</option>
          </Select>
        </div>
        <ErrorBanner error={error} onRetry={load} />
        {shown.length === 0 ? <EmptyState title={regs.length ? 'No registrations match this filter' : 'No one has registered yet'} /> : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="px-4 py-2.5 font-medium">Attendee</th><th className="px-4 py-2.5 font-medium">Registered</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5" /></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shown.map((r) => (
                  <tr key={r.id} className={r.status === 'CANCELLED' ? 'bg-stone-50/60 text-stone-600' : ''}>
                    <td className="px-4 py-3"><p className="font-medium text-stone-900">{r.attendeeName}</p><p className="text-xs text-stone-500">{r.attendeeEmail}</p></td>
                    <td className="px-4 py-3">{fmtDateTime(r.registeredAt)}<p className="text-xs text-stone-500">by {r.registeredBy.name}</p></td>
                    <td className="px-4 py-3">
                      <Badge tone={r.status}>{r.status === 'ACTIVE' ? 'Active' : 'Cancelled'}</Badge>
                      {r.status === 'CANCELLED' && r.cancelledAt && r.cancelledBy && (
                        <p className="mt-1 text-xs text-stone-500">{fmtDateTime(r.cancelledAt)} by {r.cancelledBy.name}{r.cancelReason ? ` — ${r.cancelReason}` : ''}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{r.status === 'ACTIVE' && <Button variant="secondary" onClick={() => setToCancel(r)}>Cancel registration</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toCancel && <CancelDialog reg={toCancel} onClose={() => setToCancel(null)} onDone={async () => { setToCancel(null); await load(); }} />}
    </>
  );
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
    <form onSubmit={submit} noValidate className="space-y-3">
      <ErrorBanner error={error} />
      {done && <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900" role="status">{done}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Attendee name" error={errors.name}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}</Field>
        <Field label="Attendee email" error={errors.email}>{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />}</Field>
      </div>
      <Button type="submit" disabled={busy}>{busy ? 'Registering…' : 'Register attendee'}</Button>
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
      <p className="mb-3 text-sm text-stone-700">{reg.attendeeName} ({reg.attendeeEmail}) will lose their seat. The record stays in the history with your name and the time.</p>
      <ErrorBanner error={error} />
      <div className="my-3"><Field label="Reason (optional)">{(id) => <Input id={id} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}</Field></div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Keep registration</Button>
        <Button variant="danger" onClick={confirm} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel registration'}</Button>
      </div>
    </Modal>
  );
}
