import type { ReportType, ReportFormat } from '../events/types.js';

export interface ReportArtifact {
  report_id: string;
  report_type: ReportType;
  pipeline_id: string | null;
  policy_id: string | null;
  format: ReportFormat;
  file_path: string;
  file_hash: string;
  generated_by: string;
  generated_at: string;
}

export interface DOIReportParams {
  pipeline_id: string;
  policy_id?: string;
  date_range?: { from: string; to: string };
}

export interface HIPAAReportParams {
  pipeline_id: string;
  date_range?: { from: string; to: string };
}

export interface RateFilingParams {
  pipeline_id: string;
  dataset_id?: string;
  date_range?: { from: string; to: string };
}

export interface ReportSection {
  title: string;
  content: string | Record<string, unknown>[];
}
