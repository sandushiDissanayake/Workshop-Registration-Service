import '../src/env';
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { runMigrations } from '../src/db/migrate';

const BASE = process.env.DATABASE_URL;
if (!BASE) throw new Error('DATABASE_URL must be loaded before tests start');
const TEST_DB = 'workshop_test';
const TEST_URL = BASE.replace(/\/[^/?]+(\?.*)?$/, `/${TEST_DB}`);
const PW = 'Workshop123!dev';

let app: INestApplication;
let db: Client;
let http: ReturnType<typeof request>;
const tokens: Record<string, string> = {};
const future = (days: number, hours = 0) => new Date(Date.now() + days * 864e5 + hours * 36e5).toISOString();

async function login(email: string) {
  const res = await http.post('/auth/login').send({ email, password: PW }).expect(200);
  return res.body.accessToken as string;
}
const as = (who: 'admin' | 'manager' | 'staff') => ({ Authorization: `Bearer ${tokens[who]}` });

async function newWorkshop(code: string, capacity: number, extra: Record<string, unknown> = {}) {
  const res = await http.post('/workshops').set(as('manager')).send({
    code, title: `Workshop ${code}`, instructor: 'Test Instructor', location: 'Lab',
    startsAt: future(2), endsAt: future(2, 2), capacity, ...extra,
  });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}
const register = (workshopId: string, n: number | string, who: 'manager' | 'staff' = 'staff') =>
  http.post(`/workshops/${workshopId}/registrations`).set(as(who)).send({ attendeeName: `Person ${n}`, attendeeEmail: `p${n}@example.com` });
const activeCount = async (id: string) =>
  (await db.query(`SELECT count(*)::int n FROM registrations WHERE workshop_id=$1 AND status='ACTIVE'`, [id])).rows[0].n as number;

beforeAll(async () => {
  const admin = new Client({ connectionString: BASE.replace(/\/[^/?]+(\?.*)?$/, '/postgres') });
  await admin.connect();
  if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [TEST_DB])).rowCount) await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();
  await runMigrations(TEST_URL);
  db = new Client({ connectionString: TEST_URL });
  await db.connect();
  await db.query('TRUNCATE registrations, workshops, users CASCADE');
  const hash = await bcrypt.hash(PW, 4);
  for (const [email, role] of [['admin@t.local', 'ADMIN'], ['manager@t.local', 'MANAGER'], ['staff@t.local', 'STAFF']]) {
    await db.query('INSERT INTO users (email,name,role,password_hash) VALUES ($1,$2,$3,$4)', [email, email.split('@')[0], role, hash]);
  }
  process.env.DATABASE_URL = TEST_URL;
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication();
  configureApp(app, ['*']);
  await app.listen(0);
  http = request(app.getHttpServer());
  tokens.admin = await login('admin@t.local');
  tokens.manager = await login('manager@t.local');
  tokens.staff = await login('staff@t.local');
});

afterAll(async () => {
  await app?.close();
  await db?.end();
});

