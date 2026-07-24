import { QualityScorer } from '../../../src/quality/QualityScorer.js';
import type { DatasetMetrics } from '../../../src/quality/types.js';

describe('QualityScorer', () => {
  const scorer = new QualityScorer();

  function makeMetrics(overrides: Partial<DatasetMetrics> = {}): DatasetMetrics {
    return {
      dataset_id: 'test-dataset',
      total_records: 1000,
      total_required_fields: 10,
      non_null_required_fields: 10,
      validated_values: 1000,
      total_values: 1000,
      schema_conforming_records: 1000,
      data_age_hours: 0,
      sla_hours: 24,
      failing_checks: [],
      ...overrides,
    };
  }

  it('computes perfect score for ideal data', () => {
    const { dimensions, total } = scorer.score(makeMetrics());
    expect(total).toBe(1000);
    expect(dimensions.completeness).toBe(250);
    expect(dimensions.accuracy).toBe(250);
    expect(dimensions.consistency).toBe(250);
    expect(dimensions.timeliness).toBe(250);
  });

  it('computes zero score for completely missing data', () => {
    const { total } = scorer.score(makeMetrics({
      non_null_required_fields: 0,
      validated_values: 0,
      schema_conforming_records: 0,
      data_age_hours: 48, // 2x SLA
      sla_hours: 24,
    }));
    expect(total).toBe(0);
  });

  it('computes completeness as ratio of non-null required fields', () => {
    expect(scorer.computeCompleteness(makeMetrics({ non_null_required_fields: 5 }))).toBe(125);
    expect(scorer.computeCompleteness(makeMetrics({ non_null_required_fields: 10 }))).toBe(250);
    expect(scorer.computeCompleteness(makeMetrics({ non_null_required_fields: 0 }))).toBe(0);
  });

  it('completeness returns 250 when no required fields', () => {
    expect(scorer.computeCompleteness(makeMetrics({ total_required_fields: 0 }))).toBe(250);
  });

  it('computes accuracy as ratio of validated values', () => {
    expect(scorer.computeAccuracy(makeMetrics({ validated_values: 500 }))).toBe(125);
    expect(scorer.computeAccuracy(makeMetrics({ validated_values: 0 }))).toBe(0);
  });

  it('computes consistency as ratio of schema-conforming records', () => {
    expect(scorer.computeConsistency(makeMetrics({ schema_conforming_records: 750 }))).toBe(188);
  });

  it('computes timeliness that decays with age', () => {
    expect(scorer.computeTimeliness(makeMetrics({ data_age_hours: 0, sla_hours: 24 }))).toBe(250);
    expect(scorer.computeTimeliness(makeMetrics({ data_age_hours: 12, sla_hours: 24 }))).toBe(125);
    expect(scorer.computeTimeliness(makeMetrics({ data_age_hours: 24, sla_hours: 24 }))).toBe(0);
    expect(scorer.computeTimeliness(makeMetrics({ data_age_hours: 48, sla_hours: 24 }))).toBe(0);
  });

  it('dimensions always sum to total score', () => {
    const { dimensions, total } = scorer.score(makeMetrics({
      non_null_required_fields: 7,
      validated_values: 800,
      schema_conforming_records: 900,
      data_age_hours: 6,
    }));
    expect(dimensions.completeness + dimensions.accuracy + dimensions.consistency + dimensions.timeliness).toBe(total);
  });

  it('each dimension is capped at 250', () => {
    const { dimensions } = scorer.score(makeMetrics());
    expect(dimensions.completeness).toBeLessThanOrEqual(250);
    expect(dimensions.accuracy).toBeLessThanOrEqual(250);
    expect(dimensions.consistency).toBeLessThanOrEqual(250);
    expect(dimensions.timeliness).toBeLessThanOrEqual(250);
  });
});
