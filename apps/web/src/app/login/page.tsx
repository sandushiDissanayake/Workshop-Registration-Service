'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import { Button, ErrorBanner, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm" noValidate>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workshop Desk</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in with the account your administrator created for you.</p>
        </div>
        <ErrorBanner error={error} />
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </main>
  );
}
