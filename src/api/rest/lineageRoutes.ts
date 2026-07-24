import { Router } from 'express';
import { z } from 'zod';
import { LineageEngine } from '../../lineage/LineageEngine.js';
import { EventPublisher } from '../../events/EventPublisher.js';
import { requireRole } from '../middleware/auth.js';
import { ValidationError } from '../../shared/errors.js';


const TraceParamsSchema = z.object({
  maxDepth: z.coerce.number().int().min(1).max(100).optional(),
});

const EventsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  agent_id: z.string().optional(),
  pipeline_id: z.string().optional(),
  event_type: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const DagQuerySchema = z.object({
  maxNodes: z.coerce.number().int().min(1).max(5000).optional(),
});

const NodesQuerySchema = z.object({
  operation: z.string().max(50).optional(),
  tier: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).optional(),
  agent_id: z.string().max(200).optional(),
  pipeline_id: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export function createLineageRoutes(engine: LineageEngine, publisher: EventPublisher): Router {
  const router = Router();

  // GET /lineage/nodes — paginated list of lineage nodes for dashboard browsing.
  router.get('/lineage/nodes',
    requireRole('viewer', 'analyst', 'compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = NodesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ValidationError('Invalid query parameters', { errors: parsed.error.issues });
        }
        const result = await engine.listNodes(parsed.data);
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  // GET /lineage/trace/:outputFieldId — backward trace
  router.get('/lineage/trace/:outputFieldId',
    requireRole('viewer', 'analyst', 'compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = TraceParamsSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ValidationError('Invalid query parameters', { errors: parsed.error.issues });
        }
        const result = await engine.trace(req.params.outputFieldId as string, parsed.data.maxDepth);
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  // GET /lineage/sources/:sourceId/outputs — forward impact
  router.get('/lineage/sources/:sourceId/outputs',
    requireRole('viewer', 'analyst', 'compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const result = await engine.impact(req.params.sourceId as string);
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  // GET /lineage/events — query events by filters
  router.get('/lineage/events',
    requireRole('analyst', 'compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = EventsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ValidationError('Invalid query parameters', { errors: parsed.error.issues });
        }
        const result = await engine.queryEvents(parsed.data);
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  // GET /lineage/dag/:pipelineId — full DAG
  router.get('/lineage/dag/:pipelineId',
    requireRole('viewer', 'analyst', 'admin'),
    async (req, res, next) => {
      try {
        const parsed = DagQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ValidationError('Invalid query parameters', { errors: parsed.error.issues });
        }
        const result = await engine.getDag(req.params.pipelineId as string, parsed.data.maxNodes);
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  // GET /lineage/chain/verify — verify hash chain integrity
  router.get('/lineage/chain/verify',
    requireRole('compliance_officer', 'admin'),
    async (req, res, next) => {
      try {
        const pipelineId = (req.query.pipeline_id ?? undefined) as string | undefined;
        const result = await publisher.verifyChain(pipelineId);
        res.json(result);
      } catch (err) { next(err); }
    }
  );

  return router;
}
