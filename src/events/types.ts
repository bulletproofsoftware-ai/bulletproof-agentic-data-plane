// ─── Lineage Event Types (REQ-026) ───
// Using dotted notation per SHARED-audit-bus-schema.md

export const LINEAGE_EVENT_TYPES = [
  'data.lineage_source',
  'data.lineage_transform',
  'data.lineage_merge',
  'data.lineage_output',
  'data.lineage_delete',
  'data.classification_detected',
  'data.quality_scored',
  'data.pipeline_anomaly',
  'data.reconciliation_completed',
  'data.cost_recorded',
  'compliance.session_init',
  'compliance.gate_decision',
  'compliance.evidence_generated',
  'compliance.dsr_submitted',
  'compliance.incident_opened',
] as const;

export type LineageEventType = typeof LINEAGE_EVENT_TYPES[number];

// Internal enum-style keys for PostgreSQL storage (CHECK constraint)
export const PG_EVENT_TYPES = [
  'LINEAGE_SOURCE',
  'LINEAGE_TRANSFORM',
  'LINEAGE_MERGE',
  'LINEAGE_OUTPUT',
  'LINEAGE_DELETE',
  'CLASSIFICATION_DETECTED',
  'QUALITY_SCORED',
  'PIPELINE_ANOMALY',
  'RECONCILIATION_COMPLETED',
  'COST_RECORDED',
  'SESSION_INIT',
  'GATE_DECISION',
  'EVIDENCE_GENERATED',
  'DSR_SUBMITTED',
  'INCIDENT_OPENED',
] as const;

export type PgEventType = typeof PG_EVENT_TYPES[number];

// Map dotted audit bus names to PG storage names
export const EVENT_TYPE_TO_PG: Record<LineageEventType, PgEventType> = {
  'data.lineage_source': 'LINEAGE_SOURCE',
  'data.lineage_transform': 'LINEAGE_TRANSFORM',
  'data.lineage_merge': 'LINEAGE_MERGE',
  'data.lineage_output': 'LINEAGE_OUTPUT',
  'data.lineage_delete': 'LINEAGE_DELETE',
  'data.classification_detected': 'CLASSIFICATION_DETECTED',
  'data.quality_scored': 'QUALITY_SCORED',
  'data.pipeline_anomaly': 'PIPELINE_ANOMALY',
  'data.reconciliation_completed': 'RECONCILIATION_COMPLETED',
  'data.cost_recorded': 'COST_RECORDED',
  'compliance.session_init': 'SESSION_INIT',
  'compliance.gate_decision': 'GATE_DECISION',
  'compliance.evidence_generated': 'EVIDENCE_GENERATED',
  'compliance.dsr_submitted': 'DSR_SUBMITTED',
  'compliance.incident_opened': 'INCIDENT_OPENED',
};

export const PG_TO_EVENT_TYPE: Record<PgEventType, LineageEventType> = {
  'LINEAGE_SOURCE': 'data.lineage_source',
  'LINEAGE_TRANSFORM': 'data.lineage_transform',
  'LINEAGE_MERGE': 'data.lineage_merge',
  'LINEAGE_OUTPUT': 'data.lineage_output',
  'LINEAGE_DELETE': 'data.lineage_delete',
  'CLASSIFICATION_DETECTED': 'data.classification_detected',
  'QUALITY_SCORED': 'data.quality_scored',
  'PIPELINE_ANOMALY': 'data.pipeline_anomaly',
  'RECONCILIATION_COMPLETED': 'data.reconciliation_completed',
  'COST_RECORDED': 'data.cost_recorded',
  'SESSION_INIT': 'compliance.session_init',
  'GATE_DECISION': 'compliance.gate_decision',
  'EVIDENCE_GENERATED': 'compliance.evidence_generated',
  'DSR_SUBMITTED': 'compliance.dsr_submitted',
  'INCIDENT_OPENED': 'compliance.incident_opened',
};

// Audit bus category mapping
export const EVENT_CATEGORY: Record<LineageEventType, string> = {
  'data.lineage_source': 'data_lineage',
  'data.lineage_transform': 'data_lineage',
  'data.lineage_merge': 'data_lineage',
  'data.lineage_output': 'data_lineage',
  'data.lineage_delete': 'data_lineage',
  'data.classification_detected': 'data_classification',
  'data.quality_scored': 'data_quality',
  'data.pipeline_anomaly': 'pipeline_health',
  'data.reconciliation_completed': 'data_reconciliation',
  'data.cost_recorded': 'agent_economics',
  'compliance.session_init': 'regulatory_compliance',
  'compliance.gate_decision': 'regulatory_compliance',
  'compliance.evidence_generated': 'regulatory_compliance',
  'compliance.dsr_submitted': 'regulatory_compliance',
  'compliance.incident_opened': 'regulatory_compliance',
};

// Data tiers
export const DATA_TIERS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
export type DataTier = typeof DATA_TIERS[number];

// Classification status
export const CLASSIFICATION_STATUSES = ['AUTO', 'NEEDS_REVIEW', 'OVERRIDDEN', 'CONFIRMED'] as const;
export type ClassificationStatus = typeof CLASSIFICATION_STATUSES[number];

// Anomaly types
export const ANOMALY_TYPES = ['SCHEMA_DRIFT', 'VOLUME_ANOMALY', 'NULL_RATE_SPIKE', 'SLA_BREACH'] as const;
export type AnomalyType = typeof ANOMALY_TYPES[number];

// Severity levels
export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Severity = typeof SEVERITIES[number];

