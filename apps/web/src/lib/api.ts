export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export type WorkshopStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type RegistrationStatus = 'ACTIVE' | 'CANCELLED';

export interface User { id: string; email: string; name: string; role: Role; isActive?: boolean; createdAt?: string }
export interface Workshop {
  id: string; code: string; title: string; instructor: string; description: string | null; location: string;
  startsAt: string; endsAt: string; capacity: number; status: WorkshopStatus;
  activeRegistrations: number; seatsAvailable: number; createdByName: string; updatedAt: string;
}
export interface Registration {
  id: string; workshopId: string; workshopCode: string; workshopTitle: string; workshopStartsAt: string;
  attendeeName: string; attendeeEmail: string; status: RegistrationStatus;
  registeredAt: string; registeredBy: { id: string; name: string };
  cancelledAt: string | null; cancelledBy: { id: string; name: string } | null; cancelReason: string | null;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ws.token';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: string[]) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, data?.message ?? 'Request failed', data?.code, data?.details);
  }
  return data as T;
}

export const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
};
