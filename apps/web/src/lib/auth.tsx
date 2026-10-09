'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setUnauthorizedHandler, tokenStore, User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}
const Ctx = createContext<AuthState | null>(null);

export const homeFor = (u: User) => (u.role === 'ADMIN' ? '/admin/users' : '/workshops');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    api<User>('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
