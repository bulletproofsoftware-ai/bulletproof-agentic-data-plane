import { Router } from 'express';
import { z } from 'zod';
import { QualityValidator } from '../../quality/QualityValidator.js';
import { QualityTrendTracker } from '../../quality/QualityTrendTracker.js';
import { requireRole } from '../middleware/auth.js';
import { ValidationError } from '../../shared/errors.js';
import type { AgentContext } from '../../events/EventPublisher.js';

const TrendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

const ValidateBodySchema = z.object({
  dataset_id: z.string().min(1),
  pipeline_id: z.string().optional(),
  total_records: z.number().int().min(0),
  total_required_fields: z.number().int().min(0),
  non_null_required_fields: z.number().int().min(0),
  validated_values: z.number().int().min(0),
  total_values: z.number().int().min(0),
  schema_conforming_records: z.number().int().min(0),
  data_age_hours: z.number().min(0),
  sla_hours: z.number().min(0),
  config: z.object({
    blocking_threshold: z.number().int().min(0).max(1000).optional(),
  }).optional(),
});

export function createQualityRoutes(
  validator: QualityValidator,
  trendTracker: QualityTrendTracker
): Router {
  const router = Router();

  // GET /quality/datasets/:datasetId/score
  router.get('/quality/datasets/:datasetId/score',
    requireRole('viewer', 'analyst', 'compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const score = await validator.getLatestScore(req.params.datasetId as string);
        if (!score) {
          res.status(404).json({ error: 'No quality score found for dataset' });
          return;
        }
        res.json(score);
      } catch (err) { next(err); }
    }
  );

  // GET /quality/datasets/:datasetId/trend
  router.get('/quality/datasets/:datasetId/trend',
    requireRole('analyst', 'compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = TrendQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ValidationError('Invalid query parameters', { errors: parsed.error.issues });
        }
        const trend = await trendTracker.computeTrend(req.params.datasetId as string, parsed.data.days);
        res.json(trend);
      } catch (err) { next(err); }
    }
  );

  // POST /quality/validate
  router.post('/quality/validate',
    requireRole('analyst', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = ValidateBodySchema.safeParse(req.body);
        if (!parsed.success) {
          throw new ValidationError('Invalid request body', { errors: parsed.error.issues });
        }

        const agent: AgentContext = {
          agentId: req.user?.sub ?? 'unknown',
          sessionId: `api-${Date.now()}`,
          agentVersion: '1.0.0',
        };

        const score = await validator.score(
          {
            ...parsed.data,
            failing_checks: [],
          },
          agent,
          parsed.data.config
        );
        res.json(score);
      } catch (err) { next(err); }
    }
  );

  // GET /quality/enforce/:datasetId
  router.get('/quality/enforce/:datasetId',
    requireRole('analyst', 'admin'),
    async (req, res, next) => {
      try {
        const result = await validator.enforce(req.params.datasetId as string);
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  return router;
}
