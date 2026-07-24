import type pg from 'pg';
import { HashChainedEventStream } from './HashChainedEventStream.js';
import { AuditBusBridge } from './AuditBusBridge.js';
import type { SignedEvent, LineageEventType, EventPayload, AuditBusRow } from './types.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('events:publisher');

export interface AgentContext {
  agentId: string;
  sessionId: string;
  agentVersion: string;
}

/**
 * Core event publisher for the data plane observability layer (REQ-026).
 * Publishes hash-chained events to both PostgreSQL and the governance audit bus.
 */
export class EventPublisher {
  private readonly hashChain: HashChainedEventStream;
  private readonly auditBridge: AuditBusBridge;

  constructor(
    pool: pg.Pool,
    serviceKey: string,
    auditBusDbPath: string,
    sessionId: string
  ) {
    this.hashChain = new HashChainedEventStream(pool, serviceKey);
    this.auditBridge = new AuditBusBridge(auditBusDbPath, sessionId);
  }

  /**
   * Initialize the publisher: load last hash from PG, open audit bus.
   */
  async initialize(): Promise<void> {
    await this.hashChain.initialize();
    this.auditBridge.open();
    logger.info('Event publisher initialized');
  }

  /**
   * Publish a governance event to both PG (hash chain) and audit bus (SQLite).
   * Returns the signed event for caller reference.
   */
  async publish(params: {
    eventType: LineageEventType;
    pipelineId: string;
    agent: AgentContext;
    payload: EventPayload;
    outcome?: AuditBusRow['outcome'];
  }): Promise<SignedEvent> {
    // Create signed event with hash chain
    const signedEvent = this.hashChain.createSignedEvent({
      eventType: params.eventType,
      agentId: params.agent.agentId,
      sessionId: params.agent.sessionId,
      agentVersion: params.agent.agentVersion,
      pipelineId: params.pipelineId,
      payload: params.payload,
    });

    // Persist to PostgreSQL event chain table
    await this.hashChain.persistEvent(signedEvent);

    // Publish to governance audit bus (SQLite WAL)
    this.auditBridge.publish(signedEvent, params.outcome ?? 'info');

    logger.info('Event published', {
      eventId: signedEvent.event_id,
      eventType: signedEvent.event_type,
      pipelineId: params.pipelineId,
    });

    return signedEvent;
  }

  /**
   * Verify the integrity of the hash chain.
   */
  async verifyChain(pipelineId?: string) {
    return this.hashChain.verify(pipelineId);
  }

  /**
   * Flush any buffered audit bus events and close connections.
   */
  close(): void {
    this.auditBridge.close();
    logger.info('Event publisher closed');
  }

  getHashChain(): HashChainedEventStream {
    return this.hashChain;
  }
}
