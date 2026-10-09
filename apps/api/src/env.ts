import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load apps/api/.env regardless of the current working directory.
// Existing environment variables are not overridden.
const file = resolve(__dirname, '../.env');
if (existsSync(file)) {
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let val = line.slice(eq + 1).trim();
    if (/^(".*"|'.*')$/.test(val)) val = val.slice(1, -1);
    else val = val.replace(/\s+#.*$/, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
