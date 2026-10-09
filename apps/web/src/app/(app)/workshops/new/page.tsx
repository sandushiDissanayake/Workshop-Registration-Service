'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Workshop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { WorkshopForm } from '@/components/WorkshopForm';

export default function NewWorkshopPage() {
  const router = useRouter();
  const { user } = useAuth();
  if (user?.role !== 'MANAGER') {
    return <p className="text-sm text-stone-600">Only managers can create workshops. <Link className="underline" href="/workshops">Back to workshops</Link></p>;
  }
  return (
    <>
      <PageHeader title="New workshop" />
      <div className="max-w-3xl rounded-lg border border-stone-200 bg-white p-5">
        <WorkshopForm submitLabel="Create workshop" onCancel={() => router.push('/workshops')}
          onSubmit={async (p) => {
            const w = await api<Workshop>('/workshops', { method: 'POST', body: { ...p, description: p.description || undefined } });
            router.push(`/workshops/${w.id}`);
          }} />
      </div>
    </>
  );
}
