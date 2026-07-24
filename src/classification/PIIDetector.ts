import type { Classifier, ClassificationMatch } from './types.js';

// SSN patterns: XXX-XX-XXXX, XXXXXXXXX
const SSN_PATTERN = /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/;

// Email pattern
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

// Phone patterns: US formats
const PHONE_PATTERN = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;

// Date of birth patterns
const DOB_PATTERNS = [
  /\b(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/,  // MM/DD/YYYY
  /\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b/,  // YYYY-MM-DD
  /\b(?:0[1-9]|[12]\d|3[01])[-/](?:0[1-9]|1[0-2])[-/](?:19|20)\d{2}\b/,  // DD/MM/YYYY
];

// Drivers license patterns (varies by state, general pattern)
const DL_PATTERN = /\b[A-Z]\d{7,14}\b/;

// Name field hints (contextual)
const NAME_FIELD_HINTS = /(?:first.?name|last.?name|full.?name|patient.?name|customer.?name|member.?name)/i;

// Address field hints
const ADDRESS_FIELD_HINTS = /(?:address|street|city|state|zip|postal)/i;

/**
 * PII Detector (REQ-034).
 * Detects: SSN, email, phone, DOB, driver's license, names, addresses.
 * Target: >= 98.5% detection rate, <150ms per record.
 */
export class PIIDetector implements Classifier {
  readonly classifierId = 'pii-detector';
  readonly version = '1.0.0';

  classify(fieldPath: string, value: unknown, context?: Record<string, unknown>): ClassificationMatch[] {
    if (value === null || value === undefined) return [];
    const strValue = String(value).trim();
    if (strValue.length === 0) return [];

    const matches: ClassificationMatch[] = [];

    // SSN detection (RESTRICTED)
    if (SSN_PATTERN.test(strValue)) {
      // Additional validation: not a phone number, not a zip code
      const cleaned = strValue.replace(/[-\s]/g, '');
      if (cleaned.length === 9 && this.isValidSSN(cleaned)) {
        matches.push({
          detected_type: 'PII',
          sub_type: 'SSN',
          tier: 'RESTRICTED',
          confidence: 0.95,
          evidence: [`Pattern match: SSN format in ${fieldPath}`],
        });
      }
    }

    // Email detection (CONFIDENTIAL)
    if (EMAIL_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'PII',
        sub_type: 'EMAIL',
        tier: 'CONFIDENTIAL',
        confidence: 0.98,
        evidence: [`Pattern match: email format in ${fieldPath}`],
      });
    }

    // Phone detection (CONFIDENTIAL)
    if (PHONE_PATTERN.test(strValue) && !SSN_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'PII',
        sub_type: 'PHONE',
        tier: 'CONFIDENTIAL',
        confidence: 0.90,
        evidence: [`Pattern match: phone number format in ${fieldPath}`],
      });
    }

    // DOB detection (CONFIDENTIAL)
    for (const pattern of DOB_PATTERNS) {
      if (pattern.test(strValue)) {
        // Validate it's a plausible date
        const fieldLower = fieldPath.toLowerCase();
        const isDateField = /(?:dob|birth|born|bday|date_of_birth)/i.test(fieldLower);
        matches.push({
          detected_type: 'PII',
          sub_type: 'DOB',
          tier: 'CONFIDENTIAL',
          confidence: isDateField ? 0.95 : 0.70,
          evidence: [`Pattern match: date format in ${fieldPath}${isDateField ? ' (field name suggests DOB)' : ''}`],
        });
        break;
      }
    }

    // Name field detection (contextual, CONFIDENTIAL)
    if (NAME_FIELD_HINTS.test(fieldPath) && strValue.length > 1 && strValue.length < 100) {
      matches.push({
        detected_type: 'PII',
        sub_type: 'NAME',
        tier: 'CONFIDENTIAL',
        confidence: 0.85,
        evidence: [`Field name suggests personal name: ${fieldPath}`],
      });
    }

    // Address detection (contextual, CONFIDENTIAL)
    if (ADDRESS_FIELD_HINTS.test(fieldPath) && strValue.length > 3) {
      matches.push({
        detected_type: 'PII',
        sub_type: 'ADDRESS',
        tier: 'CONFIDENTIAL',
        confidence: 0.80,
        evidence: [`Field name suggests address: ${fieldPath}`],
      });
    }

    // Driver's license (if field suggests it, RESTRICTED)
    if (/(?:license|dl|driver)/i.test(fieldPath) && DL_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'PII',
        sub_type: 'DRIVERS_LICENSE',
        tier: 'RESTRICTED',
        confidence: 0.80,
        evidence: [`Pattern match: driver's license format in ${fieldPath}`],
      });
    }

    return matches;
  }

  /**
   * Basic SSN validation: area number is not 000, 666, or 900-999.
   */
  private isValidSSN(cleaned: string): boolean {
    const area = parseInt(cleaned.substring(0, 3), 10);
    const group = parseInt(cleaned.substring(3, 5), 10);
    const serial = parseInt(cleaned.substring(5), 10);
    return area > 0 && area !== 666 && area < 900 && group > 0 && serial > 0;
  }
}
