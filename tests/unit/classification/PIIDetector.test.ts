import { PIIDetector } from '../../../src/classification/PIIDetector.js';

describe('PIIDetector', () => {
  const detector = new PIIDetector();

  describe('SSN detection', () => {
    it('detects SSN with dashes (XXX-XX-XXXX)', () => {
      const results = detector.classify('customer.ssn', '123-45-6789');
      expect(results.length).toBeGreaterThan(0);
      const ssn = results.find(r => r.sub_type === 'SSN');
      expect(ssn).toBeDefined();
      expect(ssn?.tier).toBe('RESTRICTED');
      expect(ssn?.confidence).toBeGreaterThanOrEqual(0.90);
    });

    it('does not detect invalid SSN (area 000)', () => {
      const results = detector.classify('field', '000-45-6789');
      const ssn = results.find(r => r.sub_type === 'SSN');
      expect(ssn).toBeUndefined();
    });

    it('does not detect invalid SSN (area 666)', () => {
      const results = detector.classify('field', '666-45-6789');
      const ssn = results.find(r => r.sub_type === 'SSN');
      expect(ssn).toBeUndefined();
    });
  });

  describe('email detection', () => {
    it('detects email addresses', () => {
      const results = detector.classify('customer.email', 'john@example.com');
      const email = results.find(r => r.sub_type === 'EMAIL');
      expect(email).toBeDefined();
      expect(email?.tier).toBe('CONFIDENTIAL');
      expect(email?.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('detects complex email addresses', () => {
      const results = detector.classify('contact', 'user.name+tag@domain.co.uk');
      const email = results.find(r => r.sub_type === 'EMAIL');
      expect(email).toBeDefined();
    });
  });

  describe('phone detection', () => {
    it('detects US phone numbers', () => {
      const results = detector.classify('customer.phone', '(555) 123-4567');
      const phone = results.find(r => r.sub_type === 'PHONE');
      expect(phone).toBeDefined();
      expect(phone?.tier).toBe('CONFIDENTIAL');
    });

    it('detects phone with country code', () => {
      const results = detector.classify('phone', '+1-555-123-4567');
      const phone = results.find(r => r.sub_type === 'PHONE');
      expect(phone).toBeDefined();
    });
  });

  describe('DOB detection', () => {
    it('detects dates in DOB fields', () => {
      const results = detector.classify('patient.date_of_birth', '03/15/1990');
      const dob = results.find(r => r.sub_type === 'DOB');
      expect(dob).toBeDefined();
      expect(dob?.confidence).toBeGreaterThanOrEqual(0.90);
    });

    it('detects ISO dates in dob fields', () => {
      const results = detector.classify('dob', '1990-03-15');
      const dob = results.find(r => r.sub_type === 'DOB');
      expect(dob).toBeDefined();
    });
  });

  describe('name detection', () => {
    it('detects names from field context', () => {
      const results = detector.classify('customer.first_name', 'John');
      const name = results.find(r => r.sub_type === 'NAME');
      expect(name).toBeDefined();
      expect(name?.tier).toBe('CONFIDENTIAL');
    });

    it('detects names in patient_name fields', () => {
      const results = detector.classify('patient_name', 'Jane Doe');
      const name = results.find(r => r.sub_type === 'NAME');
      expect(name).toBeDefined();
    });
  });

  describe('null handling', () => {
    it('returns empty array for null values', () => {
      expect(detector.classify('field', null)).toEqual([]);
    });

    it('returns empty array for undefined values', () => {
      expect(detector.classify('field', undefined)).toEqual([]);
    });

    it('returns empty array for empty strings', () => {
      expect(detector.classify('field', '')).toEqual([]);
    });
  });
});
