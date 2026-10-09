import '../env';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

/** Minimal forward-only migration runner: applies each .sql file once, in name order. */
export async function runMigrations(databaseUrl: string): Promise<string[]> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    // Serialise concurrent runners.
    await client.query('SELECT pg_advisory_lock(727001)');
    const dir = join(__dirname, 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (done.rowCount) continue;
      await client.query('BEGIN');
      try {
        await client.query(readFileSync(join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    await client.query('SELECT pg_advisory_unlock(727001)');
  } finally {
    await client.end();
  }
  return applied;
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  runMigrations(url)
    .then((a) => console.log(a.length ? `Applied: ${a.join(', ')}` : 'Database already up to date'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
