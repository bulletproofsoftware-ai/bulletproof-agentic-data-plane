export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHZ_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class QualityGateError extends AppError {
  constructor(
    datasetId: string,
    score: number,
    threshold: number
  ) {
    super(
      `Quality gate failed for dataset ${datasetId}: score ${score} < threshold ${threshold}`,
      'QUALITY_GATE_BLOCKED',
      422,
      { datasetId, score, threshold }
    );
    this.name = 'QualityGateError';
  }
}

export class DualAuthRequiredError extends AppError {
  constructor(message: string = 'Dual authorization required for this operation') {
    super(message, 'DUAL_AUTH_REQUIRED', 403);
    this.name = 'DualAuthRequiredError';
  }
}

export class HashChainIntegrityError extends AppError {
  constructor(eventId: string, reason: string) {
    super(
      `Hash chain integrity violation at event ${eventId}: ${reason}`,
      'HASH_CHAIN_INTEGRITY',
      500,
      { eventId, reason }
    );
    this.name = 'HashChainIntegrityError';
  }
}
