// Runs one or more .sql files against DATABASE_URL (backend/.env) inside a
// single transaction — any error rolls everything back.
// Usage: node scripts/run-sql.mjs db/migrations/015_lesson_content.sql [...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(backendDir, '.env'), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
);

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/run-sql.mjs <file.sql> [...]');
  process.exit(1);
}
if (!env.DATABASE_URL || env.DATABASE_URL.includes('YOUR_DB_PASSWORD')) {
  console.error('Set DATABASE_URL in backend/.env first (Supabase > Project Settings > Database).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('begin');
  for (const file of files) {
    await client.query(fs.readFileSync(path.resolve(backendDir, file), 'utf8'));
    console.log(`applied ${file}`);
  }
  await client.query('commit');
} catch (error) {
  await client.query('rollback');
  console.error(`rolled back: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
