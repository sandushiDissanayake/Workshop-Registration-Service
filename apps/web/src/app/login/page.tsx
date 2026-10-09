'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import { Button, ErrorBanner, Field, Icon, Input } from '@/components/ui';
import { BrandMark } from '@/components/Brand';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => { if (!loading && user) router.replace(homeFor(user)); }, [loading, user, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      router.replace(homeFor(await login(email, password)));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? new ApiError(400, 'Enter a valid email address and your password.') : err);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy-800 p-12 text-white lg:flex" aria-hidden>
        <div className="flex items-center gap-3"><BrandMark className="h-9 w-9" /><span className="text-lg font-semibold tracking-tight">Workshop Desk</span></div>
        <div>
          <SeatField />
          <p className="mt-10 max-w-sm text-[2rem] font-semibold leading-[1.15] tracking-tight">Every seat counted. Every change on record.</p>
          <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-navy-200">Register attendees, free up seats and see who did what, all in one place.</p>
        </div>
        <p className="text-xs text-navy-200/80">Community training centre</p>
      </aside>

      <main id="main" className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden"><BrandMark /><span className="text-base font-semibold tracking-tight">Workshop Desk</span></div>
          <h1 className="text-[1.75rem] font-semibold leading-tight">Sign in</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-600">Use the account your administrator created for you.</p>
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <ErrorBanner error={error} />
            <Field label="Email">{(id, a) => <Input id={id} {...a} type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
            <Field label="Password">
              {(id, a) => (
                <div className="relative">
                  <Input id={id} {...a} type={show ? 'text' : 'password'} autoComplete="current-password" required className="pr-11" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                    className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"><Icon name={show ? 'eye-off' : 'eye'} /></button>
                </div>
              )}
            </Field>
            <Button type="submit" className="mt-2 w-full" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <p className="mt-6 text-[0.8125rem] text-ink-500">Forgot your password? Ask an administrator to set a new one.</p>
        </div>
      </main>
    </div>
  );
}

/** Decorative room of seats: most taken, a few free. */
function SeatField() {
  const taken = new Set([0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35]);
  return (
    <div className="grid w-fit grid-cols-6 gap-2">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} className={`h-7 w-7 rounded-md ${i === 35 ? 'bg-marigold-400' : taken.has(i) ? 'bg-white/90' : 'bg-white/15 ring-1 ring-inset ring-white/25'}`} />
      ))}
    </div>
  );
}
