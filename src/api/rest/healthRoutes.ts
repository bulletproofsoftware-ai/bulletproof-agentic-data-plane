import { Router } from 'express';
import type pg from 'pg';

export function createHealthRoutes(pool: pg.Pool): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    try {
      const { rows } = await pool.query('SELECT 1 AS ok');
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: rows[0]?.ok === 1 ? 'connected' : 'error',
      });
    } catch {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      });
    }
  });

  router.get('/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ready: true });
    } catch {
      res.status(503).json({ ready: false });
    }
  });

  return router;
}
