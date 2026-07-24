import { ConfidenceScorer } from '../../../src/classification/ConfidenceScorer.js';
import type { ClassificationMatch } from '../../../src/classification/types.js';

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer(0.75);

  it('returns null for empty matches', () => {
    const result = scorer.score('field', [], 'test', '1.0.0');
    expect(result).toBeNull();
  });

  it('returns highest-tier match as final classification', () => {
    const matches: ClassificationMatch[] = [
      { detected_type: 'PII', sub_type: 'EMAIL', tier: 'CONFIDENTIAL', confidence: 0.98, evidence: ['email'] },
      { detected_type: 'PII', sub_type: 'SSN', tier: 'RESTRICTED', confidence: 0.95, evidence: ['ssn'] },
    ];
    const result = scorer.score('field', matches, 'pii', '1.0.0');
    expect(result?.detected_tier).toBe('RESTRICTED');
  });

  it('flags low confidence for human review', () => {
    const matches: ClassificationMatch[] = [
      { detected_type: 'PII', sub_type: 'DOB', tier: 'CONFIDENTIAL', confidence: 0.60, evidence: ['date'] },
    ];
    const result = scorer.score('field', matches, 'pii', '1.0.0');
    expect(result?.needs_review).toBe(true);
    expect(result?.status).toBe('NEEDS_REVIEW');
  });

  it('auto-enforces high confidence', () => {
    const matches: ClassificationMatch[] = [
      { detected_type: 'PII', sub_type: 'SSN', tier: 'RESTRICTED', confidence: 0.95, evidence: ['ssn'] },
    ];
    const result = scorer.score('field', matches, 'pii', '1.0.0');
    expect(result?.needs_review).toBe(false);
    expect(result?.status).toBe('AUTO');
  });

  it('boosts confidence for multiple agreeing matches', () => {
    const matches: ClassificationMatch[] = [
      { detected_type: 'PII', sub_type: 'SSN', tier: 'RESTRICTED', confidence: 0.80, evidence: ['pattern1'] },
      { detected_type: 'PII', sub_type: 'SSN', tier: 'RESTRICTED', confidence: 0.78, evidence: ['pattern2'] },
    ];
    const result = scorer.score('field', matches, 'pii', '1.0.0');
    expect(result?.confidence).toBeGreaterThan(0.80); // Boosted
  });

  it('caps confidence at 0.99', () => {
    const matches: ClassificationMatch[] = Array(10).fill(null).map((_, i) => ({
      detected_type: 'PII',
      sub_type: 'SSN',
      tier: 'RESTRICTED' as const,
      confidence: 0.98,
      evidence: [`match ${i}`],
    }));
    const result = scorer.score('field', matches, 'pii', '1.0.0');
    expect(result?.confidence).toBeLessThanOrEqual(0.99);
  });

  it('collects all evidence from matches', () => {
    const matches: ClassificationMatch[] = [
      { detected_type: 'PII', sub_type: 'SSN', tier: 'RESTRICTED', confidence: 0.95, evidence: ['evidence1'] },
      { detected_type: 'PII', sub_type: 'SSN', tier: 'RESTRICTED', confidence: 0.90, evidence: ['evidence2'] },
    ];
    const result = scorer.score('field', matches, 'pii', '1.0.0');
    expect(result?.evidence).toContain('evidence1');
    expect(result?.evidence).toContain('evidence2');
  });
});
