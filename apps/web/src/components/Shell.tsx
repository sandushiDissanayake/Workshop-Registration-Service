'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeFor, useAuth } from '@/lib/auth';
import { Role } from '@/lib/api';
import { Badge, Spinner } from './ui';

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: '/workshops', label: 'Workshops', roles: ['MANAGER', 'STAFF'] },
  { href: '/history', label: 'Registration history', roles: ['MANAGER', 'STAFF'] },
  { href: '/admin/users', label: 'Users', roles: ['ADMIN'] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  // Keep people out of pages their role cannot use (the backend enforces this too).
  useEffect(() => {
    if (!user) return;
    const allowed = NAV.some((n) => path.startsWith(n.href) && n.roles.includes(user.role));
    if (!allowed) router.replace(homeFor(user));
  }, [user, path, router]);

  if (loading || !user) return <div className="px-6"><Spinner /></div>;
  const links = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-stone-200 bg-white md:fixed md:inset-y-0 md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
          <p className="text-base font-semibold tracking-tight">Workshop Desk</p>
          <div className="md:mt-1 md:text-xs md:text-stone-500"><span className="hidden md:inline">Registration &amp; scheduling</span></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:block md:space-y-1 md:pb-0" aria-label="Main">
          {links.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${active ? 'bg-teal-50 text-teal-900' : 'text-stone-700 hover:bg-stone-100'}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-stone-200 p-4 md:absolute md:bottom-0 md:block md:w-full">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="mb-2 truncate text-xs text-stone-500">{user.email}</p>
          <div className="flex items-center justify-between"><Badge tone={user.role}>{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</Badge>
            <button onClick={logout} className="text-sm font-medium text-stone-700 underline-offset-2 hover:underline">Sign out</button></div>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2 text-xs md:hidden">
          <span className="truncate text-stone-600">{user.name} · {user.role.toLowerCase()}</span>
          <button onClick={logout} className="font-medium underline">Sign out</button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:ml-60 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
