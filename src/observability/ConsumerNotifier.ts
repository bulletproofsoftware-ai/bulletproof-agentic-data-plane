import type pg from 'pg';
import { createLogger } from '../shared/logger.js';
import type { PipelineAlert, NotificationResult, ConsumerSubscription } from './types.js';

const logger = createLogger('observability:notifier');

/**
 * Consumer Notifier (REQ-033).
 * Sends structured notifications to downstream consumers via webhooks.
 * 3 attempts with exponential backoff.
 * Unacknowledged after TTL escalate to manual review.
 */
export class ConsumerNotifier {
  constructor(private readonly pool: pg.Pool) {}

  /**
   * Get all active consumers for a pipeline.
   */
  async getConsumers(pipelineId: string): Promise<ConsumerSubscription[]> {
    const result = await this.pool.query(
      `SELECT subscription_id, pipeline_id, consumer_id, consumer_name,
              webhook_url, ack_timeout_minutes, active
       FROM consumer_subscriptions
       WHERE pipeline_id = $1 AND active = true`,
      [pipelineId]
    );
    return result.rows;
  }

  /**
   * Notify all downstream consumers about a pipeline alert.
   * Includes: pipeline_id, nature of change, affected fields, timestamp.
   * 3 attempts with exponential backoff.
   */
  async notify(pipelineId: string, alert: PipelineAlert): Promise<NotificationResult[]> {
    const consumers = await this.getConsumers(pipelineId);
    const results: NotificationResult[] = [];

    for (const consumer of consumers) {
      const result = await this.sendWithRetry(consumer, alert);
      results.push(result);
    }

    return results;
  }

  /**
   * Send notification to a single consumer with 3 retries and exponential backoff.
   */
  private async sendWithRetry(
    consumer: ConsumerSubscription,
    alert: PipelineAlert,
    maxAttempts: number = 3
  ): Promise<NotificationResult> {
    const payload = {
      pipeline_id: alert.pipeline_id,
      anomaly_type: alert.anomaly_type,
      severity: alert.severity,
      affected_fields: alert.affected_fields,
      expected_value: alert.expected_value,
      actual_value: alert.actual_value,
      detected_at: alert.detected_at,
      requires_acknowledgment: true,
      ack_timeout_minutes: consumer.ack_timeout_minutes,
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(consumer.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Pipeline-Id': alert.pipeline_id,
            'X-Alert-Type': alert.anomaly_type,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          logger.info('Consumer notified', {
            consumerId: consumer.consumer_id,
            pipelineId: alert.pipeline_id,
            attempt,
          });
          return { consumer_id: consumer.consumer_id, delivered: true, attempts: attempt };
        }

        logger.warn('Consumer notification failed', {
          consumerId: consumer.consumer_id,
          status: response.status,
          attempt,
        });
      } catch (err) {
        logger.warn('Consumer notification error', {
          consumerId: consumer.consumer_id,
          error: err instanceof Error ? err.message : String(err),
          attempt,
        });
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logger.error('Consumer notification failed after all retries', {
      consumerId: consumer.consumer_id,
      pipelineId: alert.pipeline_id,
    });

    return {
      consumer_id: consumer.consumer_id,
      delivered: false,
      attempts: maxAttempts,
      error: 'All retry attempts exhausted',
    };
  }

  /**
   * Register a new downstream consumer.
   */
  async subscribe(
    pipelineId: string,
    consumerId: string,
    consumerName: string,
    webhookUrl: string,
    ackTimeoutMinutes: number = 60
  ): Promise<ConsumerSubscription> {
    const result = await this.pool.query(
      `INSERT INTO consumer_subscriptions
        (pipeline_id, consumer_id, consumer_name, webhook_url, ack_timeout_minutes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (pipeline_id, consumer_id)
       DO UPDATE SET consumer_name = $3, webhook_url = $4, ack_timeout_minutes = $5, active = true
       RETURNING subscription_id, pipeline_id, consumer_id, consumer_name, webhook_url, ack_timeout_minutes, active`,
      [pipelineId, consumerId, consumerName, webhookUrl, ackTimeoutMinutes]
    );
    return result.rows[0];
  }

  /**
   * Unsubscribe a consumer (soft delete).
   */
  async unsubscribe(pipelineId: string, consumerId: string): Promise<void> {
    await this.pool.query(
      `UPDATE consumer_subscriptions SET active = false
       WHERE pipeline_id = $1 AND consumer_id = $2`,
      [pipelineId, consumerId]
    );
  }
}
