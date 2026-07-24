import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type pg from 'pg';
import PDFDocument from 'pdfkit';
import { createLogger } from '../shared/logger.js';
import type {
  ReportArtifact,
  DOIReportParams,
  HIPAAReportParams,
  RateFilingParams,
} from './types.js';
import type { ReportType, ReportFormat } from '../events/types.js';

const logger = createLogger('reports:generator');

const REPORTS_DIR = resolve(process.cwd(), 'reports');

/**
 * Regulatory Report Generator (REQ-039).
 * DOI data lineage, HIPAA PHI audit trail, rate filing quality certification.
 * PDF and JSON output formats.
 */
export class ReportGenerator {
  constructor(private readonly pool: pg.Pool) {}

  /**
   * Generate DOI examination report:
   * - Complete data lineage for policy records
   * - Source-to-output provenance chain
   * - Agent identity for every transformation
   * - Quality scores and trend data
   */
  async generateDOI(params: DOIReportParams, generatedBy: string, format: ReportFormat = 'JSON'): Promise<ReportArtifact> {
    // Gather lineage data
    const lineageEvents = await this.pool.query(
      `SELECT event_id, event_type, pipeline_id, agent_id, session_id, payload, created_at
       FROM lineage_event_chain
       WHERE pipeline_id = $1
         AND ($2::timestamptz IS NULL OR created_at >= $2)
         AND ($3::timestamptz IS NULL OR created_at <= $3)
       ORDER BY created_at ASC`,
      [params.pipeline_id, params.date_range?.from ?? null, params.date_range?.to ?? null]
    );

    // Gather quality scores
    const qualityScores = await this.pool.query(
      `SELECT * FROM quality_scores
       WHERE pipeline_id = $1
       ORDER BY scored_at DESC LIMIT 30`,
      [params.pipeline_id]
    );

    const reportData = {
      report_type: 'DOI' as const,
      generated_at: new Date().toISOString(),
      generated_by: generatedBy,
      pipeline_id: params.pipeline_id,
      policy_id: params.policy_id ?? null,
      date_range: params.date_range ?? null,
      sections: [
        {
          title: 'Data Lineage Summary',
          total_events: lineageEvents.rows.length,
          event_types: this.countByField(lineageEvents.rows, 'event_type'),
          agents_involved: [...new Set(lineageEvents.rows.map(r => r.agent_id))],
        },
        {
          title: 'Provenance Chain',
          events: lineageEvents.rows.map(r => ({
            event_id: r.event_id,
            type: r.event_type,
            agent: r.agent_id,
            session: r.session_id,
            timestamp: r.created_at,
            payload_summary: this.summarizePayload(r.payload),
          })),
        },
        {
          title: 'Quality Scores',
          scores: qualityScores.rows.map(r => ({
            scored_at: r.scored_at,
            total: r.total_score,
            completeness: r.completeness,
            accuracy: r.accuracy,
            consistency: r.consistency,
            timeliness: r.timeliness,
            blocked: r.blocked,
          })),
        },
      ],
    };

    return this.saveReport('DOI', params.pipeline_id, params.policy_id ?? null, format, reportData, generatedBy);
  }

