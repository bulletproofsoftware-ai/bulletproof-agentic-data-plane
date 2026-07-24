import type { LineageEngine } from '../../../lineage/LineageEngine.js';
import type { QualityValidator } from '../../../quality/QualityValidator.js';
import type { QualityTrendTracker } from '../../../quality/QualityTrendTracker.js';
import type { ClassificationEngine } from '../../../classification/ClassificationEngine.js';
import type { PipelineObserver } from '../../../observability/PipelineObserver.js';
import type { DataTier } from '../../../events/types.js';

export interface ResolverContext {
  lineageEngine: LineageEngine;
  qualityValidator: QualityValidator;
  trendTracker: QualityTrendTracker;
  classificationEngine: ClassificationEngine;
  pipelineObserver: PipelineObserver;
  user?: { sub: string; role: string };
}

export function createResolvers() {
  return {
    Query: {
      lineageTrace: async (
        _: unknown,
        args: { outputFieldId: string; maxDepth?: number },
        ctx: ResolverContext
      ) => {
        const result = await ctx.lineageEngine.trace(args.outputFieldId, args.maxDepth);
        return {
          outputFieldId: result.output_field_id,
          path: result.path.map(n => ({
            nodeId: n.node_id,
            operation: n.operation,
            agentId: n.agent_id,
            sessionId: n.session_id,
            transformFn: n.transform_fn,
            schemaHash: n.schema_hash,
            tier: n.tier,
            metadata: n.metadata,
            createdAt: n.created_at,
          })),
          sources: result.sources.map(s => ({
            sourceId: s.source_id,
            sourceType: s.source_type,
            system: s.system,
          })),
          transforms: result.transforms.map(t => ({
            nodeId: t.node_id,
            operation: t.operation,
            agentId: t.agent_id,
          })),
          totalNodes: result.total_nodes,
          totalEdges: result.total_edges,
          durationMs: result.duration_ms,
        };
      },

      lineageDag: async (
        _: unknown,
        args: { pipelineId: string; maxNodes?: number },
        ctx: ResolverContext
      ) => {
        const result = await ctx.lineageEngine.getDag(args.pipelineId, args.maxNodes);
        return {
          pipelineId: result.pipeline_id,
          nodes: result.nodes,
          edges: result.edges,
          totalNodes: result.total_nodes,
          totalEdges: result.total_edges,
        };
      },

      lineageEvents: async (
        _: unknown,
        args: {
          from: string; to: string; agentId?: string;
          pipelineId?: string; eventType?: string; page?: number; limit?: number;
        },
        ctx: ResolverContext
      ) => {
        const result = await ctx.lineageEngine.queryEvents({
          from: args.from,
          to: args.to,
          agent_id: args.agentId,
          pipeline_id: args.pipelineId,
          event_type: args.eventType,
          page: args.page,
          limit: args.limit,
        });
        return {
          events: result.events,
          total: result.total,
          page: result.page,
          limit: result.limit,
          durationMs: result.duration_ms,
        };
      },

      qualityScore: async (
        _: unknown,
        args: { datasetId: string },
        ctx: ResolverContext
      ) => {
        const score = await ctx.qualityValidator.getLatestScore(args.datasetId);
        if (!score) return null;
        return {
          scoreId: score.score_id,
          datasetId: score.dataset_id,
          pipelineId: score.pipeline_id,
          totalScore: score.total_score,
          completeness: score.dimensions.completeness,
          accuracy: score.dimensions.accuracy,
          consistency: score.dimensions.consistency,
          timeliness: score.dimensions.timeliness,
          blocked: score.blocked,
          blockingThreshold: score.blocking_threshold,
          failingChecks: score.failing_checks,
          scoredAt: score.scored_at,
        };
      },

      qualityTrend: async (
        _: unknown,
        args: { datasetId: string; days?: number },
        ctx: ResolverContext
      ) => {
        const trend = await ctx.trendTracker.computeTrend(args.datasetId, args.days);
        return {
          datasetId: trend.dataset_id,
          trend: trend.trend.map(t => ({
            date: t.date,
            avgScore: t.avg_score,
            minScore: t.min_score,
            maxScore: t.max_score,
          })),
          rolling7dAvg: trend.rolling_7d_avg,
          rolling30dAvg: trend.rolling_30d_avg,
          trendDirection: trend.trend_direction,
          alert: trend.alert ? {
            alertId: trend.alert.alert_id,
            datasetId: trend.alert.dataset_id,
            pipelineId: trend.alert.pipeline_id,
            alertType: trend.alert.alert_type,
            message: trend.alert.message,
            currentScore: trend.alert.current_score,
            threshold: trend.alert.threshold,
            createdAt: trend.alert.created_at,
          } : null,
        };
      },

      classificationSummary: async (
        _: unknown,
        args: { pipelineId: string },
        ctx: ResolverContext
      ) => {
        const summary = await ctx.classificationEngine.getSummary(args.pipelineId);
        return {
          pipelineId: summary.pipeline_id,
          total: summary.total,
          byTier: {
            public: summary.by_tier.PUBLIC,
            internal: summary.by_tier.INTERNAL,
            confidential: summary.by_tier.CONFIDENTIAL,
            restricted: summary.by_tier.RESTRICTED,
          },
          needsReview: summary.needs_review,
        };
      },

      pendingReviews: async (
        _: unknown,
        args: { limit?: number },
        ctx: ResolverContext
      ) => {
        const reviews = await ctx.classificationEngine.getPendingReviews(args.limit);
        return reviews.map(r => ({
          recordId: r.record_id,
          fieldPath: r.field_path,
          pipelineId: r.pipeline_id,
          detectedTier: r.detected_tier,
          detectedType: r.detected_type,
          classifierId: r.classifier_id,
          classifierVersion: r.classifier_version,
          confidence: r.confidence,
          status: r.status,
          overrideRationale: r.override_rationale,
          overrideOfficer: r.override_officer,
          detectedAt: r.detected_at,
        }));
      },

      pipelineHealth: async (
        _: unknown,
        args: { pipelineId: string },
        ctx: ResolverContext
      ) => {
        const health = await ctx.pipelineObserver.getHealth(args.pipelineId);
        return {
          pipelineId: health.pipeline_id,
          status: health.status,
          anomalies: health.anomalies.map(a => ({
            anomalyId: a.anomaly_id,
            pipelineId: a.pipeline_id,
            anomalyType: a.anomaly_type,
            severity: a.severity,
            expectedValue: String(a.expected_value),
            actualValue: String(a.actual_value),
            affectedFields: a.affected_fields,
            detectedAt: a.detected_at,
          })),
          lastRun: health.last_run,
          baselines: health.baselines ? {
            volume: health.baselines.volume ? {
              value: health.baselines.volume.expected,
              sigma: health.baselines.volume.sigma,
            } : null,
            nullRate: health.baselines.null_rate ? {
              value: health.baselines.null_rate.avg,
              sigma: 0,
            } : null,
            slaMs: health.baselines.sla_ms ? {
              value: health.baselines.sla_ms.max,
              sigma: 0,
            } : null,
          } : null,
        };
      },
    },

    Mutation: {
      overrideClassification: async (
        _: unknown,
        args: { input: { recordId: string; newTier: DataTier; rationale: string; officerToken: string } },
        ctx: ResolverContext
      ) => {
        const result = await ctx.classificationEngine.override(
          args.input.recordId,
          args.input.newTier,
          args.input.rationale,
          ctx.user?.sub ?? 'unknown'
        );
        return {
          recordId: result.record_id,
          fieldPath: result.field_path,
          pipelineId: result.pipeline_id,
          detectedTier: result.detected_tier,
          detectedType: result.detected_type,
          classifierId: result.classifier_id,
          classifierVersion: result.classifier_version,
          confidence: result.confidence,
          status: result.status,
          overrideRationale: result.override_rationale,
          overrideOfficer: result.override_officer,
          detectedAt: result.detected_at,
        };
      },

      subscribeConsumer: async (
        _: unknown,
        args: { input: { pipelineId: string; consumerId: string; consumerName: string; webhookUrl: string; ackTimeoutMinutes?: number } },
        ctx: ResolverContext
      ) => {
        const sub = await ctx.pipelineObserver.getConsumerNotifier().subscribe(
          args.input.pipelineId,
          args.input.consumerId,
          args.input.consumerName,
          args.input.webhookUrl,
          args.input.ackTimeoutMinutes
        );
        return {
          subscriptionId: sub.subscription_id,
          pipelineId: sub.pipeline_id,
          consumerId: sub.consumer_id,
          consumerName: sub.consumer_name,
          webhookUrl: sub.webhook_url,
          active: sub.active,
        };
      },
    },
  };
}
