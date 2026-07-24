import type { Classifier, ClassificationMatch } from './types.js';

// Credit card patterns (Luhn-validated)
const CC_PATTERNS = [
  /\b4\d{12}(?:\d{3})?\b/,         // Visa: starts with 4, 13 or 16 digits
  /\b5[1-5]\d{14}\b/,              // Mastercard: starts with 51-55
  /\b3[47]\d{13}\b/,               // Amex: starts with 34 or 37
  /\b6(?:011|5\d{2})\d{12}\b/,     // Discover: starts with 6011 or 65
  /\b3(?:0[0-5]|[68]\d)\d{11}\b/,  // Diners Club
];
const CC_FIELD_HINT = /(?:card.?number|cc.?number|pan|credit.?card|payment.?card)/i;

// Bank account number patterns
const BANK_ACCOUNT_PATTERN = /\b\d{8,17}\b/;
const BANK_FIELD_HINT = /(?:account.?number|acct.?no|bank.?account|checking|savings)/i;

// Bank routing number (ABA): 9 digits
const ROUTING_PATTERN = /\b\d{9}\b/;
const ROUTING_FIELD_HINT = /(?:routing|aba|transit)/i;

// IBAN pattern
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/;
const IBAN_FIELD_HINT = /(?:iban)/i;

// SWIFT/BIC pattern
const SWIFT_PATTERN = /\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/;
const SWIFT_FIELD_HINT = /(?:swift|bic)/i;

/**
 * Financial Detector — PCI Payment Card + Banking (REQ-035).
 * Detects: credit card numbers (Luhn), bank accounts, routing numbers, IBAN, SWIFT.
 */
export class FinancialDetector implements Classifier {
  readonly classifierId = 'financial-detector';
  readonly version = '1.0.0';

  classify(fieldPath: string, value: unknown, _context?: Record<string, unknown>): ClassificationMatch[] {
    if (value === null || value === undefined) return [];
    const strValue = String(value).replace(/[\s-]/g, '').trim();
    if (strValue.length === 0) return [];

    const matches: ClassificationMatch[] = [];

    // Credit card detection (RESTRICTED — PCI)
    for (const pattern of CC_PATTERNS) {
      if (pattern.test(strValue) && this.luhnCheck(strValue.match(pattern)![0])) {
        matches.push({
          detected_type: 'FINANCIAL',
          sub_type: 'CREDIT_CARD',
          tier: 'RESTRICTED',
          confidence: 0.97,
          evidence: [`Luhn-validated payment card number in ${fieldPath}`],
        });
        break; // One CC match is enough
      }
    }

    // Contextual CC detection (field name suggests card number)
    if (matches.length === 0 && CC_FIELD_HINT.test(fieldPath) && /^\d{13,19}$/.test(strValue)) {
      if (this.luhnCheck(strValue)) {
        matches.push({
          detected_type: 'FINANCIAL',
          sub_type: 'CREDIT_CARD',
          tier: 'RESTRICTED',
          confidence: 0.95,
          evidence: [`Luhn-validated number in card-related field ${fieldPath}`],
        });
      }
    }

    // Bank account number (RESTRICTED)
    if (BANK_FIELD_HINT.test(fieldPath) && BANK_ACCOUNT_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'FINANCIAL',
        sub_type: 'BANK_ACCOUNT',
        tier: 'RESTRICTED',
        confidence: 0.88,
        evidence: [`Bank account number pattern in ${fieldPath}`],
      });
    }

    // Routing number (CONFIDENTIAL)
    if (ROUTING_FIELD_HINT.test(fieldPath) && ROUTING_PATTERN.test(strValue)) {
      if (this.isValidRoutingNumber(strValue)) {
        matches.push({
          detected_type: 'FINANCIAL',
          sub_type: 'ROUTING_NUMBER',
          tier: 'CONFIDENTIAL',
          confidence: 0.92,
          evidence: [`ABA routing number (checksum validated) in ${fieldPath}`],
        });
      }
    }

    // IBAN (RESTRICTED)
    if (IBAN_FIELD_HINT.test(fieldPath) && IBAN_PATTERN.test(String(value))) {
      matches.push({
        detected_type: 'FINANCIAL',
        sub_type: 'IBAN',
        tier: 'RESTRICTED',
        confidence: 0.90,
        evidence: [`IBAN pattern in ${fieldPath}`],
      });
    }

    // SWIFT/BIC (INTERNAL)
    if (SWIFT_FIELD_HINT.test(fieldPath) && SWIFT_PATTERN.test(String(value))) {
      matches.push({
        detected_type: 'FINANCIAL',
        sub_type: 'SWIFT_BIC',
        tier: 'INTERNAL',
        confidence: 0.88,
        evidence: [`SWIFT/BIC code in ${fieldPath}`],
      });
    }

    return matches;
  }

  /**
   * Luhn algorithm for credit card validation.
   */
  private luhnCheck(number: string): boolean {
    let sum = 0;
    let alternate = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let n = parseInt(number[i], 10);
      if (Number.isNaN(n)) return false;
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum > 0 && sum % 10 === 0;
  }

  /**
   * ABA routing number checksum validation.
   * Checksum: 3(d1 + d4 + d7) + 7(d2 + d5 + d8) + (d3 + d6 + d9) mod 10 = 0
   */
  private isValidRoutingNumber(routing: string): boolean {
    if (routing.length !== 9) return false;
    const d = routing.split('').map(Number);
    if (d.some(n => Number.isNaN(n))) return false;
    const checksum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
    return checksum % 10 === 0;
  }
}