  /**
   * Generate HIPAA audit trail report:
   * - All PHI handling events
   * - Classification decisions with confidence scores
   * - Access log for restricted data
   * - Masking verification results
   */
  async generateHIPAA(params: HIPAAReportParams, generatedBy: string, format: ReportFormat = 'JSON'): Promise<ReportArtifact> {
    // PHI classifications
    const phiRecords = await this.pool.query(
      `SELECT * FROM classification_records
       WHERE pipeline_id = $1 AND detected_type IN ('PHI', 'PII')
       ORDER BY detected_at DESC`,
      [params.pipeline_id]
    );

    // PHI-related lineage events
    const phiEvents = await this.pool.query(
      `SELECT * FROM lineage_event_chain
       WHERE pipeline_id = $1
         AND event_type IN ('CLASSIFICATION_DETECTED', 'LINEAGE_DELETE')
         AND ($2::timestamptz IS NULL OR created_at >= $2)
         AND ($3::timestamptz IS NULL OR created_at <= $3)
       ORDER BY created_at ASC`,
      [params.pipeline_id, params.date_range?.from ?? null, params.date_range?.to ?? null]
    );

    const reportData = {
      report_type: 'HIPAA' as const,
      generated_at: new Date().toISOString(),
      generated_by: generatedBy,
      pipeline_id: params.pipeline_id,
      date_range: params.date_range ?? null,
      sections: [
        {
          title: 'PHI Classification Summary',
          total_phi_fields: phiRecords.rows.length,
          by_tier: this.countByField(phiRecords.rows, 'detected_tier'),
          by_type: this.countByField(phiRecords.rows, 'detected_type'),
          needs_review: phiRecords.rows.filter(r => r.status === 'NEEDS_REVIEW').length,
          overrides: phiRecords.rows.filter(r => r.status === 'OVERRIDDEN').map(r => ({
            record_id: r.record_id,
            field: r.field_path,
            original_tier: r.detected_tier,
            officer: r.override_officer,
            rationale: r.override_rationale,
          })),
        },
        {
          title: 'PHI Handling Events',
          events: phiEvents.rows.map(r => ({
            event_id: r.event_id,
            type: r.event_type,
            agent: r.agent_id,
            timestamp: r.created_at,
          })),
        },
        {
          title: 'Classification Details',
          records: phiRecords.rows.map(r => ({
            field: r.field_path,
            tier: r.detected_tier,
            type: r.detected_type,
            classifier: r.classifier_id,
            version: r.classifier_version,
            confidence: parseFloat(r.confidence),
            status: r.status,
            detected_at: r.detected_at,
          })),
        },
      ],
    };

    return this.saveReport('HIPAA', params.pipeline_id, null, format, reportData, generatedBy);
  }

  /**
   * Generate rate filing data quality certification:
   * - Quality scores across all 4 dimensions
   * - Trend data showing score stability
   * - Completeness verification for required fields
   */
  async generateRateFiling(params: RateFilingParams, generatedBy: string, format: ReportFormat = 'JSON'): Promise<ReportArtifact> {
    const qualityScores = await this.pool.query(
      `SELECT * FROM quality_scores
       WHERE pipeline_id = $1
       ORDER BY scored_at DESC LIMIT 90`,
      [params.pipeline_id]
    );

    const latestScore = qualityScores.rows[0];

    // Classification records for NAIC fields
    const naicRecords = await this.pool.query(
      `SELECT * FROM classification_records
       WHERE pipeline_id = $1 AND detected_type = 'NAIC'
       ORDER BY detected_at DESC`,
      [params.pipeline_id]
    );

    const reportData = {
      report_type: 'RATE_FILING' as const,
      generated_at: new Date().toISOString(),
      generated_by: generatedBy,
      pipeline_id: params.pipeline_id,
      dataset_id: params.dataset_id ?? null,
      date_range: params.date_range ?? null,
      certification: {
        passes_quality_gate: latestScore ? !latestScore.blocked : false,
        latest_score: latestScore ? {
          total: latestScore.total_score,
          completeness: latestScore.completeness,
          accuracy: latestScore.accuracy,
          consistency: latestScore.consistency,
          timeliness: latestScore.timeliness,
          threshold: latestScore.blocking_threshold,
        } : null,
      },
      sections: [
        {
          title: 'Quality Score History',
          scores: qualityScores.rows.map(r => ({
            scored_at: r.scored_at,
            total: r.total_score,
            blocked: r.blocked,
          })),
        },
        {
          title: 'NAIC Code Validation',
          total_naic_fields: naicRecords.rows.length,
          validated_fields: naicRecords.rows.filter(r => r.status !== 'NEEDS_REVIEW').length,
          pending_review: naicRecords.rows.filter(r => r.status === 'NEEDS_REVIEW').length,
        },
        {
          title: 'Data Completeness',
          latest_completeness: latestScore?.completeness ?? 0,
          latest_accuracy: latestScore?.accuracy ?? 0,
          max_possible: 250,
        },
      ],
    };

    return this.saveReport('RATE_FILING', params.pipeline_id, null, format, reportData, generatedBy);
  }

