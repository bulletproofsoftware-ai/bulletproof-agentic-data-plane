import { HmacSigner } from '../../../src/events/HmacSigner.js';

describe('HmacSigner', () => {
  const key = 'test-service-key-minimum-256-bit-length';
  let signer: HmacSigner;

  beforeEach(() => {
    signer = new HmacSigner(key);
  });

  it('rejects keys shorter than 32 characters', () => {
    expect(() => new HmacSigner('short')).toThrow('at least 256 bits');
  });

  it('computes SHA-256 hash', () => {
    const hash = signer.sha256('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces deterministic hashes', () => {
    const hash1 = signer.sha256('test data');
    const hash2 = signer.sha256('test data');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different data', () => {
    const hash1 = signer.sha256('data1');
    const hash2 = signer.sha256('data2');
    expect(hash1).not.toBe(hash2);
  });

  it('computes HMAC-SHA256', () => {
    const hmac = signer.hmacSha256('hello');
    expect(hmac).toHaveLength(64);
    expect(hmac).toMatch(/^[0-9a-f]{64}$/);
  });

  it('signs events with content hash + previous hash', () => {
    const contentHash = signer.sha256('payload');
    const previousHash = 'genesis';
    const signature = signer.signEvent(contentHash, previousHash);
    expect(signature).toHaveLength(64);
  });

  it('verifies valid signatures', () => {
    const contentHash = signer.sha256('payload');
    const previousHash = 'genesis';
    const signature = signer.signEvent(contentHash, previousHash);
    expect(signer.verifyEvent(contentHash, previousHash, signature)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const contentHash = signer.sha256('payload');
    const previousHash = 'genesis';
    expect(signer.verifyEvent(contentHash, previousHash, 'invalid')).toBe(false);
  });

  it('rejects tampered content', () => {
    const contentHash = signer.sha256('payload');
    const previousHash = 'genesis';
    const signature = signer.signEvent(contentHash, previousHash);
    const tamperedHash = signer.sha256('tampered');
    expect(signer.verifyEvent(tamperedHash, previousHash, signature)).toBe(false);
  });
});
