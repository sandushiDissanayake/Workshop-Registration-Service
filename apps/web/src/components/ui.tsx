'use client';
import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { ApiError } from '@/lib/api';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ---------- Icons (inline, decorative by default) ---------- */
type IconName = 'calendar' | 'pin' | 'user' | 'search' | 'plus' | 'arrow-left' | 'x' | 'check' | 'alert' | 'clock' | 'eye' | 'eye-off' | 'logout' | 'edit' | 'users' | 'list' | 'chevron-left' | 'chevron-right' | 'info';
const PATHS: Record<IconName, React.ReactNode> = {
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" /></>,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M2.8 19.5c.7-3.2 3.1-4.8 6.2-4.8s5.5 1.6 6.2 4.8M16 5.6a3.2 3.2 0 0 1 0 5.8M18.2 14.9c1.7.6 2.7 2 3 4.1" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  'arrow-left': <path d="M19 12H5m6-6-6 6 6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4.5M12 17.4v.1" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.1" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  'eye-off': <><path d="M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.2 3.9M6.1 7.7A15.5 15.5 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.7-.3 3.8-.8M10.2 10.2a2.8 2.8 0 0 0 3.6 3.6" /></>,
  logout: <path d="M9 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H9M15 8l4 4-4 4M19 12H9.5" />,
  edit: <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Zm9-13 3 3" />,
  list: <path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" />,
  'chevron-left': <path d="m14.5 6-6 6 6 6" />,
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
};
export function Icon({ name, className = 'h-4 w-4', label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className={cx('shrink-0', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>{PATHS[name]}</svg>
  );
}

/* ---------- Buttons ---------- */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
export const buttonCls = (variant: Variant = 'primary', size: 'md' | 'sm' = 'md', extra?: string) => cx(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,box-shadow,color,border-color] duration-150 disabled:cursor-not-allowed',
  size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-[0.8125rem]',
  {
    primary: 'bg-navy-700 text-white shadow-card hover:bg-navy-800 active:bg-navy-900 disabled:bg-navy-700/45',
    secondary: 'border border-ink-300 bg-white text-ink-900 shadow-card hover:border-ink-400 hover:bg-ink-50 active:bg-ink-100 disabled:border-ink-200 disabled:text-ink-400 disabled:shadow-none disabled:hover:bg-white',
    danger: 'bg-danger-700 text-white shadow-card hover:bg-[#9a1c12] active:bg-[#86170f] disabled:bg-danger-700/45',
    ghost: 'text-ink-700 hover:bg-ink-100 active:bg-ink-200 disabled:text-ink-400 disabled:hover:bg-transparent',
  }[variant],
  extra,
);

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm' }) {
  return <button type={type} {...p} className={buttonCls(variant, size, className)} />;
}
export function LinkButton({ href, variant = 'primary', size = 'md', className, children }: { href: string; variant?: Variant; size?: 'md' | 'sm'; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={buttonCls(variant, size, className)}>{children}</Link>;
}

/* ---------- Form controls ---------- */
export interface FieldAria { 'aria-invalid'?: true; 'aria-describedby'?: string }
export function Field({ label, error, hint, optional, children }: { label: string; error?: string; hint?: string; optional?: boolean; children: (id: string, aria: FieldAria) => React.ReactNode }) {
  const id = useId();
  const noteId = `${id}-note`;
  const aria: FieldAria = { ...(error ? { 'aria-invalid': true as const } : {}), ...(error || hint ? { 'aria-describedby': noteId } : {}) };
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-ink-900">
        <span>{label}</span>{optional && <span className="text-xs font-normal text-ink-500">Optional</span>}
      </label>
      {children(id, aria)}
      {error ? <p id={noteId} className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] text-danger-700" role="alert"><Icon name="alert" className="mt-0.5 h-3.5 w-3.5" />{error}</p>
        : hint ? <p id={noteId} className="mt-1.5 text-[0.8125rem] text-ink-500">{hint}</p> : null}
    </div>
  );
}

