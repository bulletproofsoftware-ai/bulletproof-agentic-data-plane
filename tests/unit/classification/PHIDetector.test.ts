import { PHIDetector } from '../../../src/classification/PHIDetector.js';

describe('PHIDetector', () => {
  const detector = new PHIDetector();

  describe('MRN detection', () => {
    it('detects MRN with prefix', () => {
      const results = detector.classify('patient.mrn', 'MRN:123456');
      const mrn = results.find(r => r.sub_type === 'MRN');
      expect(mrn).toBeDefined();
      expect(mrn?.tier).toBe('RESTRICTED');
    });

    it('detects MRN from field context', () => {
      const results = detector.classify('medical_record_number', '12345678');
      const mrn = results.find(r => r.sub_type === 'MRN');
      expect(mrn).toBeDefined();
    });
  });

  describe('ICD-10 detection', () => {
    it('detects ICD-10 codes in diagnosis fields', () => {
      const results = detector.classify('diagnosis_code', 'E11.65');
      const icd = results.find(r => r.sub_type === 'ICD10');
      expect(icd).toBeDefined();
      expect(icd?.tier).toBe('RESTRICTED');
    });

    it('detects simple ICD-10 codes', () => {
      const results = detector.classify('dx_code', 'J45');
      const icd = results.find(r => r.sub_type === 'ICD10');
      expect(icd).toBeDefined();
    });
  });

  describe('NPI detection', () => {
    it('detects valid NPI numbers', () => {
      // 1234567893 is a valid NPI (passes Luhn with 80840 prefix)
      const results = detector.classify('provider_id', '1234567893');
      const npi = results.find(r => r.sub_type === 'NPI');
      expect(npi).toBeDefined();
      expect(npi?.tier).toBe('CONFIDENTIAL');
    });
  });

  describe('treatment date detection', () => {
    it('detects treatment dates', () => {
      const results = detector.classify('admit_date', '2024-01-15');
      const date = results.find(r => r.sub_type === 'TREATMENT_DATE');
      expect(date).toBeDefined();
    });

    it('detects discharge dates', () => {
      const results = detector.classify('discharge_date', '2024-01-20');
      const date = results.find(r => r.sub_type === 'TREATMENT_DATE');
      expect(date).toBeDefined();
    });

    it('boosts confidence with co-located identifiers', () => {
      const results = detector.classify('treatment_date', '2024-01-15', { patient_name: 'John Doe' });
      const date = results.find(r => r.sub_type === 'TREATMENT_DATE');
      expect(date).toBeDefined();
      expect(date?.tier).toBe('RESTRICTED');
      expect(date?.confidence).toBeGreaterThanOrEqual(0.90);
    });
  });
});
