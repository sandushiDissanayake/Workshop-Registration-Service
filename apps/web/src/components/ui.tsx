'use client';
import { useEffect, useId } from 'react';
import { ApiError } from '@/lib/api';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export function Button({ variant = 'primary', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-teal-700/50',
    secondary: 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-100 disabled:text-stone-400',
    danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/50',
    ghost: 'text-stone-700 hover:bg-stone-200/70 disabled:text-stone-400',
  }[variant];
  return <button {...p} className={cx('inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed', styles, className)} />;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      {children(id)}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}

export const inputCls = 'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-teal-700 disabled:bg-stone-100';

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={cx(inputCls, p.className)} />; }
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...p} className={cx(inputCls, p.className)} />; }

const badgeTone: Record<string, string> = {
  SCHEDULED: 'bg-teal-50 text-teal-800 ring-teal-600/20', COMPLETED: 'bg-stone-100 text-stone-700 ring-stone-500/20',
  CANCELLED: 'bg-red-50 text-red-800 ring-red-600/20', ACTIVE: 'bg-teal-50 text-teal-800 ring-teal-600/20',
  FULL: 'bg-amber-50 text-amber-900 ring-amber-600/30', ADMIN: 'bg-violet-50 text-violet-800 ring-violet-600/20',
  MANAGER: 'bg-sky-50 text-sky-800 ring-sky-600/20', STAFF: 'bg-stone-100 text-stone-700 ring-stone-500/20',
  INACTIVE: 'bg-stone-100 text-stone-500 ring-stone-500/20',
};
export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cx('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badgeTone[tone])}>{children}</span>;
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-stone-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-teal-700" />
      {label}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
      <p>{e?.message ?? 'Something went wrong. Please try again.'}</p>
      {e?.details && <ul className="mt-1 list-disc pl-5">{e.details.map((d) => <li key={d}>{d}</li>)}</ul>}
      {onRetry && <button onClick={onRetry} className="mt-2 font-medium underline">Try again</button>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-stone-300 px-6 py-12 text-center">
      <p className="font-medium text-stone-800">{title}</p>
      {children && <div className="mt-1 text-sm text-stone-500">{children}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Seat availability shown as text + a thin bar, never colour alone. */
export function Seats({ taken, capacity, status }: { taken: number; capacity: number; status?: string }) {
  const left = Math.max(capacity - taken, 0);
  const closed = status && status !== 'SCHEDULED';
  return (
    <div className="min-w-28">
      <p className="text-sm tabular-nums">
        <span className="font-medium">{left === 0 ? 'Full' : `${left} left`}</span>
        <span className="text-stone-500"> · {taken}/{capacity}</span>
      </p>
      <div className="mt-1 h-1 rounded bg-stone-200" aria-hidden>
        <div className={cx('h-1 rounded', closed ? 'bg-stone-400' : left === 0 ? 'bg-amber-600' : 'bg-teal-700')} style={{ width: `${Math.min((taken / capacity) * 100, 100)}%` }} />
      </div>
    </div>
  );
}
