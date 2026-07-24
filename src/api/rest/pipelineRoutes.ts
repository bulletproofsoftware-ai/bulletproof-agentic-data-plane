import { Router } from 'express';
import { z } from 'zod';
import { PipelineObserver } from '../../observability/PipelineObserver.js';
import { requireRole } from '../middleware/auth.js';
import { ValidationError } from '../../shared/errors.js';

const SubscribeBodySchema = z.object({
  consumer_id: z.string().min(1),
  consumer_name: z.string().min(1),
  webhook_url: z.string().url(),
  ack_timeout_minutes: z.number().int().min(1).optional(),
});

export function createPipelineRoutes(observer: PipelineObserver): Router {
  const router = Router();

  // GET /pipelines/:pipelineId/health
  router.get('/pipelines/:pipelineId/health',
    requireRole('viewer', 'analyst', 'admin'),
    async (req, res, next) => {
      try {
        const health = await observer.getHealth(req.params.pipelineId as string);
        res.json(health);
      } catch (err) { next(err); }
    }
  );

  // GET /pipelines/:pipelineId/consumers
  router.get('/pipelines/:pipelineId/consumers',
    requireRole('analyst', 'admin'),
    async (req, res, next) => {
      try {
        const consumers = await observer.getConsumerNotifier().getConsumers(req.params.pipelineId as string);
        res.json({ pipeline_id: req.params.pipelineId as string, consumers });
      } catch (err) { next(err); }
    }
  );

  // POST /pipelines/:pipelineId/consumers
  router.post('/pipelines/:pipelineId/consumers',
    requireRole('admin'),
    async (req, res, next) => {
      try {
        const parsed = SubscribeBodySchema.safeParse(req.body);
        if (!parsed.success) {
          throw new ValidationError('Invalid request body', { errors: parsed.error.issues });
        }
        const subscription = await observer.getConsumerNotifier().subscribe(
          req.params.pipelineId as string,
          parsed.data.consumer_id,
          parsed.data.consumer_name,
          parsed.data.webhook_url,
          parsed.data.ack_timeout_minutes
        );
        res.status(201).json(subscription);
      } catch (err) { next(err); }
    }
  );

  return router;
}
