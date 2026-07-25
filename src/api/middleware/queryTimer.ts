import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that adds X-Query-Time-Ms header to all responses.
 */
export function queryTimer(_req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();

  // Override end to inject the header.
  //
  // res.end() can be reached after the headers have already been flushed —
  // any streamed or chunked response, or a second end() call — and
  // setHeader() then throws ERR_HTTP_HEADERS_SENT from inside the response
  // path, turning a timing nicety into a failed request. Skip the header in
  // that case rather than throwing.
  const originalEnd = res.end.bind(res);
  res.end = function (...args: Parameters<typeof originalEnd>) {
    if (!res.headersSent) {
      const duration = Math.round(performance.now() - start);
      res.setHeader('X-Query-Time-Ms', duration.toString());
    }
    return originalEnd(...args);
  } as typeof res.end;

  next();
}
