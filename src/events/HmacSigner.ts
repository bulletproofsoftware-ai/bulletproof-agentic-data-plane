import { createHmac, createHash } from 'node:crypto';

/**
 * HMAC-SHA256 signing for governance events.
 * Per CISO spec: signing key from env var, never hardcoded.
 */
export class HmacSigner {
  private readonly serviceKey: Buffer;

  constructor(serviceKey: string) {
    if (!serviceKey || serviceKey.length < 32) {
      throw new Error('AUDIT_BUS_SERVICE_KEY must be at least 256 bits (32 characters)');
    }
    this.serviceKey = Buffer.from(serviceKey, 'utf-8');
  }

  /**
   * Compute SHA-256 hash of arbitrary data.
   */
  sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Compute HMAC-SHA256 of data using the service key.
   */
  hmacSha256(data: string): string {
    return createHmac('sha256', this.serviceKey).update(data).digest('hex');
  }

  /**
   * Sign a governance event: HMAC-SHA256(serviceKey, contentHash + previousHash)
   */
  signEvent(contentHash: string, previousHash: string): string {
    return this.hmacSha256(contentHash + previousHash);
  }

  /**
   * Verify an event's HMAC signature.
   */
  verifyEvent(contentHash: string, previousHash: string, signature: string): boolean {
    const expected = this.signEvent(contentHash, previousHash);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  }
}
