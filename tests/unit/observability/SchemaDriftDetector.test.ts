import { SchemaDriftDetector } from '../../../src/observability/SchemaDriftDetector.js';

describe('SchemaDriftDetector', () => {
  // We test the detect() method which doesn't need PG
  const detector = new SchemaDriftDetector(null as any);

  it('detects no drift when schemas match', () => {
    const baseline = { fields: [{ name: 'id', type: 'integer' }, { name: 'name', type: 'text' }], hash: 'abc' };
    const current = { fields: [{ name: 'id', type: 'integer' }, { name: 'name', type: 'text' }], hash: 'abc' };
    const result = detector.detect(baseline, current);
    expect(result.drifted).toBe(false);
    expect(result.added_fields).toHaveLength(0);
    expect(result.removed_fields).toHaveLength(0);
    expect(result.type_changes).toHaveLength(0);
  });

  it('detects added fields', () => {
    const baseline = { fields: [{ name: 'id', type: 'integer' }], hash: 'abc' };
    const current = { fields: [{ name: 'id', type: 'integer' }, { name: 'email', type: 'text' }], hash: 'def' };
    const result = detector.detect(baseline, current);
    expect(result.drifted).toBe(true);
    expect(result.added_fields).toContain('email');
  });

  it('detects removed fields', () => {
    const baseline = { fields: [{ name: 'id', type: 'integer' }, { name: 'name', type: 'text' }], hash: 'abc' };
    const current = { fields: [{ name: 'id', type: 'integer' }], hash: 'def' };
    const result = detector.detect(baseline, current);
    expect(result.drifted).toBe(true);
    expect(result.removed_fields).toContain('name');
  });

  it('detects type changes', () => {
    const baseline = { fields: [{ name: 'id', type: 'integer' }], hash: 'abc' };
    const current = { fields: [{ name: 'id', type: 'bigint' }], hash: 'def' };
    const result = detector.detect(baseline, current);
    expect(result.drifted).toBe(true);
    expect(result.type_changes).toHaveLength(1);
    expect(result.type_changes[0]).toEqual({
      field: 'id',
      from_type: 'integer',
      to_type: 'bigint',
    });
  });

  it('detects multiple drift types simultaneously', () => {
    const baseline = { fields: [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'text' },
      { name: 'age', type: 'integer' },
    ], hash: 'abc' };
    const current = { fields: [
      { name: 'id', type: 'bigint' },     // type change
      { name: 'email', type: 'text' },     // added
      // 'name' removed, 'age' removed
    ], hash: 'def' };
    const result = detector.detect(baseline, current);
    expect(result.drifted).toBe(true);
    expect(result.added_fields).toContain('email');
    expect(result.removed_fields).toContain('name');
    expect(result.removed_fields).toContain('age');
    expect(result.type_changes[0].field).toBe('id');
  });
});
