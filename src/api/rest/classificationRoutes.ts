import { Router } from 'express';
import { z } from 'zod';
import { ClassificationEngine } from '../../classification/ClassificationEngine.js';
import { requireRole } from '../middleware/auth.js';
import { ValidationError } from '../../shared/errors.js';
import { DATA_TIERS, type DataTier } from '../../events/types.js';

const OverrideBodySchema = z.object({
  record_id: z.string().uuid(),
  new_tier: z.enum(DATA_TIERS as unknown as [string, ...string[]]),
  rationale: z.string().min(10),
  officer_token: z.string().min(1),
});

export function createClassificationRoutes(engine: ClassificationEngine): Router {
  const router = Router();

  // GET /classification/pipeline/:pipelineId
  router.get('/classification/pipeline/:pipelineId',
    requireRole('analyst', 'compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const [records, summary] = await Promise.all([
          engine.getByPipeline(req.params.pipelineId as string),
          engine.getSummary(req.params.pipelineId as string),
        ]);
        res.json({
          pipeline_id: req.params.pipelineId as string,
          classifications: records,
          summary: summary.by_tier,
          needs_review: summary.needs_review,
        });
      } catch (err) { next(err); }
    }
  );

  // POST /classification/override
  router.post('/classification/override',
    requireRole('compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = OverrideBodySchema.safeParse(req.body);
        if (!parsed.success) {
          throw new ValidationError('Invalid request body', { errors: parsed.error.issues });
        }
        const result = await engine.override(
          parsed.data.record_id,
          parsed.data.new_tier as DataTier,
          parsed.data.rationale,
          req.user?.sub ?? 'unknown'
        );
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  // GET /classification/reviews
  router.get('/classification/reviews',
    requireRole('compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
        const reviews = await engine.getPendingReviews(limit);
        res.json({ reviews, total: reviews.length });
      } catch (err) { next(err); }
    }
  );

  // GET /classification/classifiers
  router.get('/classification/classifiers',
    requireRole('analyst', 'admin'),
    async (_req, res) => {
      const versions = engine.getVersionManager().listVersions();
      res.json({ classifiers: versions });
    }
  );

  return router;
}
