import type pg from 'pg';
import { EventPublisher, type AgentContext } from '../events/EventPublisher.js';
import { AgentIdentityBinder } from './AgentIdentityBinder.js';
import { RetentionManager } from './RetentionManager.js';
import { createLogger } from '../shared/logger.js';
import { NotFoundError } from '../shared/errors.js';
import type {
  LineageNode,
  LineageTraceResult,
  ImpactResult,
  DagResult,
  DagNode,
  DagEdge,
  LineageQueryFilters,
  PurgeScope,
  PurgeResult,
  SourceInfo,
  TransformInfo,
} from './types.js';
import type {
  DataTier,
  LineageSourcePayload,
  LineageTransformPayload,
  LineageMergePayload,
  LineageOutputPayload,
  LineageDeletePayload,
} from '../events/types.js';

const logger = createLogger('lineage:engine');

/**
 * Data Lineage Engine (REQ-024/025/027/028).
 * DAG-based provenance tracking with hash-chained events,
 * agent identity binding, and retention policy enforcement.
 */
export class LineageEngine {
  private readonly identityBinder = new AgentIdentityBinder();
  private readonly retentionManager: RetentionManager;

  constructor(
    private readonly pool: pg.Pool,
    private readonly publisher: EventPublisher
  ) {
    this.retentionManager = new RetentionManager(pool);
  }

  /**
   * Bind agent identity for the current session.
   */
  bindAgent(context: AgentContext): void {
    this.identityBinder.bind(context);
  }

  /**
   * Record a source ingestion event.
   */
  async recordSource(pipelineId: string, payload: LineageSourcePayload): Promise<string> {
    const agent = this.identityBinder.getContext();

    // Insert source node
    const result = await this.pool.query(
      `INSERT INTO lineage_nodes (node_id, operation, agent_id, session_id, tier, metadata, created_at)
       VALUES (gen_random_uuid(), 'source', $1, $2, 'PUBLIC', $3, NOW())
       RETURNING node_id`,
      [agent.agentId, agent.sessionId, JSON.stringify(payload)]
    );

    // If lineage_nodes doesn't exist (not created by existing pipeline), create it
    if (!result.rows[0]) {
      throw new Error('Failed to insert lineage node');
    }

    const nodeId = result.rows[0].node_id;

    // Publish event to hash chain + audit bus
    await this.publisher.publish({
      eventType: 'data.lineage_source',
      pipelineId,
      agent,
      payload: { ...payload, source_id: nodeId },
    });

    return nodeId;
  }

  /**
   * Record a transformation event.
   */
  async recordTransform(pipelineId: string, payload: LineageTransformPayload): Promise<string> {
    const agent = this.identityBinder.getContext();

    // Insert transform node
    const result = await this.pool.query(
      `INSERT INTO lineage_nodes (node_id, operation, agent_id, session_id, transform_fn, metadata, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       RETURNING node_id`,
      [payload.operation, agent.agentId, agent.sessionId, payload.transform_fn, JSON.stringify(payload)]
    );

    const nodeId = result.rows[0].node_id;

    // Create edges from inputs to this node
    for (const inputId of payload.input_ids) {
      await this.pool.query(
        `INSERT INTO lineage_edges (from_node, to_node, transform_applied)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [inputId, nodeId, payload.transform_fn]
      );
    }

    // Create edges from this node to outputs
    for (const outputId of payload.output_ids) {
      await this.pool.query(
        `INSERT INTO lineage_edges (from_node, to_node, transform_applied)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [nodeId, outputId, payload.transform_fn]
      );
    }

    await this.publisher.publish({
      eventType: 'data.lineage_transform',
      pipelineId,
      agent,
      payload: { ...payload, node_id: nodeId },
    });

    return nodeId;
  }

