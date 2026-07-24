import pg from 'pg';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('db:pool');

let pool: pg.Pool | null = null;

export function getPool(databaseUrl?: string): pg.Pool {
  if (!pool) {
    const url = databaseUrl ?? process.env['DATABASE_URL'];
    if (!url) {
      throw new Error('DATABASE_URL is required');
    }
    pool = new pg.Pool({
      connectionString: url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected pool error', { error: err.message });
    });

    logger.info('PostgreSQL pool created');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
}
