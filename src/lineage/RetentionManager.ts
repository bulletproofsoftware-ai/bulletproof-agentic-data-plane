import type pg from 'pg';
import { createLogger } from '../shared/logger.js';
import { DualAuthRequiredError } from '../shared/errors.js';
import type { DataTier } from '../events/types.js';
import type { RetentionPolicy } from './types.js';

const logger = createLogger('lineage:retention');

/**
 * Retention Manager (REQ-028).
 * Enforces 7-year standard / 10-year Restricted retention policies.
 * Deletion requires dual-authorization for Confidential/Restricted data.
 */
export class RetentionManager {
  constructor(private readonly pool: pg.Pool) {}

  /**
   * Get retention policy for a given data tier.
   */
  async getPolicy(tier: DataTier): Promise<RetentionPolicy | null> {
    const result = await this.pool.query(
      'SELECT policy_id, data_tier, retention_years, requires_dual_auth FROM retention_policies WHERE data_tier = $1',
      [tier]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      policy_id: row.policy_id,
      data_tier: row.data_tier,
      retention_years: row.retention_years,
      requires_dual_auth: row.requires_dual_auth,
    };
  }

  /**
   * Check if data is eligible for deletion based on retention policy.
   * Returns true if the data has exceeded its retention period.
   */
  async isEligibleForDeletion(
    tier: DataTier,
    createdAt: Date
  ): Promise<{ eligible: boolean; reason: string }> {
    const policy = await this.getPolicy(tier);
    if (!policy) {
      return { eligible: false, reason: `No retention policy found for tier: ${tier}` };
    }

    const retentionEndDate = new Date(createdAt);
    retentionEndDate.setFullYear(retentionEndDate.getFullYear() + policy.retention_years);

    const now = new Date();
    if (now < retentionEndDate) {
      const yearsRemaining = (retentionEndDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return {
        eligible: false,
        reason: `Data must be retained until ${retentionEndDate.toISOString()} (${yearsRemaining.toFixed(1)} years remaining)`,
      };
    }

    return { eligible: true, reason: 'Retention period has expired' };
  }

  /**
   * Validate dual-authorization for deletion of Confidential/Restricted data.
   * Both authorizers must be different identities.
   */
  async validateDualAuth(
    tier: DataTier,
    authorizer1: string,
    authorizer2?: string
  ): Promise<void> {
    const policy = await this.getPolicy(tier);
    if (!policy) {
      throw new Error(`No retention policy found for tier: ${tier}`);
    }

    if (policy.requires_dual_auth) {
      if (!authorizer2) {
        throw new DualAuthRequiredError(
          `Dual authorization required for ${tier} data deletion. Second authorizer not provided.`
        );
      }
      if (authorizer1 === authorizer2) {
        throw new DualAuthRequiredError(
          'Dual authorization requires two different authorizers.'
        );
      }
      logger.info('Dual authorization validated', {
        tier,
        authorizer1,
        authorizer2,
      });
    }
  }

  /**
   * Get all retention policies.
   */
  async getAllPolicies(): Promise<RetentionPolicy[]> {
    const result = await this.pool.query(
      'SELECT policy_id, data_tier, retention_years, requires_dual_auth FROM retention_policies ORDER BY data_tier'
    );
    return result.rows.map(row => ({
      policy_id: row.policy_id,
      data_tier: row.data_tier,
      retention_years: row.retention_years,
      requires_dual_auth: row.requires_dual_auth,
    }));
  }
}
