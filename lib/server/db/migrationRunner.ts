import fs from 'node:fs';
import path from 'node:path';
import { query } from '../config/db';

function resolveMigrationsDir(): string | null {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.resolve(process.cwd(), 'lib/server/db/migrations'),
    path.resolve(process.cwd(), 'client/lib/server/db/migrations'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  return null;
}

export async function runMigrations(): Promise<void> {
  console.log('[db] Checking for migrations...');

  const migrationsDir = resolveMigrationsDir();
  if (!migrationsDir) {
    console.warn('[db] Migrations directory not found in expected locations.');
    return;
  }

  console.log('[db] Using migrations directory:', migrationsDir);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Split by semicolon and filter empty lines to run statements
      // Note: This is a simple split, works for basic migrations without complex functions/procedures
      await query(sql);
      console.log(`[db] Successfully applied migration: ${file}`);
    } catch (error) {
      console.error(`[db] Failed to apply migration ${file}:`, error);
      // We don't exit to allow idempotency to try other files, 
      // but in a real app, you'd want to stop or use a migrations table.
    }
  }
}
