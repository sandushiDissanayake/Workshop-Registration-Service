'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeFor, useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? homeFor(user) : '/login');
  }, [loading, user, router]);
  return <div className="px-6"><Spinner /></div>;
}