describe('authentication & authorization (enforced by the backend)', () => {
  it('rejects unauthenticated requests and bad credentials', async () => {
    await http.get('/workshops').expect(401);
    await http.post('/auth/login').send({ email: 'staff@t.local', password: 'wrong-password' }).expect(401);
  });

  it('has no public signup', async () => {
    await http.post('/users').send({ email: 'x@t.local', name: 'X', role: 'ADMIN', password: 'Password123!' }).expect(401);
    await http.post('/auth/register').send({}).expect(404);
  });

  it('only Admin manages users', async () => {
    const body = { email: 'new.staff@t.local', name: 'New Staff', role: 'STAFF', password: 'Password123!' };
    await http.post('/users').set(as('manager')).send(body).expect(403);
    await http.post('/users').set(as('staff')).send(body).expect(403);
    await http.get('/users').set(as('staff')).expect(403);
    const created = await http.post('/users').set(as('admin')).send(body).expect(201);
    expect(created.body).not.toHaveProperty('passwordHash');
    await http.post('/users').set(as('admin')).send(body).expect(409);
    await http.post('/auth/login').send({ email: body.email, password: body.password }).expect(200);
  });

  it('Admin cannot touch workshops or registrations; Staff cannot create/edit workshops', async () => {
    const w = { code: 'PERM-1', title: 'T', instructor: 'I', location: 'L', startsAt: future(2), endsAt: future(2, 2), capacity: 5 };
    await http.post('/workshops').set(as('admin')).send(w).expect(403);
    await http.post('/workshops').set(as('staff')).send(w).expect(403);
    const created = await http.post('/workshops').set(as('manager')).send(w).expect(201);
    await http.patch(`/workshops/${created.body.id}`).set(as('staff')).send({ title: 'Nope' }).expect(403);
    await http.patch(`/workshops/${created.body.id}`).set(as('admin')).send({ title: 'Nope' }).expect(403);
    await http.get('/workshops').set(as('admin')).expect(403);
    await http.get('/registrations').set(as('admin')).expect(403);
    await http.post(`/workshops/${created.body.id}/registrations`).set(as('admin')).send({ attendeeName: 'A', attendeeEmail: 'a@x.com' }).expect(403);
    await http.get('/workshops').set(as('staff')).expect(200);
    await http.get('/registrations').set(as('manager')).expect(200);
  });

  it('a disabled account is locked out immediately, and the last Admin cannot be removed', async () => {
    const me = await http.get('/auth/me').set(as('admin')).expect(200);
    await http.patch(`/users/${me.body.id}`).set(as('admin')).send({ isActive: false }).expect(400);
    await http.patch(`/users/${me.body.id}`).set(as('admin')).send({ role: 'STAFF' }).expect(400);
    const u = await http.post('/users').set(as('admin')).send({ email: 'temp@t.local', name: 'Temp', role: 'STAFF', password: 'Password123!' }).expect(201);
    const t = (await http.post('/auth/login').send({ email: 'temp@t.local', password: 'Password123!' }).expect(200)).body.accessToken;
    await http.patch(`/users/${u.body.id}`).set(as('admin')).send({ isActive: false }).expect(200);
    await http.get('/workshops').set('Authorization', `Bearer ${t}`).expect(401);
  });
});

describe('registration lifecycle & history', () => {
  it('registers, rejects duplicates, cancels with actor + timestamp, keeps the record, and frees the seat', async () => {
    const w = await newWorkshop('LIFE-1', 2);
    const r1 = await register(w.id, 1, 'staff').expect(201);
    expect(r1.body.status).toBe('ACTIVE');
    expect(r1.body.registeredBy.name).toBe('staff');
    await register(w.id, 1, 'manager').expect(409).expect((r) => expect(r.body.code).toBe('ALREADY_REGISTERED'));
    await register(w.id, 2, 'manager').expect(201);
    await register(w.id, 3).expect(409).expect((r) => expect(r.body.code).toBe('WORKSHOP_FULL'));

    const cancelled = await http.post(`/registrations/${r1.body.id}/cancel`).set(as('manager')).send({ reason: 'Caller changed mind' }).expect(201);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(cancelled.body.cancelledBy.name).toBe('manager');
    expect(cancelled.body.cancelledAt).toBeTruthy();
    await http.post(`/registrations/${r1.body.id}/cancel`).set(as('staff')).send({}).expect(409);

    // seat freed, and the same person can register again; old record is still there
    expect((await http.get(`/workshops/${w.id}`).set(as('staff')).expect(200)).body.seatsAvailable).toBe(1);
    await register(w.id, 1).expect(201);
    const hist = await http.get(`/workshops/${w.id}/registrations`).set(as('staff')).expect(200);
    expect(hist.body.total).toBe(3);
    expect(hist.body.items.filter((i: any) => i.status === 'CANCELLED')).toHaveLength(1);
    expect((await db.query('SELECT count(*)::int n FROM registrations WHERE id=$1', [r1.body.id])).rows[0].n).toBe(1);
    const all = await http.get('/registrations?status=CANCELLED').set(as('staff')).expect(200);
    expect(all.body.items.some((i: any) => i.id === r1.body.id)).toBe(true);
  });

  it('blocks registration for cancelled workshops and refuses to shrink capacity below active registrations', async () => {
    const w = await newWorkshop('LIFE-2', 3);
    await register(w.id, 'a'); await register(w.id, 'b');
    await http.patch(`/workshops/${w.id}`).set(as('manager')).send({ capacity: 1 }).expect(409).expect((r) => expect(r.body.code).toBe('CAPACITY_BELOW_ACTIVE'));
    await http.patch(`/workshops/${w.id}`).set(as('manager')).send({ capacity: 2 }).expect(200);
    await register(w.id, 'c').expect(409);
    await http.patch(`/workshops/${w.id}`).set(as('manager')).send({ status: 'CANCELLED' }).expect(200);
    await register(w.id, 'd').expect(409).expect((r) => expect(r.body.code).toBe('WORKSHOP_NOT_OPEN'));
  });

  it('validates input', async () => {
    const w = await newWorkshop('LIFE-3', 2);
    await http.post(`/workshops/${w.id}/registrations`).set(as('staff')).send({ attendeeName: '', attendeeEmail: 'not-an-email' }).expect(400);
    await http.post('/workshops').set(as('manager')).send({ code: 'BAD', title: 'x', instructor: 'y', location: 'z', startsAt: future(2, 2), endsAt: future(2), capacity: 5 }).expect(400);
    await http.post('/workshops').set(as('manager')).send({ code: 'LIFE-3', title: 'x', instructor: 'y', location: 'z', startsAt: future(2), endsAt: future(2, 1), capacity: 5 }).expect(409);
    await http.post('/workshops').set(as('manager')).send({ code: 'ZERO', title: 'x', instructor: 'y', location: 'z', startsAt: future(2), endsAt: future(2, 1), capacity: 0 }).expect(400);
  });
});

