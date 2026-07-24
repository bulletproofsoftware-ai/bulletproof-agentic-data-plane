import Database from 'better-sqlite3';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { createLogger } from '../shared/logger.js';
import type { AuditBusRow, SignedEvent } from './types.js';
import { EVENT_CATEGORY } from './types.js';

const logger = createLogger('events:audit-bus');

// Write buffer for batching (100ms window per SHARED schema spec)
interface BufferedEvent {
  row: AuditBusRow;
  timestamp: number;
}

/**
 * Bridge to the governance audit bus (SQLite WAL).
 * Implements the exact 17-column INSERT from SHARED-audit-bus-schema.md.
 * Uses better-sqlite3 with PRAGMA busy_timeout = 5000 for concurrency.
 * Buffers writes for up to 100ms, then flushes in a single transaction.
 * Falls back to local JSON file if write fails after 5s timeout.
 */
export class AuditBusBridge {
  private db: Database.Database | null = null;
  private insertStmt: Database.Statement | null = null;
  private buffer: BufferedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly fallbackDir: string;

  constructor(
    private readonly dbPath: string,
    private readonly sessionId: string,
    private readonly flushIntervalMs: number = 100
  ) {
    this.fallbackDir = resolve(dirname(dbPath), 'audit-fallback');
  }

  /**
   * Open the SQLite database with WAL mode and busy_timeout.
   */
  open(): void {
    try {
      this.db = new Database(this.dbPath);
      // CRITICAL: busy_timeout = 5000 per SHARED schema spec
      this.db.pragma('busy_timeout = 5000');
      this.db.pragma('journal_mode = WAL');

      // Prepare the 17-column INSERT statement
      this.insertStmt = this.db.prepare(`
        INSERT INTO audit_events (
          event_id, timestamp, audit_session_id, event_type,
          agent_id, manifest_id, manifest_version, manifest_hash,
          trust_level, data_classification, autonomy_depth_remaining,
          tool_name, task_id, target_agent_id, context_hash,
          detail, outcome
        ) VALUES (
          @event_id, @timestamp, @audit_session_id, @event_type,
          @agent_id, @manifest_id, @manifest_version, @manifest_hash,
          @trust_level, @data_classification, @autonomy_depth_remaining,
          @tool_name, @task_id, @target_agent_id, @context_hash,
          @detail, @outcome
        )
      `);

      logger.info('Audit bus bridge opened', { dbPath: this.dbPath });
    } catch (err) {
      logger.error('Failed to open audit bus database', {
        error: err instanceof Error ? err.message : String(err),
        dbPath: this.dbPath,
      });
      // Non-fatal: will fall back to JSON file writes
    }
  }

  /**
   * Convert a signed governance event to an audit bus row and queue it.
   */
  publish(event: SignedEvent, outcome: AuditBusRow['outcome'] = 'info'): void {
    const category = EVENT_CATEGORY[event.event_type];
    const dataClassification = this.extractDataClassification(event);

    const row: AuditBusRow = {
      event_id: event.event_id,
      timestamp: event.timestamp,
      audit_session_id: this.sessionId,
      event_type: event.event_type,
      agent_id: event.agent_id,
      manifest_id: null,
      manifest_version: event.agent_version,
      manifest_hash: event.content_hash,
      trust_level: null,
      data_classification: dataClassification,
      autonomy_depth_remaining: null,
      tool_name: 'data_plane_observability',
      task_id: null,
      target_agent_id: null,
      context_hash: event.hmac_signature,
      detail: JSON.stringify({
        category,
        pipeline_id: event.pipeline_id,
        payload: event.payload,
        content_hash: event.content_hash,
        previous_hash: event.previous_hash,
      }),
      outcome,
    };

    this.buffer.push({ row, timestamp: Date.now() });

    // Start flush timer if not already running
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  /**
   * Flush buffered events to SQLite in a single transaction.
   * Falls back to JSON file on failure.
   */
  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    if (this.db && this.insertStmt) {
      try {
        const insertMany = this.db.transaction((rows: AuditBusRow[]) => {
          for (const row of rows) {
            this.insertStmt!.run(row);
          }
        });
        insertMany(events.map(e => e.row));
        logger.debug(`Flushed ${events.length} events to audit bus`);
      } catch (err) {
        logger.error('Failed to write to audit bus, falling back to JSON', {
          error: err instanceof Error ? err.message : String(err),
          eventCount: events.length,
        });
        this.writeFallback(events.map(e => e.row));
      }
    } else {
      logger.warn('Audit bus not open, writing to fallback');
      this.writeFallback(events.map(e => e.row));
    }
  }

  /**
   * Fallback: write events to local JSON file for later replay.
   */
  private writeFallback(rows: AuditBusRow[]): void {
    try {
      if (!existsSync(this.fallbackDir)) {
        mkdirSync(this.fallbackDir, { recursive: true });
      }
      const filename = `fallback-${Date.now()}.json`;
      const filepath = resolve(this.fallbackDir, filename);
      // Fire and forget — we can't await in a synchronous flush
      writeFile(filepath, JSON.stringify(rows, null, 2)).catch(writeErr => {
        logger.error('Failed to write fallback file', {
          error: writeErr instanceof Error ? writeErr.message : String(writeErr),
        });
      });
    } catch (err) {
      logger.error('Failed to create fallback directory', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Extract data classification from event payload if available.
   */
  private extractDataClassification(event: SignedEvent): string | null {
    const payload = event.payload as Record<string, unknown>;
    if ('detected_tier' in payload && typeof payload.detected_tier === 'string') {
      return payload.detected_tier.toLowerCase();
    }
    if ('tier' in payload && typeof payload.tier === 'string') {
      return payload.tier.toLowerCase();
    }
    return null;
  }

  /**
   * Close the database connection, flushing any remaining events.
   */
  close(): void {
    this.flush();
    if (this.db) {
      this.db.close();
      this.db = null;
      this.insertStmt = null;
      logger.info('Audit bus bridge closed');
    }
  }
}
