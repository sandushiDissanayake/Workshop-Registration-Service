import '../env';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import { runMigrations } from './migrate';

/** Dev seed. Idempotent: users upserted by email, workshops by code, registrations only added to empty workshops. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  await runMigrations(url);

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@workshops.local').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!dev';
  const devPassword = 'Workshop123!dev';

  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    const upsertUser = async (email: string, name: string, role: string, password: string) => {
      const hash = await bcrypt.hash(password, 12);
      const { rows } = await db.query(
        `INSERT INTO users (email, name, role, password_hash) VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role RETURNING id`,
        [email, name, role, hash],
      );
      return rows[0].id as string;
    };
    await upsertUser(adminEmail, 'Ayesha Admin', 'ADMIN', adminPassword);
    const managerId = await upsertUser('manager@workshops.local', 'Nimal Manager', 'MANAGER', devPassword);
    const staffA = await upsertUser('staff@workshops.local', 'Sanduni Staff', 'STAFF', devPassword);
    const staffB = await upsertUser('desk@workshops.local', 'Kamal Desk', 'STAFF', devPassword);

    const day = 24 * 3600 * 1000;
    const at = (offsetDays: number, hour: number, minutes = 0) => {
      const d = new Date(Date.now() + offsetDays * day);
      d.setUTCHours(hour, minutes, 0, 0);
      return d;
    };
    const workshops: [string, string, string, string, string, Date, number, number, string][] = [
      ['POT-101', 'Wheel Throwing for Beginners', 'Malini Perera', 'Kandy Studio', 'Centre the clay, pull a cylinder, shape a bowl.', at(1, 4), 3, 3, 'SCHEDULED'],
      ['COD-201', 'Intro to Python', 'Ruwan Jayasuriya', 'Colombo Lab', 'Variables, loops and functions with hands-on exercises.', at(2, 5), 3, 20, 'SCHEDULED'],
      ['FIT-110', 'Saturday Morning Circuit', 'Dilani Fernando', 'Galle Hall', 'Low-impact full-body circuit training.', at(3, 1), 2, 15, 'SCHEDULED'],
      ['POT-205', 'Glazing Techniques', 'Malini Perera', 'Kandy Studio', 'Dipping, brushing and layering glazes.', at(6, 4), 3, 8, 'SCHEDULED'],
      ['COD-310', 'Web Basics: HTML & CSS', 'Ruwan Jayasuriya', 'Colombo Lab', 'Build and style your first web page.', at(9, 5), 3, 24, 'SCHEDULED'],
      ['FIT-220', 'Yoga for Desk Workers', 'Dilani Fernando', 'Galle Hall', 'Stretching routines for back and shoulders.', at(12, 2), 1, 18, 'SCHEDULED'],
      ['PHO-120', 'Phone Photography', 'Chamara Silva', 'Colombo Lab', 'Composition and light with the camera you already own.', at(-10, 5), 2, 12, 'COMPLETED'],
      ['COK-130', 'Sri Lankan Curry Basics', 'Nadeesha Bandara', 'Galle Hall', 'Cancelled: instructor unavailable.', at(5, 6), 3, 14, 'CANCELLED'],
    ];
    const ids: Record<string, string> = {};
    for (const [code, title, instructor, location, description, start, hours, capacity, status] of workshops) {
      const end = new Date(start.getTime() + hours * 3600 * 1000);
      const { rows } = await db.query(
        `INSERT INTO workshops (code,title,instructor,location,description,starts_at,ends_at,capacity,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
        [code, title, instructor, location, description, start, end, capacity, status, managerId],
      );
      ids[code] = rows[0].id;
    }

    const people = ['Anura Gunasekara', 'Bhagya Weerasinghe', 'Chathura Madushan', 'Dinithi Rathnayake', 'Eranga Dias', 'Fathima Rizwan', 'Gayan Abeywickrama', 'Hasini Wijesekara'];
    const seedRegs = async (code: string, count: number, cancelFirst = false) => {
      const { rows } = await db.query('SELECT count(*)::int AS n FROM registrations WHERE workshop_id = $1', [ids[code]]);
      if (rows[0].n > 0) return;
      for (let i = 0; i < count; i++) {
        const name = people[i % people.length] + (i >= people.length ? ` ${i}` : '');
        const email = name.toLowerCase().replace(/[^a-z0-9]+/g, '.') + '@example.com';
        const by = i % 2 ? staffA : staffB;
        const r = await db.query(
          `INSERT INTO registrations (workshop_id, attendee_name, attendee_email, registered_by) VALUES ($1,$2,$3,$4) RETURNING id`,
          [ids[code], name, email, by],
        );
        if (cancelFirst && i === 0) {
          await db.query(
            `UPDATE registrations SET status='CANCELLED', cancelled_by=$2, cancelled_at=now(), cancel_reason='Attendee had a schedule clash' WHERE id=$1`,
            [r.rows[0].id, staffA],
          );
        }
      }
    };
    await seedRegs('POT-101', 3);            // full
    await seedRegs('COD-201', 6, true);      // includes one cancelled record
    await seedRegs('FIT-110', 1);            // one seat left
    await seedRegs('PHO-120', 5);
    console.log(`Seed complete.\n  Admin:   ${adminEmail} / ${adminPassword}\n  Manager: manager@workshops.local / ${devPassword}\n  Staff:   staff@workshops.local / ${devPassword}`);
  } finally {
    await db.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
