import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for API endpoints.
 * Default: 100 requests per minute.
 */
export function createRateLimiter(windowMs: number = 60000, max: number = 100) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
}

/**
 * Stricter rate limiter for write endpoints.
 */
export function createWriteRateLimiter() {
  return createRateLimiter(60000, 30);
}
