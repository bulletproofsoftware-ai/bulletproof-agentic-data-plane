import { InsuranceClassifier } from '../../../src/classification/InsuranceClassifier.js';

describe('InsuranceClassifier', () => {
  const classifier = new InsuranceClassifier();

  it('detects NAIC company codes', () => {
    const results = classifier.classify('naic_code', '12345');
    const naic = results.find(r => r.sub_type === 'COMPANY_CODE');
    expect(naic).toBeDefined();
    expect(naic?.tier).toBe('INTERNAL');
  });

  it('detects FEIN/TIN', () => {
    const results = classifier.classify('tax_id', '12-3456789');
    const fein = results.find(r => r.sub_type === 'FEIN');
    expect(fein).toBeDefined();
    expect(fein?.tier).toBe('CONFIDENTIAL');
  });

  it('detects policy numbers', () => {
    const results = classifier.classify('policy_number', 'HO-123456789');
    const policy = results.find(r => r.sub_type === 'POLICY_NUMBER');
    expect(policy).toBeDefined();
    expect(policy?.tier).toBe('CONFIDENTIAL');
  });

  it('detects DOI filing references', () => {
    const results = classifier.classify('filing_ref', 'SERFF-ABCD1234');
    const doi = results.find(r => r.sub_type === 'DOI_FILING');
    expect(doi).toBeDefined();
    expect(doi?.tier).toBe('INTERNAL');
  });

  it('detects premium data', () => {
    const results = classifier.classify('annual_premium', '1234.56');
    const premium = results.find(r => r.sub_type === 'PREMIUM_DATA');
    expect(premium).toBeDefined();
    expect(premium?.tier).toBe('CONFIDENTIAL');
  });

  it('detects coverage/LOB fields', () => {
    const results = classifier.classify('line_of_business', 'Commercial Auto');
    const coverage = results.find(r => r.sub_type === 'COVERAGE_CODE');
    expect(coverage).toBeDefined();
  });
});
