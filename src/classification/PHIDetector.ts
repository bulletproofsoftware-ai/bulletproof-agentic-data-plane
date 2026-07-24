import type { Classifier, ClassificationMatch } from './types.js';

// Medical Record Number patterns
const MRN_PATTERN = /\b(?:MRN|mrn)[:\s#-]?\d{6,12}\b/;
const MRN_FIELD_HINT = /(?:mrn|medical.?record|patient.?id|chart.?number)/i;

// ICD-10 diagnosis codes: letter + 2 digits + optional decimal + up to 4 more
const ICD10_PATTERN = /\b[A-TV-Z]\d{2}(?:\.\d{1,4})?\b/;
const ICD10_FIELD_HINT = /(?:icd|diagnosis|diag.?code|dx.?code)/i;

// CPT procedure codes: 5 digits, some with modifier
const CPT_PATTERN = /\b\d{5}(?:-\d{2})?\b/;
const CPT_FIELD_HINT = /(?:cpt|procedure.?code|proc.?code)/i;

// NPI (National Provider Identifier): exactly 10 digits starting with 1 or 2
const NPI_PATTERN = /\b[12]\d{9}\b/;
const NPI_FIELD_HINT = /(?:npi|provider.?id|provider.?number|physician.?id)/i;

// DEA number pattern: 2 letters + 7 digits
const DEA_PATTERN = /\b[A-Za-z]{2}\d{7}\b/;
const DEA_FIELD_HINT = /(?:dea|prescriber)/i;

// Treatment/procedure date fields co-located with medical context
const TREATMENT_DATE_HINT = /(?:admit|discharge|treatment|procedure|surgery|encounter).?date/i;


/**
 * PHI Detector — HIPAA Protected Health Information (REQ-035).
 * Detects: MRN, ICD-10, NPI, CPT codes, DEA numbers, treatment dates.
 * Co-location detection: medical identifiers near names/dates trigger RESTRICTED.
 */
export class PHIDetector implements Classifier {
  readonly classifierId = 'phi-detector';
  readonly version = '1.0.0';

  classify(fieldPath: string, value: unknown, context?: Record<string, unknown>): ClassificationMatch[] {
    if (value === null || value === undefined) return [];
    const strValue = String(value).trim();
    if (strValue.length === 0) return [];

    const matches: ClassificationMatch[] = [];

    // MRN detection (RESTRICTED)
    if (MRN_PATTERN.test(strValue) || (MRN_FIELD_HINT.test(fieldPath) && /^\d{6,12}$/.test(strValue))) {
      matches.push({
        detected_type: 'PHI',
        sub_type: 'MRN',
        tier: 'RESTRICTED',
        confidence: MRN_PATTERN.test(strValue) ? 0.95 : 0.85,
        evidence: [`Medical record number pattern in ${fieldPath}`],
      });
    }

    // ICD-10 detection (CONFIDENTIAL, RESTRICTED with co-location)
    if (ICD10_PATTERN.test(strValue)) {
      const isIcdField = ICD10_FIELD_HINT.test(fieldPath);
      if (isIcdField) {
        matches.push({
          detected_type: 'PHI',
          sub_type: 'ICD10',
          tier: 'RESTRICTED',
          confidence: 0.95,
          evidence: [`ICD-10 code ${strValue} in diagnosis field ${fieldPath}`],
        });
      } else {
        // Contextual: could be ICD-10 but needs verification
        matches.push({
          detected_type: 'PHI',
          sub_type: 'ICD10',
          tier: 'CONFIDENTIAL',
          confidence: 0.65,
          evidence: [`Possible ICD-10 code pattern ${strValue} in ${fieldPath}`],
        });
      }
    }

    // NPI detection (CONFIDENTIAL)
    if (NPI_FIELD_HINT.test(fieldPath) && NPI_PATTERN.test(strValue)) {
      if (this.isValidNPI(strValue)) {
        matches.push({
          detected_type: 'PHI',
          sub_type: 'NPI',
          tier: 'CONFIDENTIAL',
          confidence: 0.92,
          evidence: [`NPI number (Luhn-validated) in ${fieldPath}`],
        });
      }
    }

    // CPT procedure codes (CONFIDENTIAL)
    if (CPT_FIELD_HINT.test(fieldPath) && CPT_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'PHI',
        sub_type: 'CPT',
        tier: 'CONFIDENTIAL',
        confidence: 0.88,
        evidence: [`CPT procedure code in ${fieldPath}`],
      });
    }

    // DEA number (RESTRICTED)
    if (DEA_FIELD_HINT.test(fieldPath) && DEA_PATTERN.test(strValue)) {
      matches.push({
        detected_type: 'PHI',
        sub_type: 'DEA',
        tier: 'RESTRICTED',
        confidence: 0.90,
        evidence: [`DEA number pattern in ${fieldPath}`],
      });
    }

    // Treatment date co-located with identifiers (RESTRICTED)
    if (TREATMENT_DATE_HINT.test(fieldPath)) {
      const hasCoLocatedIdentifier = context && (
        'patient_name' in context ||
        'patient_id' in context ||
        'mrn' in context
      );
      matches.push({
        detected_type: 'PHI',
        sub_type: 'TREATMENT_DATE',
        tier: hasCoLocatedIdentifier ? 'RESTRICTED' : 'CONFIDENTIAL',
        confidence: hasCoLocatedIdentifier ? 0.92 : 0.75,
        evidence: [`Treatment/procedure date in ${fieldPath}${hasCoLocatedIdentifier ? ' (co-located with patient identifier)' : ''}`],
      });
    }

    return matches;
  }

  /**
   * NPI Luhn validation (check digit algorithm).
   */
  private isValidNPI(npi: string): boolean {
    if (npi.length !== 10) return false;
    // NPI uses a modified Luhn algorithm with prefix 80840
    const prefixed = '80840' + npi;
    let sum = 0;
    let alternate = false;
    for (let i = prefixed.length - 1; i >= 0; i--) {
      let n = parseInt(prefixed[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }
}