  /**
   * Record a merge event.
   */
  async recordMerge(pipelineId: string, payload: LineageMergePayload): Promise<string> {
    const agent = this.identityBinder.getContext();

    const result = await this.pool.query(
      `INSERT INTO lineage_nodes (node_id, operation, agent_id, session_id, metadata, created_at)
       VALUES (gen_random_uuid(), 'merge', $1, $2, $3, NOW())
       RETURNING node_id`,
      [agent.agentId, agent.sessionId, JSON.stringify(payload)]
    );

    const nodeId = result.rows[0].node_id;

    for (const inputId of payload.input_ids) {
      await this.pool.query(
        `INSERT INTO lineage_edges (from_node, to_node, transform_applied)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [inputId, nodeId, `merge:${payload.merge_strategy}`]
      );
    }

    await this.publisher.publish({
      eventType: 'data.lineage_merge',
      pipelineId,
      agent,
      payload: { ...payload, node_id: nodeId },
    });

    return nodeId;
  }

  /**
   * Record an output event.
   */
  async recordOutput(pipelineId: string, payload: LineageOutputPayload): Promise<void> {
    const agent = this.identityBinder.getContext();

    await this.publisher.publish({
      eventType: 'data.lineage_output',
      pipelineId,
      agent,
      payload,
    });
  }

  /**
   * Trace backward from an output field to all contributing sources (REQ-025).
   * Uses PostgreSQL recursive CTE.
   * SLA: <500ms for up to 10M records in lineage store.
   */
  async trace(outputFieldId: string, maxDepth: number = 50): Promise<LineageTraceResult> {
    const start = performance.now();

    // Check the node exists
    const nodeCheck = await this.pool.query(
      'SELECT node_id FROM lineage_nodes WHERE node_id = $1',
      [outputFieldId]
    );
    if (nodeCheck.rows.length === 0) {
      throw new NotFoundError('LineageNode', outputFieldId);
    }

    // Recursive CTE for backward trace
    const result = await this.pool.query(
      `WITH RECURSIVE lineage_path AS (
        -- Base: start at the output node
        SELECT n.node_id, n.operation, n.agent_id, n.session_id, n.tier,
               n.transform_fn, n.schema_hash, n.metadata, n.created_at,
               e.from_node AS parent_id, e.field_map, e.transform_applied,
               1 AS depth,
               ARRAY[n.node_id::text] AS path
        FROM lineage_nodes n
        LEFT JOIN lineage_edges e ON e.to_node = n.node_id
        WHERE n.node_id = $1

        UNION ALL

        -- Recursive: walk backward through edges
        SELECT p.node_id, p.operation, p.agent_id, p.session_id, p.tier,
               p.transform_fn, p.schema_hash, p.metadata, p.created_at,
               e.from_node, e.field_map, e.transform_applied,
               lp.depth + 1,
               lp.path || p.node_id::text
        FROM lineage_path lp
        JOIN lineage_nodes p ON p.node_id = lp.parent_id
        LEFT JOIN lineage_edges e ON e.to_node = p.node_id
        WHERE lp.depth < $2
          AND NOT p.node_id::text = ANY(lp.path)
      )
      SELECT DISTINCT ON (node_id)
        node_id, operation, agent_id, session_id, tier,
        transform_fn, schema_hash, metadata, created_at, depth
      FROM lineage_path
      ORDER BY node_id, depth ASC`,
      [outputFieldId, maxDepth]
    );

    const durationMs = Math.round(performance.now() - start);

    // Build the trace result
    const nodes: LineageNode[] = result.rows.map(row => ({
      node_id: row.node_id,
      operation: row.operation,
      agent_id: row.agent_id,
      session_id: row.session_id,
      inputs: [],
      outputs: [],
      transform_fn: row.transform_fn,
      schema_hash: row.schema_hash,
      tier: row.tier,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {}),
      created_at: row.created_at?.toISOString?.() ?? row.created_at,
    }));

    const sources: SourceInfo[] = nodes
      .filter(n => n.operation === 'source')
      .map(n => ({
        source_id: n.node_id,
        source_type: (n.metadata as Record<string, string>).source_type ?? 'unknown',
        system: (n.metadata as Record<string, string>).connector ?? 'unknown',
      }));

    const transforms: TransformInfo[] = nodes
      .filter(n => n.operation !== 'source')
      .map(n => ({
        node_id: n.node_id,
        operation: n.operation,
        agent_id: n.agent_id,
      }));

    // Count edges
    const edgeResult = await this.pool.query(
      `SELECT COUNT(*) AS cnt FROM lineage_edges
       WHERE from_node = ANY($1::uuid[]) OR to_node = ANY($1::uuid[])`,
      [nodes.map(n => n.node_id)]
    );

    return {
      output_field_id: outputFieldId,
      path: nodes,
      sources,
      transforms,
      total_nodes: nodes.length,
      total_edges: parseInt(edgeResult.rows[0]?.cnt ?? '0', 10),
      duration_ms: durationMs,
    };
  }

  /**
   * Forward impact analysis: what outputs derive from this source?
   */
  async impact(sourceId: string): Promise<ImpactResult> {
    const start = performance.now();

    const result = await this.pool.query(
      `WITH RECURSIVE forward_path AS (
        SELECT n.node_id, n.operation, n.metadata,
               e.to_node AS child_id,
               1 AS depth,
               ARRAY[n.node_id::text] AS path
        FROM lineage_nodes n
        LEFT JOIN lineage_edges e ON e.from_node = n.node_id
        WHERE n.node_id = $1

        UNION ALL

        SELECT c.node_id, c.operation, c.metadata,
               e.to_node,
               fp.depth + 1,
               fp.path || c.node_id::text
        FROM forward_path fp
        JOIN lineage_nodes c ON c.node_id = fp.child_id
        LEFT JOIN lineage_edges e ON e.from_node = c.node_id
        WHERE fp.depth < 50
          AND NOT c.node_id::text = ANY(fp.path)
      )
      SELECT DISTINCT node_id, operation, metadata
      FROM forward_path
      WHERE operation IN ('output', 'load')`,
      [sourceId]
    );

    const durationMs = Math.round(performance.now() - start);

    const outputs = result.rows.map(row => {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {});
      return {
        field_id: row.node_id,
        dataset: meta.destination_id ?? 'unknown',
        pipeline: meta.pipeline_id ?? 'unknown',
      };
    });

    return {
      source_id: sourceId,
      outputs,
      total_outputs: outputs.length,
      duration_ms: durationMs,
    };
  }

  /**
   * Query lineage events from the hash chain by filters.
   */
  async queryEvents(filters: LineageQueryFilters): Promise<{
    events: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    duration_ms: number;
  }> {
    const start = performance.now();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 500);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['created_at >= $1', 'created_at <= $2'];
    const params: unknown[] = [filters.from, filters.to];
    let paramIdx = 3;

    if (filters.agent_id) {
      conditions.push(`agent_id = $${paramIdx}`);
      params.push(filters.agent_id);
      paramIdx++;
    }
    if (filters.pipeline_id) {
      conditions.push(`pipeline_id = $${paramIdx}`);
      params.push(filters.pipeline_id);
      paramIdx++;
    }
    if (filters.event_type) {
      conditions.push(`event_type = $${paramIdx}`);
      params.push(filters.event_type);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query(
      `SELECT COUNT(*) AS cnt FROM lineage_event_chain WHERE ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await this.pool.query(
      `SELECT event_id, event_type, pipeline_id, agent_id, session_id,
              payload, content_hash, previous_hash, hmac_signature, created_at
       FROM lineage_event_chain
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    const durationMs = Math.round(performance.now() - start);

    return {
      events: dataResult.rows,
      total: parseInt(countResult.rows[0]?.cnt ?? '0', 10),
      page,
      limit,
      duration_ms: durationMs,
    };
  }

  /**
   * List lineage nodes (paginated) for dashboard browsing. Surfaces the raw
   * lineage_nodes graph with optional filters; pipeline_id is read from the node
   * metadata JSONB (metadata->>'pipeline_id'). Read-only — no event emission.
   */
  async listNodes(filters: {
    page?: number;
    limit?: number;
    operation?: string;
    tier?: string;
    agent_id?: string;
    pipeline_id?: string;
  }): Promise<{
    nodes: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    duration_ms: number;
  }> {
    const start = performance.now();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 500);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.operation) {
      conditions.push(`operation = $${paramIdx}`);
      params.push(filters.operation);
      paramIdx++;
    }
    if (filters.tier) {
      conditions.push(`tier = $${paramIdx}`);
      params.push(filters.tier);
      paramIdx++;
    }
    if (filters.agent_id) {
      conditions.push(`agent_id = $${paramIdx}`);
      params.push(filters.agent_id);
      paramIdx++;
    }
    if (filters.pipeline_id) {
      conditions.push(`metadata->>'pipeline_id' = $${paramIdx}`);
      params.push(filters.pipeline_id);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) AS cnt FROM lineage_nodes ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await this.pool.query(
      `SELECT node_id, operation, agent_id, session_id, inputs, outputs,
              transform_fn, schema_hash, tier, metadata, created_at
       FROM lineage_nodes
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    return {
      nodes: dataResult.rows,
      total: parseInt(countResult.rows[0]?.cnt ?? '0', 10),
      page,
      limit,
      duration_ms: Math.round(performance.now() - start),
    };
  }

  /**
   * Get full DAG structure for dashboard rendering.
   */
  async getDag(pipelineId: string, maxNodes: number = 1000): Promise<DagResult> {
    // Get nodes
    const nodesResult = await this.pool.query(
      `SELECT node_id, operation, agent_id, tier, created_at, metadata
       FROM lineage_nodes
       WHERE metadata->>'pipeline_id' = $1
          OR node_id IN (
            SELECT DISTINCT from_node FROM lineage_edges
            UNION
            SELECT DISTINCT to_node FROM lineage_edges
          )
       ORDER BY created_at DESC
       LIMIT $2`,
      [pipelineId, maxNodes]
    );

    const nodeIds = nodesResult.rows.map(r => r.node_id);

    // Get edges between these nodes
    const edgesResult = await this.pool.query(
      `SELECT from_node, to_node, transform_applied
       FROM lineage_edges
       WHERE from_node = ANY($1::uuid[]) AND to_node = ANY($1::uuid[])`,
      [nodeIds]
    );

    const nodes: DagNode[] = nodesResult.rows.map(row => {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {});
      return {
        id: row.node_id,
        label: meta.source_type ?? meta.destination_type ?? row.operation,
        tier: row.tier ?? 'PUBLIC',
        operation: row.operation,
        agent_id: row.agent_id,
        timestamp: row.created_at?.toISOString?.() ?? row.created_at,
      };
    });

    const edges: DagEdge[] = edgesResult.rows.map(row => ({
      from: row.from_node,
      to: row.to_node,
      transform: row.transform_applied,
    }));

    return {
      pipeline_id: pipelineId,
      nodes,
      edges,
      total_nodes: nodes.length,
      total_edges: edges.length,
    };
  }

  /**
   * Delete lineage data with dual-authorization enforcement (REQ-028).
   */
  async purge(
    pipelineId: string,
    scope: PurgeScope,
    authorizer1: string,
    authorizer2: string,
    reason: string,
    regulationRef: string,
    tier: DataTier = 'PUBLIC'
  ): Promise<PurgeResult> {
    // Validate dual-auth for Confidential/Restricted
    await this.retentionManager.validateDualAuth(tier, authorizer1, authorizer2);

    const agent = this.identityBinder.getContext();
    let purgedCount = 0;

    if (scope.node_ids && scope.node_ids.length > 0) {
      // Delete specific nodes
      const deleteResult = await this.pool.query(
        `DELETE FROM lineage_nodes WHERE node_id = ANY($1::uuid[]) RETURNING node_id`,
        [scope.node_ids]
      );
      purgedCount = deleteResult.rowCount ?? 0;

      // Also clean up edges
      await this.pool.query(
        `DELETE FROM lineage_edges WHERE from_node = ANY($1::uuid[]) OR to_node = ANY($1::uuid[])`,
        [scope.node_ids]
      );
    }

    // Publish deletion event
    const deletePayload: LineageDeletePayload = {
      node_id: scope.node_ids?.[0] ?? 'bulk',
      reason: reason as LineageDeletePayload['reason'],
      regulation_reference: regulationRef,
      authorized_by: authorizer1,
      dual_authorized_by: authorizer2,
      deletion_scope: scope.scope,
      affected_records: purgedCount,
    };

    const event = await this.publisher.publish({
      eventType: 'data.lineage_delete',
      pipelineId,
      agent,
      payload: deletePayload,
    });

    logger.info('Lineage data purged', {
      purgedCount,
      scope: scope.scope,
      reason,
    });

    return {
      purged_count: purgedCount,
      event_id: event.event_id,
    };
  }

  getRetentionManager(): RetentionManager {
    return this.retentionManager;
  }

  getIdentityBinder(): AgentIdentityBinder {
    return this.identityBinder;
  }
}
