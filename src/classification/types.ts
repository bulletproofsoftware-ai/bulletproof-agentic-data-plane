import type { DataTier, ClassificationStatus } from '../events/types.js';

export interface ClassificationResult {
  field_path: string;
  detected_tier: DataTier;
  detected_type: string;
  sub_type?: string;
  confidence: number;
  classifier_id: string;
  classifier_version: string;
  evidence: string[];
  needs_review: boolean;
  status: ClassificationStatus;
}

export interface ClassificationRecord extends ClassificationResult {
  record_id: string;
  pipeline_id: string | null;
  dataset_id: string | null;
  override_rationale: string | null;
  override_officer: string | null;
  detected_at: string;
}

export interface Classifier {
  classifierId: string;
  version: string;
  classify(fieldPath: string, value: unknown, context?: Record<string, unknown>): ClassificationMatch[];
}

export interface ClassificationMatch {
  detected_type: string;
  sub_type?: string;
  tier: DataTier;
  confidence: number;
  evidence: string[];
}

export interface ClassificationSummary {
  pipeline_id: string;
  total: number;
  by_tier: {
    PUBLIC: number;
    INTERNAL: number;
    CONFIDENTIAL: number;
    RESTRICTED: number;
  };
  needs_review: number;
}