// Health status
export const HEALTH_STATUSES = ['HEALTHY', 'DEGRADED', 'UNHEALTHY'] as const;
export type HealthStatus = typeof HEALTH_STATUSES[number];

// Trend direction
export const TREND_DIRECTIONS = ['IMPROVING', 'STABLE', 'DECLINING'] as const;
export type TrendDirection = typeof TREND_DIRECTIONS[number];

// Report types
export const REPORT_TYPES = ['DOI', 'HIPAA', 'RATE_FILING'] as const;
export type ReportType = typeof REPORT_TYPES[number];

// Report formats
export const REPORT_FORMATS = ['PDF', 'JSON'] as const;
export type ReportFormat = typeof REPORT_FORMATS[number];

// ─── Governance Event Envelope ───

export interface GovernanceEvent {
  event_id: string;
  event_type: LineageEventType;
  timestamp: string;
  content_hash: string;
  previous_hash: string;
  hmac_signature: string;
  agent_id: string;
  session_id: string;
  agent_version: string;
  pipeline_id: string;
  payload: Record<string, unknown>;
}

// ─── Audit Bus Row (17-column INSERT) ───

export interface AuditBusRow {
  event_id: string;
  timestamp: string;
  audit_session_id: string;
  event_type: LineageEventType;
  agent_id: string;
  manifest_id: string | null;
  manifest_version: string | null;
  manifest_hash: string | null;
  trust_level: number | null;
  data_classification: string | null;
  autonomy_depth_remaining: number | null;
  tool_name: string;
  task_id: string | null;
  target_agent_id: string | null;
  context_hash: string | null;
  detail: string;  // JSON-stringified payload
  outcome: 'allow' | 'deny' | 'warn' | 'error' | 'info';
}

// ─── Signed Event ───

export interface SignedEvent extends GovernanceEvent {
  content_hash: string;
  previous_hash: string;
  hmac_signature: string;
}

// ─── Verification Result ───

export interface VerificationResult {
  valid: boolean;
  breakPoint?: string;
  reason?: string;
}

// ─── Event Payloads ───

export interface LineageSourcePayload {
  source_id: string;
  source_type: string;
  connector: string;
  schema_hash: string;
  record_count: number;
  tables: string[];
  columns: string[];
  filter_applied?: string;
}

export interface LineageTransformPayload {
  node_id: string;
  operation: string;
  input_ids: string[];
  output_ids: string[];
  transform_fn: string;
  duration_ms: number;
  row_count_in: number;
  row_count_out: number;
}

export interface LineageMergePayload {
  node_id: string;
  input_ids: string[];
  join_keys: string[];
  output_id: string;
  merge_strategy: 'inner' | 'left' | 'right' | 'full' | 'union';
  result_row_count: number;
}

export interface LineageOutputPayload {
  node_id: string;
  destination_type: string;
  destination_id: string;
  tier: string;
  field_map: Record<string, string>;
  consumer_id?: string;
  masking_applied: boolean;
  row_count: number;
}

export interface LineageDeletePayload {
  node_id: string;
  reason: 'compliance_request' | 'retention_expiry' | 'data_subject_request' | 'manual';
  regulation_reference: string;
  authorized_by: string;
  dual_authorized_by?: string;
  deletion_scope: 'record' | 'field' | 'dataset';
  affected_records: number;
}

export interface ClassificationDetectedPayload {
  field_path: string;
  detected_tier: DataTier;
  detected_type: string;
  sub_type?: string;
  confidence: number;
  classifier_id: string;
  classifier_version: string;
  evidence: string[];
  needs_review: boolean;
}

export interface QualityScoredPayload {
  dataset_id: string;
  total_score: number;
  dimensions: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
  blocking_threshold: number;
  blocked: boolean;
  failing_checks: string[];
  trend_direction: 'improving' | 'stable' | 'declining';
}

export interface PipelineAnomalyPayload {
  anomaly_type: string;
  severity: string;
  expected_value: number | string;
  actual_value: number | string;
  affected_fields?: string[];
  affected_consumers: string[];
  notification_sent: boolean;
  details: Record<string, unknown>;
}

export interface ReconciliationCompletedPayload {
  run_id: string;
  pipeline_run_id: string;
  verdict: string;
  total_breaks: number;
  blocking_breaks: number;
  duration_ms: number;
  source_sys: string;
  target_sys: string;
}

export interface CostRecordedPayload {
  record_id: string;
  agent_id: string;
  model_used: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  task_type: string;
  budget_status: string;
}

export interface ComplianceSessionInitPayload {
  session_id: string;
  human_user_id: string;
  purpose: string;
  classification: string;
}

export interface ComplianceGateDecisionPayload {
  gate_id: string;
  gate_type: string;
  decision: string;
}

export interface ComplianceEvidencePayload {
  package_id: string;
  version: number;
  file_count: number;
}

export interface ComplianceDsrPayload {
  request_id: string;
  right_type: string;
  deadline: string;
}

export interface ComplianceIncidentPayload {
  incident_id: string;
  classification: string;
  deadline: string;
}

export type EventPayload =
  | LineageSourcePayload
  | LineageTransformPayload
  | LineageMergePayload
  | LineageOutputPayload
  | LineageDeletePayload
  | ClassificationDetectedPayload
  | QualityScoredPayload
  | PipelineAnomalyPayload
  | ReconciliationCompletedPayload
  | CostRecordedPayload
  | ComplianceSessionInitPayload
  | ComplianceGateDecisionPayload
  | ComplianceEvidencePayload
  | ComplianceDsrPayload
  | ComplianceIncidentPayload;
