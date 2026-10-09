'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeFor, useAuth } from '@/lib/auth';
import { Role } from '@/lib/api';
import { Avatar, Badge, Button, cx, Spinner, titleCase } from './ui';
import { BrandMark } from './Brand';

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

  if (loading || !user) return <Spinner fill label="Loading your workspace…" />;
  const links = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:gap-8 md:px-8">
          <Link href={homeFor(user)} className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Workshop Desk home">
            <BrandMark />
            <span className="text-[0.9375rem] font-semibold tracking-tight text-ink-900">Workshop Desk</span>
          </Link>

          <nav className="hidden h-full items-stretch gap-1 md:flex" aria-label="Main">
            {links.map((l) => <NavLink key={l.href} href={l.href} active={path.startsWith(l.href)}>{l.label}</NavLink>)}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <Avatar name={user.name} />
              <div className="min-w-0 leading-tight">
                <p className="max-w-40 truncate text-sm font-medium text-ink-900">{user.name}</p>
                <p className="max-w-40 truncate text-xs text-ink-500">{user.email}</p>
              </div>
              <Badge tone={user.role}>{titleCase(user.role)}</Badge>
            </div>
            <span className="text-xs font-medium text-ink-600 sm:hidden">{titleCase(user.role)}</span>
            <Button variant="secondary" size="sm" onClick={logout}><span>Sign out</span></Button>
          </div>
        </div>
        {links.length > 1 && (
          <nav className="flex gap-1 overflow-x-auto border-t border-ink-100 px-3 md:hidden" aria-label="Main">
            {links.map((l) => <NavLink key={l.href} href={l.href} active={path.startsWith(l.href)} compact>{l.label}</NavLink>)}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 outline-none md:px-8 md:py-10">{children}</main>
    </div>
  );
}

function NavLink({ href, active, compact, children }: { href: string; active: boolean; compact?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={cx('relative flex items-center whitespace-nowrap px-3 text-sm font-medium transition-colors', compact ? 'h-11' : 'rounded-md',
        active ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900',
        'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
        active ? 'after:bg-marigold-400' : 'after:bg-transparent hover:after:bg-ink-200')}>
      {children}
    </Link>
  );
}
