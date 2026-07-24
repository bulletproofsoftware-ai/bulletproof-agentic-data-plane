import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that adds X-Query-Time-Ms header to all responses.
 */
export function queryTimer(_req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();

  // Override end to inject header
  const originalEnd = res.end.bind(res);
  res.end = function (...args: Parameters<typeof originalEnd>) {
    const duration = Math.round(performance.now() - start);
    res.setHeader('X-Query-Time-Ms', duration.toString());
    return originalEnd(...args);
  } as typeof res.end;

  next();
}
