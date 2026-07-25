import { v4 as uuidv4 } from 'uuid';
import { HmacSigner } from './HmacSigner.js';
import type {
  SignedEvent,
  VerificationResult,
  LineageEventType,
  EventPayload,
} from './types.js';
import { EVENT_TYPE_TO_PG } from './types.js';
import type pg from 'pg';
import { createLogger } from '../shared/logger.js';
import { HashChainIntegrityError } from '../shared/errors.js';

const logger = createLogger('events:hash-chain');

const GENESIS_HASH = 'genesis';

/**
 * Hash-chained event stream for tamper-evident lineage tracking (REQ-024).
 * Each event's content hash feeds into the next event's previous_hash field,
 * creating an append-only chain that detects insertion, deletion, or modification.
 */
export class HashChainedEventStream {
  private previousHash: string = GENESIS_HASH;
  private readonly signer: HmacSigner;
  private initialized = false;

  constructor(
    private readonly pool: pg.Pool,
    serviceKey: string
  ) {
    this.signer = new HmacSigner(serviceKey);
  }

  /**
   * Initialize by loading the last hash from the event chain table.
   * Must be called before signing any events.
   */
  async initialize(): Promise<void> {
    try {
      const result = await this.pool.query(
        `SELECT content_hash FROM lineage_event_chain ORDER BY created_at DESC LIMIT 1`
      );
      if (result.rows.length > 0) {
        this.previousHash = result.rows[0].content_hash;
        logger.info('Hash chain initialized from last event', {
          previousHash: this.previousHash,
        });
      } else {
        this.previousHash = GENESIS_HASH;
        logger.info('Hash chain initialized from genesis');
      }
    } catch (err: unknown) {
      // Distinguish "table doesn't exist" from "connection failed"
      const pgError = err as { code?: string; message?: string };
      const isTableMissing =
        pgError.code === '42P01' || // undefined_table
        (pgError.message ?? '').includes('does not exist');

      if (isTableMissing) {
        // Table not created yet (pre-migration) — safe to start from genesis
        this.previousHash = GENESIS_HASH;
        logger.warn('Event chain table not found, starting from genesis');
      } else {
        // Connection error or other DB failure — fail closed
        logger.error('Failed to initialize hash chain: database unavailable', {
          error: pgError.message ?? String(err),
        });
        throw new Error(
          `HashChainedEventStream initialization failed: cannot reach database (${pgError.code ?? 'unknown'})`
        );
      }
    }
    this.initialized = true;
  }

  /**
   * Create and sign a new governance event, extending the hash chain.
   */
  createSignedEvent(params: {
    eventType: LineageEventType;
    agentId: string;
    sessionId: string;
    agentVersion: string;
    pipelineId: string;
    payload: EventPayload;
  }): SignedEvent {
    if (!this.initialized) {
      throw new Error('HashChainedEventStream must be initialized before use');
    }

    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    // Hash the whole envelope, not just the payload.
    //
    // content_hash previously covered params.payload alone, so event_type,
    // timestamp, pipeline_id and event_id could all be altered in the stored
    // row without breaking either the hash or the HMAC — the chain attested
    // to the payload while leaving the metadata that gives it meaning
    // unprotected. Keys are emitted in a fixed order so the digest is
    // reproducible.
    const canonical = JSON.stringify({
      event_id: eventId,
      event_type: params.eventType,
      pipeline_id: params.pipelineId,
      timestamp,
      payload: params.payload,
    });
    const contentHash = this.signer.sha256(canonical);
    const previousHash = this.previousHash;
    const hmacSignature = this.signer.signEvent(contentHash, previousHash);

    // Advance the chain
    this.previousHash = contentHash;

    return {
      event_id: eventId,
      event_type: params.eventType,
      timestamp,
      content_hash: contentHash,
      previous_hash: previousHash,
      hmac_signature: hmacSignature,
      agent_id: params.agentId,
      session_id: params.sessionId,
      agent_version: params.agentVersion,
      pipeline_id: params.pipelineId,
      payload: params.payload as unknown as Record<string, unknown>,
    };
  }

  /**
   * Persist a signed event to the PostgreSQL event chain table.
   */
  async persistEvent(event: SignedEvent): Promise<void> {
    const pgEventType = EVENT_TYPE_TO_PG[event.event_type];
    await this.pool.query(
      `INSERT INTO lineage_event_chain
        (event_id, event_type, pipeline_id, agent_id, session_id,
         payload, content_hash, previous_hash, hmac_signature, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.event_id,
        pgEventType,
        event.pipeline_id,
        event.agent_id,
        event.session_id,
        JSON.stringify(event.payload),
        event.content_hash,
        event.previous_hash,
        event.hmac_signature,
        event.timestamp,
      ]
    );
  }

  /**
   * Verify the integrity of the hash chain.
   * Walks events in chronological order, checking that each event's
   * previous_hash matches the content_hash of the preceding event,
   * and that the HMAC signature is valid.
   */
  async verify(pipelineId?: string): Promise<VerificationResult> {
    const BATCH_SIZE = 1000;
    const whereClause = pipelineId ? 'WHERE pipeline_id = $1' : '';
    const baseParams = pipelineId ? [pipelineId] : [];

    let expectedPrevious = GENESIS_HASH;
    let offset = 0;

    // Process events in batches to avoid loading entire chain into memory
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const limitParam = baseParams.length + 1;
      const offsetParam = baseParams.length + 2;

      const result = await this.pool.query(
        `SELECT event_id, content_hash, previous_hash, hmac_signature
         FROM lineage_event_chain
         ${whereClause}
         ORDER BY created_at ASC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        [...baseParams, BATCH_SIZE, offset]
      );

      if (result.rows.length === 0) break;

      for (const row of result.rows) {
        if (row.previous_hash !== expectedPrevious) {
          return {
            valid: false,
            breakPoint: row.event_id,
            reason: `previous_hash mismatch: expected ${expectedPrevious}, got ${row.previous_hash}`,
          };
        }

        const validHmac = this.signer.verifyEvent(
          row.content_hash,
          row.previous_hash,
          row.hmac_signature
        );

        if (!validHmac) {
          return {
            valid: false,
            breakPoint: row.event_id,
            reason: 'hmac_mismatch',
          };
        }

        expectedPrevious = row.content_hash;
      }

      // If we got fewer rows than BATCH_SIZE, we've reached the end
      if (result.rows.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    return { valid: true };
  }

  /**
   * Verify and throw on failure.
   */
  async verifyOrThrow(pipelineId?: string): Promise<void> {
    const result = await this.verify(pipelineId);
    if (!result.valid) {
      throw new HashChainIntegrityError(
        result.breakPoint ?? 'unknown',
        result.reason ?? 'unknown'
      );
    }
  }

  getSigner(): HmacSigner {
    return this.signer;
  }
}
