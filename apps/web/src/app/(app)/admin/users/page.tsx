'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, Role, User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { Avatar, Badge, Button, EmptyState, ErrorBanner, Field, Icon, Input, Modal, PageHeader, Select, Spinner, Table, tbodyCls, theadCls, Th, titleCase } from '@/components/ui';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; user: User } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setUsers(await api<User[]>('/users')); } catch (e) { setError(e); setUsers((u) => u ?? []); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleActive(u: User) {
    setError(null);
    try { await api(`/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } }); await load(); } catch (e) { setError(e); }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Create staff accounts and choose what each person can do. There is no public signup."
        actions={<Button onClick={() => setDialog({ mode: 'create' })}><Icon name="plus" />Add user</Button>} />
      <ErrorBanner error={error} onRetry={load} />
      {!users ? <Spinner label="Loading users…" /> : users.length === 0 && !error ? <EmptyState icon="users" title="No users yet" /> : (
        <div className="mt-4">
          <Table caption="Staff accounts" minWidth={680}>
            <thead className={theadCls}><tr><Th>Name</Th><Th>Role</Th><Th>Status</Th><Th>Created</Th><Th /></tr></thead>
            <tbody className={tbodyCls}>
              {users.map((u) => (
                <tr key={u.id} className={u.isActive ? '' : 'bg-ink-50/70'}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} className={u.isActive ? '' : '!bg-ink-100 !text-ink-500'} />
                      <div className="min-w-0"><p className="font-medium text-ink-900">{u.name}{u.id === me?.id && <span className="ml-1.5 text-xs font-normal text-ink-500">(you)</span>}</p><p className="text-[0.8125rem] text-ink-600">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><Badge tone={u.role}>{titleCase(u.role)}</Badge></td>
                  <td className="px-4 py-3.5"><Badge tone={u.isActive ? 'ACTIVE' : 'INACTIVE'}>{u.isActive ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-ink-700">{u.createdAt && fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDialog({ mode: 'edit', user: u })}>Edit</Button>
                      {u.id !== me?.id && <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>{u.isActive ? 'Disable' : 'Enable'}</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {dialog && <UserDialog dialog={dialog} isSelf={dialog.mode === 'edit' && dialog.user.id === me?.id} onClose={() => setDialog(null)} onDone={async () => { setDialog(null); await load(); }} />}
    </>
  );
}

function UserDialog({ dialog, isSelf, onClose, onDone }: { dialog: { mode: 'create' } | { mode: 'edit'; user: User }; isSelf: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const editing = dialog.mode === 'edit' ? dialog.user : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [role, setRole] = useState<Role>(editing?.role ?? 'STAFF');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if ((!editing || password) && !/^(?=.*[A-Za-z])(?=.*\d).{10,100}$/.test(password)) errs.password = 'At least 10 characters, with a letter and a number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError(null);
    try {
      if (editing) await api(`/users/${editing.id}`, { method: 'PATCH', body: { name: name.trim(), role, ...(password ? { password } : {}) } });
      else await api('/users', { method: 'POST', body: { name: name.trim(), email: email.trim(), role, password } });
      await onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setErrors({ email: 'An account with this email already exists.' });
      else setError(err);
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit user' : 'Add user'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <ErrorBanner error={error} />
        <Field label="Full name" error={errors.name}>{(id, a) => <Input id={id} {...a} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Email" error={errors.email}>{(id, a) => <Input id={id} {...a} type="email" value={email} disabled={!!editing} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Role" hint={isSelf ? 'You cannot change your own role.' : 'Admin manages accounts. Manager manages workshops and registrations. Staff manages registrations.'}>
          {(id, a) => <Select id={id} {...a} value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as Role)}><option value="STAFF">Staff</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></Select>}
        </Field>
        <Field label={editing ? 'New password' : 'Temporary password'} optional={!!editing} error={errors.password} hint={editing ? 'Leave blank to keep the current password.' : undefined}>{(id, a) => <Input id={id} {...a} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</Button>
        </div>
      </form>
    </Modal>
  );
}