export const inputCls = 'block h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 shadow-card transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-navy-600 aria-[invalid=true]:border-danger-600 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500 disabled:shadow-none';

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={cx(inputCls, p.className)} />; }
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={cx(inputCls, 'h-auto min-h-24 py-2.5 leading-relaxed', p.className)} />; }
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...p} className={cx(inputCls, 'appearance-none pr-9', p.className)} />
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 8 5 5 5-5" /></svg>
    </div>
  );
}
export function SearchInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
      <input type="search" {...p} className={cx(inputCls, 'pl-9 [&::-webkit-search-cancel-button]:cursor-pointer', p.className)} />
    </div>
  );
}
export function FilterLabel({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cx('block min-w-0', className)}><span className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700">{label}</span>{children}</label>;
}

/* ---------- Badges ---------- */
const badgeTone: Record<string, { box: string; dot: string }> = {
  SCHEDULED: { box: 'bg-navy-50 text-navy-800 ring-navy-200', dot: 'bg-navy-600' },
  COMPLETED: { box: 'bg-ink-100 text-ink-700 ring-ink-200', dot: 'bg-ink-400' },
  CANCELLED: { box: 'bg-danger-50 text-danger-700 ring-danger-100', dot: 'bg-danger-600' },
  ACTIVE: { box: 'bg-ok-50 text-ok-700 ring-ok-100', dot: 'bg-ok-700' },
  FULL: { box: 'bg-marigold-100 text-marigold-800 ring-marigold-400/40', dot: 'bg-marigold-600' },
  ADMIN: { box: 'bg-violet-50 text-violet-800 ring-violet-200', dot: 'bg-violet-600' },
  MANAGER: { box: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-600' },
  STAFF: { box: 'bg-ink-100 text-ink-700 ring-ink-200', dot: 'bg-ink-400' },
  INACTIVE: { box: 'bg-ink-100 text-ink-500 ring-ink-200', dot: 'bg-ink-300' },
};
/** Status is always conveyed by the word and a dot, never colour alone. */
export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const t = badgeTone[tone] ?? badgeTone.COMPLETED;
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', t.box)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden />{children}
    </span>
  );
}
export const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/* ---------- Feedback ---------- */
export function Spinner({ label = 'Loading…', fill }: { label?: string; fill?: boolean }) {
  return (
    <div className={cx('flex items-center justify-center gap-2.5 text-sm text-ink-500', fill ? 'min-h-screen' : 'py-16')} role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-navy-700" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : null;
  return (
    <div className="flex gap-3 rounded-lg border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
      <Icon name="alert" className="mt-0.5 h-4 w-4" />
      <div className="min-w-0">
        <p className="font-medium">{e?.message ?? 'Something went wrong. Please try again.'}</p>
        {e?.details && <ul className="mt-1 list-disc pl-5">{e.details.map((d) => <li key={d}>{d}</li>)}</ul>}
        {onRetry && <button type="button" onClick={onRetry} className="mt-1.5 font-medium underline underline-offset-2 hover:no-underline">Try again</button>}
      </div>
    </div>
  );
}

export function SuccessNote({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-2 rounded-lg border border-ok-100 bg-ok-50 px-3.5 py-2.5 text-sm font-medium text-ok-700 animate-fade" role="status"><Icon name="check" className="h-4 w-4" />{children}</p>;
}

export function EmptyState({ title, children, icon = 'list' }: { title: string; children?: React.ReactNode; icon?: IconName }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-white/60 px-6 py-14 text-center">
      <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-ink-500"><Icon name={icon} className="h-5 w-5" /></span>
      <p className="font-semibold text-ink-900">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-sm text-ink-600">{children}</div>}
    </div>
  );
}

/* ---------- Layout ---------- */
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLElement>) {
  return <section {...p} className={cx('rounded-xl border border-ink-200 bg-white shadow-card', className)}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold leading-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[0.9375rem] text-ink-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="mb-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-ink-600 hover:text-ink-900"><Icon name="arrow-left" className="h-4 w-4" />{children}</Link>;
}

