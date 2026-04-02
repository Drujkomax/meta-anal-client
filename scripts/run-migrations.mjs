import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const idx = trimmed.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const projectRoot = path.resolve(__dirname, '..');
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const databaseUrl = process.env.DIRECT_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DIRECT_DB_URL or DATABASE_URL is required');
  process.exit(1);
}

function decodeAuthComponent(value) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const migrationsDir = path.resolve(__dirname, '../lib/server/db/migrations');
if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

const files = fs.readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const parsedUrl = new URL(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  user: decodeAuthComponent(parsedUrl.username),
  password: decodeAuthComponent(parsedUrl.password),
  max: 4,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

try {
  await pool.query('SELECT 1');

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    await pool.query(sql);
    console.log(`[db:migrate] Applied: ${file}`);
  }

  console.log('[db:migrate] Done');
} catch (error) {
  console.error('[db:migrate] Failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