  /**
   * Save report to file and database.
   */
  private async saveReport(
    reportType: ReportType,
    pipelineId: string,
    policyId: string | null,
    format: ReportFormat,
    data: Record<string, unknown>,
    generatedBy: string
  ): Promise<ReportArtifact> {
    const reportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = format === 'PDF' ? 'pdf' : 'json';
    const filename = `${reportType.toLowerCase()}-${pipelineId}-${timestamp}.${ext}`;
    const filePath = resolve(REPORTS_DIR, filename);

    // Ensure reports directory exists
    await mkdir(dirname(filePath), { recursive: true });

    let fileContent: Buffer;

    if (format === 'JSON') {
      const jsonStr = JSON.stringify(data, null, 2);
      fileContent = Buffer.from(jsonStr, 'utf-8');
      await writeFile(filePath, jsonStr, 'utf-8');
    } else {
      // PDF generation
      fileContent = await this.generatePDF(data);
      await writeFile(filePath, fileContent);
    }

    const fileHash = createHash('sha256').update(fileContent).digest('hex');

    // Persist to database
    await this.pool.query(
      `INSERT INTO report_artifacts
        (report_id, report_type, pipeline_id, policy_id, format, file_path, file_hash, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [reportId, reportType, pipelineId, policyId, format, filePath, fileHash, generatedBy]
    );

    logger.info('Report generated', {
      reportId,
      reportType,
      format,
      filePath,
    });

    return {
      report_id: reportId,
      report_type: reportType,
      pipeline_id: pipelineId,
      policy_id: policyId,
      format,
      file_path: filePath,
      file_hash: fileHash,
      generated_by: generatedBy,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate PDF from report data.
   */
  private generatePDF(data: Record<string, unknown>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text(`${data.report_type} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${data.generated_at}`, { align: 'center' });
      doc.text(`Generated by: ${data.generated_by}`, { align: 'center' });
      doc.text(`Pipeline: ${data.pipeline_id}`, { align: 'center' });
      doc.moveDown(2);

      // Sections
      const sections = data.sections as Array<Record<string, unknown>> | undefined;
      if (sections) {
        for (const section of sections) {
          doc.fontSize(14).text(section.title as string);
          doc.moveDown(0.5);

          // Render section data as formatted text
          for (const [key, value] of Object.entries(section)) {
            if (key === 'title') continue;
            if (Array.isArray(value)) {
              doc.fontSize(10).text(`${key}: ${value.length} items`);
              // Show first 5 items
              for (const item of value.slice(0, 5)) {
                if (typeof item === 'object') {
                  doc.fontSize(8).text(`  ${JSON.stringify(item).substring(0, 120)}`);
                } else {
                  doc.fontSize(8).text(`  ${String(item)}`);
                }
              }
              if (value.length > 5) {
                doc.fontSize(8).text(`  ... and ${value.length - 5} more`);
              }
            } else if (typeof value === 'object' && value !== null) {
              doc.fontSize(10).text(`${key}:`);
              for (const [k, v] of Object.entries(value)) {
                doc.fontSize(8).text(`  ${k}: ${JSON.stringify(v)}`);
              }
            } else {
              doc.fontSize(10).text(`${key}: ${String(value)}`);
            }
          }
          doc.moveDown();
        }
      }

      // Certification section for rate filing
      if (data.certification) {
        doc.fontSize(14).text('Certification');
        doc.moveDown(0.5);
        const cert = data.certification as Record<string, unknown>;
        for (const [key, value] of Object.entries(cert)) {
          doc.fontSize(10).text(`${key}: ${JSON.stringify(value)}`);
        }
      }

      doc.end();
    });
  }

  private countByField(rows: Record<string, unknown>[], field: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const val = String(row[field] ?? 'unknown');
      counts[val] = (counts[val] ?? 0) + 1;
    }
    return counts;
  }

  private summarizePayload(payload: Record<string, unknown> | string): string {
    const obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const keys = Object.keys(obj);
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
  }
}
