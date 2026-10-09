'use client';
import { useRouter } from 'next/navigation';
import { api, Workshop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BackLink, Card, PageHeader } from '@/components/ui';
import { WorkshopForm } from '@/components/WorkshopForm';

export default function NewWorkshopPage() {
  const router = useRouter();
  const { user } = useAuth();
  if (user?.role !== 'MANAGER') {
    return <><BackLink href="/workshops">All workshops</BackLink><p className="text-sm text-ink-600">Only managers can create workshops.</p></>;
  }
  return (
    <>
      <BackLink href="/workshops">All workshops</BackLink>
      <PageHeader title="New workshop" subtitle="Add a workshop to the schedule. Staff can start registering attendees as soon as you save." />
      <Card className="max-w-3xl p-6">
        <WorkshopForm submitLabel="Create workshop" onCancel={() => router.push('/workshops')}
          onSubmit={async (p) => {
            const w = await api<Workshop>('/workshops', { method: 'POST', body: { ...p, description: p.description || undefined } });
            router.push(`/workshops/${w.id}`);
          }} />
      </Card>
    </>
  );
}