export function Table({ caption, minWidth = 720, children }: { caption: string; minWidth?: number; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white shadow-card">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th scope="col" className={cx('relative whitespace-nowrap px-4 py-3 text-[0.8125rem] font-semibold text-ink-600', className)}>{children ?? <span className="sr-only">Actions</span>}</th>
);
export const theadCls = 'border-b border-ink-200 bg-ink-50';
export const tbodyCls = 'divide-y divide-ink-100';

/** Calendar-style date block for scanning a list by day. */
export function DateTile({ iso, muted }: { iso: string; muted?: boolean }) {
  const d = new Date(iso);
  return (
    <div className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-lg border text-center leading-none', muted ? 'border-ink-200 bg-ink-50 text-ink-500' : 'border-navy-100 bg-navy-50 text-navy-800')} aria-hidden>
      <div>
        <div className="text-[0.6875rem] font-semibold">{d.toLocaleDateString(undefined, { month: 'short' })}</div>
        <div className="mt-0.5 text-lg font-semibold tabular-nums">{d.getDate()}</div>
      </div>
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-100 text-[0.8125rem] font-semibold text-navy-800', className)} aria-hidden>{initials}</span>;
}

/* ---------- Seats: one segment per seat ---------- */
/** Seat availability as text plus a segmented meter (one block per seat), never colour alone. */
export function Seats({ taken, capacity, status, size = 'md' }: { taken: number; capacity: number; status?: string; size?: 'md' | 'lg' }) {
  const left = Math.max(capacity - taken, 0);
  const closed = !!status && status !== 'SCHEDULED';
  const full = left === 0;
  const fillCls = closed ? 'bg-ink-400' : full ? 'bg-marigold-600' : 'bg-navy-700';
  const h = size === 'lg' ? 'h-3' : 'h-2';
  const segmented = capacity > 0 && capacity <= 40;
  return (
    <div className={size === 'lg' ? 'w-full' : 'w-36'}>
      <p className={cx('tabular-nums', size === 'lg' ? 'text-2xl font-semibold text-ink-900' : 'text-sm')}>
        <span className={cx(size === 'md' && 'font-semibold', !closed && full && 'text-marigold-800')}>{full ? 'Full' : `${left} ${size === 'lg' ? (left === 1 ? 'seat left' : 'seats left') : 'left'}`}</span>
        <span className={cx('font-normal text-ink-500', size === 'lg' ? 'ml-2 text-sm' : 'ml-1')}>{size === 'lg' ? `${taken} of ${capacity} taken` : `${taken}/${capacity}`}</span>
      </p>
      <div className={cx('mt-2 flex gap-[3px]', h)} role="img" aria-label={`${taken} of ${capacity} seats taken`}>
        {segmented
          ? Array.from({ length: capacity }, (_, i) => <span key={i} className={cx('min-w-0 flex-1 rounded-[2px]', i < taken ? fillCls : 'bg-white ring-1 ring-inset ring-ink-300')} />)
          : <span className="relative block w-full overflow-hidden rounded-full bg-ink-200"><span className={cx('absolute inset-y-0 left-0 rounded-full', fillCls)} style={{ width: `${Math.min((taken / Math.max(capacity, 1)) * 100, 100)}%` }} /></span>}
      </div>
    </div>
  );
}

/* ---------- Modal (focus trapped, restores focus, Esc to close) ---------- */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (node.querySelector<HTMLElement>('input,select,textarea') ?? node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);

  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onMouseDown={(e) => e.stopPropagation()}
        className="animate-modal my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-pop outline-none">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="-mr-2 -mt-1 grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"><Icon name="x" className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Small toggle chip for quick filters. */
export function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active}
      className={cx('h-8 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors',
        active ? 'border-navy-700 bg-navy-700 text-white' : 'border-ink-300 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50')}>
      {children}
    </button>
  );
}