describe('workshop filtering', () => {
  it('filters by date range, status and seat availability', async () => {
    const full = await newWorkshop('FIL-FULL', 1, { startsAt: future(30), endsAt: future(30, 2) });
    await newWorkshop('FIL-OPEN', 5, { startsAt: future(31), endsAt: future(31, 2) });
    await newWorkshop('FIL-DONE', 5, { startsAt: future(60), endsAt: future(60, 2), status: 'COMPLETED' });
    await register(full.id, 'f1').expect(201);
    const codes = async (qs: string) => (await http.get(`/workshops?${qs}`).set(as('staff')).expect(200)).body.map((w: any) => w.code);

    expect(await codes('availability=available&q=FIL-')).toEqual(['FIL-OPEN']);
    expect(await codes('availability=full&q=FIL-')).toEqual(['FIL-FULL']);
    expect(await codes('status=COMPLETED&q=FIL-')).toEqual(['FIL-DONE']);
    expect(await codes(`q=FIL-&from=${encodeURIComponent(future(29))}&to=${encodeURIComponent(future(32))}`)).toEqual(['FIL-FULL', 'FIL-OPEN']);
    expect(await codes(`q=FIL-&from=${encodeURIComponent(future(50))}`)).toEqual(['FIL-DONE']);
    await http.get('/workshops?status=BOGUS').set(as('staff')).expect(400);
  });
});

describe('capacity can never be exceeded (concurrency)', () => {
  it('40 simultaneous registrations for 5 seats -> exactly 5 succeed', async () => {
    const w = await newWorkshop('CONC-1', 5);
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) => register(w.id, `c${i}`, i % 2 ? 'staff' : 'manager')));
    const ok = results.filter((r) => r.status === 201).length;
    const full = results.filter((r) => r.status === 409 && r.body.code === 'WORKSHOP_FULL').length;
    expect(ok).toBe(5);
    expect(full).toBe(35);
    expect(await activeCount(w.id)).toBe(5);
  });

  it('simultaneous duplicate registrations of the same attendee yield one seat', async () => {
    const w = await newWorkshop('CONC-2', 10);
    const results = await Promise.all(Array.from({ length: 10 }, () => register(w.id, 'same')));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await activeCount(w.id)).toBe(1);
  });

  it('registrations racing with cancellations never push active count past capacity', async () => {
    const w = await newWorkshop('CONC-3', 5);
    const seeded = await Promise.all(Array.from({ length: 5 }, (_, i) => register(w.id, `s${i}`)));
    expect(seeded.every((r) => r.status === 201)).toBe(true);
    // Sample the active count continuously while 5 cancels and 30 new registrations race.
    let max = 0; let sampling = true;
    const sampler = (async () => { while (sampling) { max = Math.max(max, await activeCount(w.id)); } })();
    const cancels = seeded.map((r) => http.post(`/registrations/${r.body.id}/cancel`).set(as('staff')).send({}));
    const regs = Array.from({ length: 30 }, (_, i) => register(w.id, `n${i}`));
    const [cres, rres] = await Promise.all([Promise.all(cancels), Promise.all(regs)]);
    sampling = false; await sampler;
    expect(cres.every((r) => r.status === 201)).toBe(true);
    const okNew = rres.filter((r) => r.status === 201).length;
    expect(okNew).toBeLessThanOrEqual(5);
    expect(max).toBeLessThanOrEqual(5);
    expect(await activeCount(w.id)).toBe(okNew);
    expect((await db.query('SELECT count(*)::int n FROM registrations WHERE workshop_id=$1', [w.id])).rows[0].n).toBe(5 + okNew);
  });
});
