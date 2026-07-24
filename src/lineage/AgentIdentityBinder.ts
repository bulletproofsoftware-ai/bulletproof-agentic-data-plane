import { createLogger } from '../shared/logger.js';
import type { AgentContext } from '../events/EventPublisher.js';

const logger = createLogger('lineage:identity');

/**
 * Agent Identity Binder (REQ-027).
 * Binds NHI token + session ID to every lineage event.
 * Validates that agent identity is present before allowing event creation.
 */
export class AgentIdentityBinder {
  private currentContext: AgentContext | null = null;

  /**
   * Set the current agent context for this session.
   */
  bind(context: AgentContext): void {
    if (!context.agentId || context.agentId === 'unknown') {
      logger.warn('Agent identity is unknown — events will be tagged but may not be forensically useful');
    }
    this.currentContext = context;
    logger.info('Agent identity bound', {
      agentId: context.agentId,
      sessionId: context.sessionId,
    });
  }

  /**
   * Get the current agent context. Throws if not bound.
   */
  getContext(): AgentContext {
    if (!this.currentContext) {
      throw new Error('Agent identity not bound. Call bind() before creating events.');
    }
    return this.currentContext;
  }

  /**
   * Check if an agent identity is currently bound.
   */
  isBound(): boolean {
    return this.currentContext !== null;
  }

  /**
   * Release the current agent identity binding.
   */
  release(): void {
    if (this.currentContext) {
      logger.info('Agent identity released', {
        agentId: this.currentContext.agentId,
      });
    }
    this.currentContext = null;
  }
}
