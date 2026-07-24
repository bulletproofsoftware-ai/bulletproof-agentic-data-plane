import { FinancialDetector } from '../../../src/classification/FinancialDetector.js';

describe('FinancialDetector', () => {
  const detector = new FinancialDetector();

  describe('credit card detection', () => {
    it('detects Visa card numbers', () => {
      // 4111111111111111 is a valid Visa test number
      const results = detector.classify('card_number', '4111111111111111');
      const cc = results.find(r => r.sub_type === 'CREDIT_CARD');
      expect(cc).toBeDefined();
      expect(cc?.tier).toBe('RESTRICTED');
      expect(cc?.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('detects Mastercard numbers', () => {
      const results = detector.classify('payment.cc', '5500000000000004');
      const cc = results.find(r => r.sub_type === 'CREDIT_CARD');
      expect(cc).toBeDefined();
    });

    it('detects Amex numbers', () => {
      const results = detector.classify('card', '378282246310005');
      const cc = results.find(r => r.sub_type === 'CREDIT_CARD');
      expect(cc).toBeDefined();
    });

    it('rejects numbers failing Luhn check', () => {
      const results = detector.classify('card_number', '4111111111111112');
      const cc = results.find(r => r.sub_type === 'CREDIT_CARD');
      expect(cc).toBeUndefined();
    });

    it('handles numbers with spaces', () => {
      const results = detector.classify('card_number', '4111 1111 1111 1111');
      const cc = results.find(r => r.sub_type === 'CREDIT_CARD');
      expect(cc).toBeDefined();
    });
  });

  describe('bank account detection', () => {
    it('detects bank account numbers in context', () => {
      const results = detector.classify('bank_account_number', '12345678901');
      const acct = results.find(r => r.sub_type === 'BANK_ACCOUNT');
      expect(acct).toBeDefined();
      expect(acct?.tier).toBe('RESTRICTED');
    });
  });

  describe('routing number detection', () => {
    it('detects valid ABA routing numbers', () => {
      // 021000021 is JPMorgan Chase routing number
      const results = detector.classify('routing_number', '021000021');
      const routing = results.find(r => r.sub_type === 'ROUTING_NUMBER');
      expect(routing).toBeDefined();
      expect(routing?.tier).toBe('CONFIDENTIAL');
    });

    it('rejects invalid routing numbers', () => {
      const results = detector.classify('routing_number', '123456789');
      const routing = results.find(r => r.sub_type === 'ROUTING_NUMBER');
      expect(routing).toBeUndefined();
    });
  });
});
