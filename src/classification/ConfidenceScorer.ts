import { createLogger } from '../shared/logger.js';
import type { ClassificationMatch, ClassificationResult } from './types.js';
import type { ClassificationStatus, DataTier } from '../events/types.js';

const logger = createLogger('classification:confidence');

/**
 * Confidence Scorer (REQ-036).
 * Computes final confidence score (0.0-1.0) for each classification decision.
 * Below 0.75: flag NEEDS_REVIEW.
 * Above 0.75: auto-enforce.
 */
export class ConfidenceScorer {
  constructor(private readonly minConfidence: number = 0.75) {}

  /**
   * Score a set of matches for a single field and produce the final classification.
   * If multiple classifiers match, takes the highest-tier match with highest confidence.
   */
  score(
    fieldPath: string,
    matches: ClassificationMatch[],
    classifierId: string,
    classifierVersion: string
  ): ClassificationResult | null {
    if (matches.length === 0) return null;

    // Sort by tier severity (RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC)
    // then by confidence descending
    const tierOrder: Record<DataTier, number> = {
      RESTRICTED: 3,
      CONFIDENTIAL: 2,
      INTERNAL: 1,
      PUBLIC: 0,
    };

    const sorted = [...matches].sort((a, b) => {
      const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
      if (tierDiff !== 0) return tierDiff;
      return b.confidence - a.confidence;
    });

    const best = sorted[0];

    // Compute aggregate confidence
    // If multiple matches agree on the tier, boost confidence
    const sameTierMatches = sorted.filter(m => m.tier === best.tier);
    let aggregateConfidence = best.confidence;
    if (sameTierMatches.length > 1) {
      // Boost by 5% per additional agreeing match, cap at 0.99
      aggregateConfidence = Math.min(0.99,
        best.confidence + (sameTierMatches.length - 1) * 0.05
      );
    }

    const needsReview = aggregateConfidence < this.minConfidence;
    const status: ClassificationStatus = needsReview ? 'NEEDS_REVIEW' : 'AUTO';

    // Gather all evidence
    const allEvidence = matches.flatMap(m => m.evidence);

    if (needsReview) {
      logger.info('Classification flagged for review', {
        fieldPath,
        confidence: aggregateConfidence,
        tier: best.tier,
      });
    }

    return {
      field_path: fieldPath,
      detected_tier: best.tier,
      detected_type: best.detected_type,
      sub_type: best.sub_type,
      confidence: Math.round(aggregateConfidence * 1000) / 1000,
      classifier_id: classifierId,
      classifier_version: classifierVersion,
      evidence: allEvidence,
      needs_review: needsReview,
      status,
    };
  }
}
