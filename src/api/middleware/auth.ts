import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../../shared/errors.js';

export interface JwtPayload {
  sub: string;
  role: 'viewer' | 'analyst' | 'compliance_officer' | 'admin';
  iss: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT Authentication middleware (CISO spec).
 * HS256 only, 1-hour expiry, issuer validation.
 */
export function createAuthMiddleware(secret: string, issuer: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next(new AuthenticationError('Missing or invalid Authorization header'));
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],  // HS256 ONLY per CISO spec
        issuer,
      }) as JwtPayload;

      req.user = decoded;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        next(new AuthenticationError('Token expired'));
      } else if (err instanceof jwt.JsonWebTokenError) {
        next(new AuthenticationError('Invalid token'));
      } else {
        next(new AuthenticationError('Authentication failed'));
      }
    }
  };
}

/**
 * Role-based authorization middleware.
 */
export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AuthorizationError(`Required role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
}

/**
 * Generate a JWT token (utility for testing and token issuance).
 */
export function generateToken(
  payload: { sub: string; role: JwtPayload['role'] },
  secret: string,
  issuer: string,
  expiresInSeconds: number = 3600
): string {
  return jwt.sign(
    { sub: payload.sub, role: payload.role },
    secret,
    {
      algorithm: 'HS256',
      issuer,
      expiresIn: expiresInSeconds,
    }
  );
}
