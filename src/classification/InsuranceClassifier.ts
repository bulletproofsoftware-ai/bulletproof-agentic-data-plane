import type { Classifier, ClassificationMatch } from './types.js';

// NAIC company codes: 5-digit codes
const NAIC_PATTERN = /\b\d{5}\b/;
const NAIC_FIELD_HINT = /(?:naic|company.?code|insurer.?code|carrier.?code)/i;

// FEIN/TIN (Federal Employer ID): XX-XXXXXXX
const FEIN_PATTERN = /\b\d{2}-\d{7}\b/;
const FEIN_FIELD_HINT = /(?:fein|tin|tax.?id|employer.?id|federal.?id)/i;

// Adjuster license numbers (state-specific, general pattern)
const ADJUSTER_PATTERN = /\b[A-Z]{1,3}[-\s]?\d{5,10}\b/;
const ADJUSTER_FIELD_HINT = /(?:adjuster|claims.?examiner|license.?number|adj.?license)/i;

// DOI filing reference numbers
const DOI_REF_PATTERN = /\b(?:SERFF|serff)[-\s]?\w{4,20}\b/;
const DOI_FIELD_HINT = /(?:doi|filing|serff|state.?filing|regulatory.?ref)/i;

// Policy number patterns
const POLICY_PATTERN = /\b[A-Z]{2,4}[-\s]?\d{6,15}\b/;
const POLICY_FIELD_HINT = /(?:policy.?number|policy.?id|pol.?no|certificate.?number)/i;

// Claim number patterns
const CLAIM_PATTERN = /\b(?:CLM|CL|C)[-\s]?\d{6,15}\b/;
const CLAIM_FIELD_HINT = /(?:claim.?number|claim.?id|clm.?no|loss.?number)/i;

// Coverage code patterns
const COVERAGE_FIELD_HINT = /(?:coverage|lob|line.?of.?business|peril|endorsement)/i;

// Rate/premium fields
const PREMIUM_FIELD_HINT = /(?:premium|rate|deductible|limit|retention|aggregate)/i;

/**
 * Insurance Classifier (REQ-035).
 * Detects: NAIC codes, FEIN/TIN, adjuster licenses, DOI references,
 * policy numbers, claim numbers, coverage codes, premium data.
 */
export class InsuranceClassifier implements Classifier {
  readonly classifierId = 'insurance-classifier';
  readonly version = '1.0.0';

  classify(fieldPath: string, value: unknown, _context?: Record<string, unknown>): ClassificationMatch[] {
    if (value === null || value === undefined) return [];
    const strValue = String(value).trim();
    if (strValue.length === 0) return [];

    const matches: ClassificationMatch[] = [];

    // NAIC company code (INTERNAL)
    if (NAIC_FIELD_HINT.test(fieldPath) && NAIC_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'NAIC',
        sub_type: 'COMPANY_CODE',
        tier: 'INTERNAL',
        confidence: 0.90,
        evidence: [`NAIC company code pattern in ${fieldPath}`],
      });
    }

    // FEIN/TIN (CONFIDENTIAL — business tax ID)
    if (FEIN_PATTERN.test(strValue)) {
      const isFeinField = FEIN_FIELD_HINT.test(fieldPath);
      matches.push({
        detected_type: 'NAIC',
        sub_type: 'FEIN',
        tier: 'CONFIDENTIAL',
        confidence: isFeinField ? 0.95 : 0.75,
        evidence: [`FEIN/TIN pattern in ${fieldPath}`],
      });
    }

    // Adjuster license (CONFIDENTIAL)
    if (ADJUSTER_FIELD_HINT.test(fieldPath) && ADJUSTER_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'NAIC',
        sub_type: 'ADJUSTER_LICENSE',
        tier: 'CONFIDENTIAL',
        confidence: 0.85,
        evidence: [`Adjuster license pattern in ${fieldPath}`],
      });
    }

    // DOI filing reference (INTERNAL)
    if (DOI_FIELD_HINT.test(fieldPath) || DOI_REF_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'NAIC',
        sub_type: 'DOI_FILING',
        tier: 'INTERNAL',
        confidence: DOI_REF_PATTERN.test(strValue) ? 0.92 : 0.78,
        evidence: [`DOI filing reference in ${fieldPath}`],
      });
    }

    // Policy number (CONFIDENTIAL — linked to policyholder)
    if (POLICY_FIELD_HINT.test(fieldPath) && POLICY_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'NAIC',
        sub_type: 'POLICY_NUMBER',
        tier: 'CONFIDENTIAL',
        confidence: 0.88,
        evidence: [`Policy number pattern in ${fieldPath}`],
      });
    }

    // Claim number (CONFIDENTIAL)
    if (CLAIM_FIELD_HINT.test(fieldPath) && (CLAIM_PATTERN.test(strValue) || /^\d{8,15}$/.test(strValue))) {
      matches.push({
        detected_type: 'NAIC',
        sub_type: 'CLAIM_NUMBER',
        tier: 'CONFIDENTIAL',
        confidence: CLAIM_PATTERN.test(strValue) ? 0.90 : 0.75,
        evidence: [`Claim number pattern in ${fieldPath}`],
      });
    }

    // Coverage / line of business (INTERNAL)
    if (COVERAGE_FIELD_HINT.test(fieldPath) && strValue.length > 0) {
      matches.push({
        detected_type: 'NAIC',
        sub_type: 'COVERAGE_CODE',
        tier: 'INTERNAL',
        confidence: 0.80,
        evidence: [`Coverage/LOB field: ${fieldPath}`],
      });
    }

    // Premium / rate data (CONFIDENTIAL — commercially sensitive)
    if (PREMIUM_FIELD_HINT.test(fieldPath) && /\d/.test(strValue)) {
      matches.push({
        detected_type: 'FINANCIAL',
        sub_type: 'PREMIUM_DATA',
        tier: 'CONFIDENTIAL',
        confidence: 0.82,
        evidence: [`Premium/rate data in ${fieldPath}`],
      });
    }

    return matches;
  }
}
