import type { DataTier } from '../events/types.js';

export interface LineageNode {
  node_id: string;
  operation: string;
  agent_id: string;
  session_id: string;
  inputs: string[];
  outputs: string[];
  transform_fn: string | null;
  schema_hash: string | null;
  tier: DataTier | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LineageEdge {
  from_node: string;
  to_node: string;
  field_map: Record<string, string> | null;
  transform_applied: string | null;
}

export interface LineageTraceResult {
  output_field_id: string;
  path: LineageNode[];
  sources: SourceInfo[];
  transforms: TransformInfo[];
  total_nodes: number;
  total_edges: number;
  duration_ms: number;
}

export interface SourceInfo {
  source_id: string;
  source_type: string;
  system: string;
}

export interface TransformInfo {
  node_id: string;
  operation: string;
  agent_id: string;
}

export interface ImpactResult {
  source_id: string;
  outputs: Array<{
    field_id: string;
    dataset: string;
    pipeline: string;
  }>;
  total_outputs: number;
  duration_ms: number;
}

export interface DagResult {
  pipeline_id: string;
  nodes: DagNode[];
  edges: DagEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface DagNode {
  id: string;
  label: string;
  tier: DataTier;
  operation: string;
  agent_id: string | null;
  timestamp: string;
}

export interface DagEdge {
  from: string;
  to: string;
  transform: string | null;
}

export interface LineageQueryFilters {
  from: string;
  to: string;
  agent_id?: string;
  pipeline_id?: string;
  event_type?: string;
  page?: number;
  limit?: number;
}

export interface PurgeScope {
  node_ids?: string[];
  pipeline_id?: string;
  dataset_id?: string;
  scope: 'record' | 'field' | 'dataset';
}

export interface PurgeResult {
  purged_count: number;
  event_id: string;
}

export interface RetentionPolicy {
  policy_id: string;
  data_tier: DataTier;
  retention_years: number;
  requires_dual_auth: boolean;
}
