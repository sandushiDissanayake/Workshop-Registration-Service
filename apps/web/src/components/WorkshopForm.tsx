'use client';
import { FormEvent, useState } from 'react';
import { ApiError, Workshop, WorkshopStatus } from '@/lib/api';
import { toLocalInput } from '@/lib/format';
import { Button, ErrorBanner, Field, Input, Select, Textarea } from './ui';

export interface WorkshopPayload {
  code: string; title: string; instructor: string; description: string; location: string;
  startsAt: string; endsAt: string; capacity: number; status: WorkshopStatus;
}

export function WorkshopForm({ initial, activeCount = 0, submitLabel, onSubmit, onCancel }: {
  initial?: Workshop; activeCount?: number; submitLabel: string;
  onSubmit: (p: WorkshopPayload) => Promise<void>; onCancel: () => void;
}) {
  const [v, setV] = useState({
    code: initial?.code ?? '', title: initial?.title ?? '', instructor: initial?.instructor ?? '',
    description: initial?.description ?? '', location: initial?.location ?? '',
    startsAt: initial ? toLocalInput(initial.startsAt) : '', endsAt: initial ? toLocalInput(initial.endsAt) : '',
    capacity: String(initial?.capacity ?? ''), status: (initial?.status ?? 'SCHEDULED') as WorkshopStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  function validate() {
    const e: Record<string, string> = {};
    if (!/^[A-Za-z0-9-]{2,20}$/.test(v.code)) e.code = 'Use 2–20 letters, digits or hyphens (e.g. POT-101).';
    if (!v.title.trim()) e.title = 'Title is required.';
    if (!v.instructor.trim()) e.instructor = 'Instructor is required.';
    if (!v.location.trim()) e.location = 'Location is required.';
    if (!v.startsAt) e.startsAt = 'Start time is required.';
    if (!v.endsAt) e.endsAt = 'End time is required.';
    else if (v.startsAt && new Date(v.endsAt) <= new Date(v.startsAt)) e.endsAt = 'End must be after the start.';
    const cap = Number(v.capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 1000) e.capacity = 'Enter a whole number from 1 to 1000.';
    else if (cap < activeCount) e.capacity = `${activeCount} seats are already taken, so capacity can't be lower.`;
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true); setServerError(null);
    try {
      await onSubmit({ ...v, capacity: Number(v.capacity), startsAt: new Date(v.startsAt).toISOString(), endsAt: new Date(v.endsAt).toISOString() });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CODE_TAKEN') setErrors({ code: 'That code is already used by another workshop.' });
      else if (err instanceof ApiError && err.code === 'CAPACITY_BELOW_ACTIVE') setErrors({ capacity: err.message });
      else setServerError(err);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <ErrorBanner error={serverError} />
      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-3 text-sm font-semibold text-ink-900">Details</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Workshop code" error={errors.code} hint="Unique, e.g. POT-101">{(id, a) => <Input id={id} {...a} value={v.code} onChange={set('code')} className="uppercase" autoComplete="off" />}</Field>
          <div className="sm:col-span-2"><Field label="Title" error={errors.title}>{(id, a) => <Input id={id} {...a} value={v.title} onChange={set('title')} />}</Field></div>
          <div className="sm:col-span-3 grid gap-4 sm:grid-cols-2">
            <Field label="Instructor" error={errors.instructor}>{(id, a) => <Input id={id} {...a} value={v.instructor} onChange={set('instructor')} />}</Field>
            <Field label="Location" error={errors.location}>{(id, a) => <Input id={id} {...a} value={v.location} onChange={set('location')} placeholder="e.g. Kandy Studio" />}</Field>
          </div>
        </div>
        <Field label="Description" optional>
          {(id, a) => <Textarea id={id} {...a} rows={3} value={v.description} onChange={set('description')} />}
        </Field>
      </fieldset>

      <hr className="border-ink-100" />
      <fieldset className="min-w-0 space-y-4">
        <legend className="mb-3 text-sm font-semibold text-ink-900">Schedule and seats</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Starts" error={errors.startsAt}>{(id, a) => <Input id={id} {...a} type="datetime-local" value={v.startsAt} onChange={set('startsAt')} />}</Field>
          <Field label="Ends" error={errors.endsAt}>{(id, a) => <Input id={id} {...a} type="datetime-local" value={v.endsAt} onChange={set('endsAt')} />}</Field>
          <Field label="Capacity (seats)" error={errors.capacity} hint={activeCount > 0 ? `${activeCount} already taken.` : undefined}>{(id, a) => <Input id={id} {...a} type="number" inputMode="numeric" min={1} max={1000} value={v.capacity} onChange={set('capacity')} />}</Field>
          <Field label="Status" hint={v.status !== 'SCHEDULED' ? 'Only scheduled workshops accept registrations.' : undefined}>
            {(id, a) => (
              <Select id={id} {...a} value={v.status} onChange={set('status')}>
                <option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}
