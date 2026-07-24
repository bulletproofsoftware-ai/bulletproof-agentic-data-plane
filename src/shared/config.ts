import { resolve } from 'node:path';
import { homedir } from 'node:os';

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
  }
  return parsed;
}

function optionalFloat(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${raw}`);
  }
  return parsed;
}

function resolveAuditBusPath(raw: string): string {
  if (raw.startsWith('~')) {
    return resolve(homedir(), raw.slice(2));
  }
  return resolve(raw);
}

export function loadConfig() {
  return {
    database: {
      url: requiredEnv('DATABASE_URL'),
    },
    qdrant: {
      url: optionalEnv('QDRANT_URL', 'http://localhost:6334'),
    },
    ollama: {
      url: optionalEnv('OLLAMA_URL', 'http://localhost:11434'),
    },
    auditBus: {
      dbPath: resolveAuditBusPath(
        optionalEnv('AUDIT_BUS_DB_PATH', './data/audit.db')
      ),
      serviceKey: requiredEnv('AUDIT_BUS_SERVICE_KEY'),
    },
    jwt: {
      secret: requiredEnv('JWT_SECRET'),
      issuer: optionalEnv('JWT_ISSUER', 'agentic-data-plane'),
      expiresInSeconds: 3600, // 1 hour, per CISO spec
      algorithm: 'HS256' as const,
    },
    quality: {
      blockingThreshold: optionalInt('QUALITY_BLOCKING_THRESHOLD', 700),
      alertDeclinePercent: optionalFloat('QUALITY_ALERT_DECLINE_PERCENT', 5),
    },
    classification: {
      minConfidence: optionalFloat('CLASSIFICATION_MIN_CONFIDENCE', 0.75),
      piiDetectionTarget: optionalFloat('CLASSIFICATION_PII_DETECTION_TARGET', 0.985),
    },
    lineage: {
      retentionYearsStandard: optionalInt('LINEAGE_RETENTION_YEARS_STANDARD', 7),
      retentionYearsRestricted: optionalInt('LINEAGE_RETENTION_YEARS_RESTRICTED', 10),
      traceMaxDepth: optionalInt('LINEAGE_TRACE_MAX_DEPTH', 50),
      traceSlaMs: optionalInt('LINEAGE_TRACE_SLA_MS', 500),
    },
    pipeline: {
      anomalySigmaThreshold: optionalFloat('PIPELINE_ANOMALY_SIGMA_THRESHOLD', 2.0),
      nullRateSpikeThreshold: optionalFloat('PIPELINE_NULL_RATE_SPIKE_THRESHOLD', 0.10),
      alertDeliverySlaMs: optionalInt('PIPELINE_ALERT_DELIVERY_SLA_MS', 30000),
    },
    api: {
      port: optionalInt('API_PORT', 8099),
      dashboardPort: optionalInt('DASHBOARD_PORT', 8100),
    },
    graphql: {
      depthLimit: optionalInt('GRAPHQL_DEPTH_LIMIT', 10),
      complexityLimit: optionalInt('GRAPHQL_COMPLEXITY_LIMIT', 1000),
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
