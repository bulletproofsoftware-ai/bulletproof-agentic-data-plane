import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('db:migrate');
const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(databaseUrl?: string): Promise<void> {
  const url = databaseUrl ?? process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    // Create migration tracking table first (always safe due to IF NOT EXISTS)
    const trackingSql = await readFile(
      resolve(__dirname, 'migrations/009_migration_tracking.sql'),
      'utf-8'
    );
    await client.query(trackingSql);

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      'SELECT name FROM _data_plane_migrations ORDER BY id'
    );
    const appliedSet = new Set(applied.map((r: { name: string }) => r.name));

    // Read all migration files
    const migrationsDir = resolve(__dirname, 'migrations');
    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql') && f !== '009_migration_tracking.sql')
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.debug(`Skipping already-applied migration: ${file}`);
        continue;
      }

      const sql = await readFile(resolve(migrationsDir, file), 'utf-8');
      logger.info(`Applying migration: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _data_plane_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info(`Migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Migration failed: ${file}`, {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    logger.info('All migrations applied successfully');
  } finally {
    await client.end();
  }
}

// Run directly if invoked as script
const isMainModule = process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'));

if (isMainModule) {
  runMigrations().catch((err) => {
    logger.error('Migration failed', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  });
}
