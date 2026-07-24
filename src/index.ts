import { v4 as uuidv4 } from 'uuid';
import { loadConfig } from './shared/config.js';
import { createLogger } from './shared/logger.js';
import { runMigrations } from './db/migrate.js';
import { getPool, closePool } from './db/pool.js';
import { EventPublisher } from './events/EventPublisher.js';
import { LineageEngine } from './lineage/LineageEngine.js';
import { QualityValidator } from './quality/QualityValidator.js';
import { QualityTrendTracker } from './quality/QualityTrendTracker.js';
import { ClassificationEngine } from './classification/ClassificationEngine.js';
import { PipelineObserver } from './observability/PipelineObserver.js';
import { createServer } from './api/server.js';

const logger = createLogger('main');

async function main(): Promise<void> {
  logger.info('Agentic Data Plane starting...');

  // Load config (validates required env vars)
  const config = loadConfig();

  // Run database migrations
  logger.info('Running database migrations...');
  await runMigrations(config.database.url);

  // Initialize connection pool
  const pool = getPool(config.database.url);

  // Verify database connectivity
  const { rows } = await pool.query('SELECT 1 AS ok');
  if (rows[0]?.ok !== 1) {
    throw new Error('Database connectivity check failed');
  }
  logger.info('Database connected');

  // Initialize event publisher
  const sessionId = uuidv4();
  const publisher = new EventPublisher(
    pool,
    config.auditBus.serviceKey,
    config.auditBus.dbPath,
    sessionId
  );
  await publisher.initialize();

  // Initialize core engines
  const lineageEngine = new LineageEngine(pool, publisher);
  const qualityValidator = new QualityValidator(pool, publisher);
  const trendTracker = new QualityTrendTracker(pool, config.quality.alertDeclinePercent);
  const classificationEngine = new ClassificationEngine(pool, publisher, config.classification.minConfidence);
  const pipelineObserver = new PipelineObserver(
    pool,
    publisher,
    config.pipeline.anomalySigmaThreshold,
    config.pipeline.nullRateSpikeThreshold
  );

  // Create and start API server
  const { app, apollo } = await createServer({
    pool,
    lineageEngine,
    publisher,
    qualityValidator,
    trendTracker,
    classificationEngine,
    pipelineObserver,
    jwtSecret: config.jwt.secret,
    jwtIssuer: config.jwt.issuer,
    graphqlDepthLimit: config.graphql.depthLimit,
    graphqlComplexityLimit: config.graphql.complexityLimit,
  });

  const server = app.listen(config.api.port, () => {
    logger.info(`API server listening on port ${config.api.port}`);
    logger.info(`GraphQL endpoint: http://localhost:${config.api.port}/graphql`);
    logger.info(`Health check: http://localhost:${config.api.port}/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close();
    await apollo.stop();
    publisher.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
