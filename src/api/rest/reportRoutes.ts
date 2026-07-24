import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { ValidationError } from '../../shared/errors.js';
import { REPORT_TYPES, REPORT_FORMATS, type ReportFormat } from '../../events/types.js';
import { ReportGenerator } from '../../reports/ReportGenerator.js';
import type pg from 'pg';

const GenerateReportSchema = z.object({
  report_type: z.enum(REPORT_TYPES as unknown as [string, ...string[]]),
  pipeline_id: z.string().optional(),
  policy_id: z.string().optional(),
  format: z.enum(REPORT_FORMATS as unknown as [string, ...string[]]),
  date_range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }).optional(),
});

export function createReportRoutes(pool: pg.Pool): Router {
  const router = Router();
  const generator = new ReportGenerator(pool);

  // POST /reports/regulatory — generate a regulatory report
  router.post('/reports/regulatory',
    requireRole('compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = GenerateReportSchema.safeParse(req.body);
        if (!parsed.success) {
          throw new ValidationError('Invalid request body', { errors: parsed.error.issues });
        }

        const generatedBy = req.user?.sub ?? 'unknown';
        const format = parsed.data.format as ReportFormat;
        const pipelineId = parsed.data.pipeline_id ?? 'default';

        let result;
        switch (parsed.data.report_type) {
          case 'DOI':
            result = await generator.generateDOI(
              { pipeline_id: pipelineId, policy_id: parsed.data.policy_id, date_range: parsed.data.date_range },
              generatedBy, format
            );
            break;
          case 'HIPAA':
            result = await generator.generateHIPAA(
              { pipeline_id: pipelineId, date_range: parsed.data.date_range },
              generatedBy, format
            );
            break;
          case 'RATE_FILING':
            result = await generator.generateRateFiling(
              { pipeline_id: pipelineId, date_range: parsed.data.date_range },
              generatedBy, format
            );
            break;
        }

        res.json(result);
      } catch (err) { next(err); }
    }
  );

  // GET /reports/:reportId — download a report
  router.get('/reports/:reportId',
    requireRole('compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const result = await pool.query(
          `SELECT * FROM report_artifacts WHERE report_id = $1`,
          [req.params.reportId as string]
        );
        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Report not found' });
          return;
        }
        const report = result.rows[0];
        res.json(report);
      } catch (err) { next(err); }
    }
  );

  // GET /reports — list reports
  router.get('/reports',
    requireRole('compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const result = await pool.query(
          `SELECT * FROM report_artifacts ORDER BY generated_at DESC LIMIT $1`,
          [limit]
        );
        res.json({ reports: result.rows, total: result.rows.length });
      } catch (err) { next(err); }
    }
  );

  return router;
}
