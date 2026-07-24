import {
  LINEAGE_EVENT_TYPES,
  EVENT_TYPE_TO_PG,
  PG_TO_EVENT_TYPE,
  EVENT_CATEGORY,
} from '../../../src/events/types.js';

describe('Event Types', () => {
  it('defines exactly 15 event types', () => {
    expect(LINEAGE_EVENT_TYPES).toHaveLength(15);
  });

  it('all event types use namespace prefix', () => {
    for (const type of LINEAGE_EVENT_TYPES) {
      expect(type).toMatch(/^(data|compliance)\./);
    }
  });

  it('maps all event types to PG format', () => {
    for (const type of LINEAGE_EVENT_TYPES) {
      expect(EVENT_TYPE_TO_PG[type]).toBeDefined();
      expect(EVENT_TYPE_TO_PG[type]).toMatch(/^[A-Z_]+$/);
    }
  });

  it('maps all PG types back to dotted format', () => {
    for (const [, dottedType] of Object.entries(PG_TO_EVENT_TYPE)) {
      expect(LINEAGE_EVENT_TYPES).toContain(dottedType);
    }
  });

  it('assigns categories to all event types', () => {
    for (const type of LINEAGE_EVENT_TYPES) {
      expect(EVENT_CATEGORY[type]).toBeDefined();
      expect(['data_lineage', 'data_classification', 'data_quality', 'pipeline_health', 'data_reconciliation', 'agent_economics', 'regulatory_compliance']).toContain(EVENT_CATEGORY[type]);
    }
  });

  it('lineage events map to data_lineage category', () => {
    expect(EVENT_CATEGORY['data.lineage_source']).toBe('data_lineage');
    expect(EVENT_CATEGORY['data.lineage_transform']).toBe('data_lineage');
    expect(EVENT_CATEGORY['data.lineage_merge']).toBe('data_lineage');
    expect(EVENT_CATEGORY['data.lineage_output']).toBe('data_lineage');
    expect(EVENT_CATEGORY['data.lineage_delete']).toBe('data_lineage');
  });

  it('classification events map to data_classification', () => {
    expect(EVENT_CATEGORY['data.classification_detected']).toBe('data_classification');
  });

  it('quality events map to data_quality', () => {
    expect(EVENT_CATEGORY['data.quality_scored']).toBe('data_quality');
  });

  it('pipeline events map to pipeline_health', () => {
    expect(EVENT_CATEGORY['data.pipeline_anomaly']).toBe('pipeline_health');
  });

  it('reconciliation events map to data_reconciliation', () => {
    expect(EVENT_CATEGORY['data.reconciliation_completed']).toBe('data_reconciliation');
  });

  it('economics events map to agent_economics', () => {
    expect(EVENT_CATEGORY['data.cost_recorded']).toBe('agent_economics');
  });

  it('compliance events map to regulatory_compliance', () => {
    expect(EVENT_CATEGORY['compliance.session_init']).toBe('regulatory_compliance');
    expect(EVENT_CATEGORY['compliance.gate_decision']).toBe('regulatory_compliance');
    expect(EVENT_CATEGORY['compliance.evidence_generated']).toBe('regulatory_compliance');
    expect(EVENT_CATEGORY['compliance.dsr_submitted']).toBe('regulatory_compliance');
    expect(EVENT_CATEGORY['compliance.incident_opened']).toBe('regulatory_compliance');
  });
});
