import { Pool, type PoolConfig } from 'pg';
import dns from 'node:dns';
import { env } from './env';

dns.setDefaultResultOrder('ipv4first');

function decodeAuthComponent(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const dbUrl = new URL(env.DATABASE_URL);

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  user: decodeAuthComponent(dbUrl.username),
  password: decodeAuthComponent(dbUrl.password),
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
};

export const pool = new Pool(poolConfig);

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
