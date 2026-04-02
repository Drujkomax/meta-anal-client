import { pool } from './config/db';

const globalForInit = globalThis as typeof globalThis & {
  __metaInfrastructureInitPromise?: Promise<void>;
};

async function initializeInfrastructureInternal(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function initializeInfrastructure(): Promise<void> {
  if (!globalForInit.__metaInfrastructureInitPromise) {
    globalForInit.__metaInfrastructureInitPromise = initializeInfrastructureInternal().catch((error) => {
      // Do not cache rejected initialization forever.
      // This allows API requests to recover automatically when DB becomes available.
      globalForInit.__metaInfrastructureInitPromise = undefined;
      throw error;
    });
  }

  return globalForInit.__metaInfrastructureInitPromise;
}
