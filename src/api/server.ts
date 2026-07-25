import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
// Apollo Server 5 no longer bundles the Express integration; it moved to a
// standalone package. This app runs Express 4, so it uses the express4 build.
import { expressMiddleware } from '@as-integrations/express4';
import type pg from 'pg';

import { typeDefs } from './graphql/schema.js';
import { createResolvers, type ResolverContext } from './graphql/resolvers/index.js';
import { createAuthMiddleware, type JwtPayload } from './middleware/auth.js';
import { queryTimer } from './middleware/queryTimer.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { createHealthRoutes } from './rest/healthRoutes.js';
import { createLineageRoutes } from './rest/lineageRoutes.js';
import { createQualityRoutes } from './rest/qualityRoutes.js';
import { createClassificationRoutes } from './rest/classificationRoutes.js';
import { createPipelineRoutes } from './rest/pipelineRoutes.js';
import { createReportRoutes } from './rest/reportRoutes.js';

import type { LineageEngine } from '../lineage/LineageEngine.js';
import type { EventPublisher } from '../events/EventPublisher.js';
import type { QualityValidator } from '../quality/QualityValidator.js';
import type { QualityTrendTracker } from '../quality/QualityTrendTracker.js';
import type { ClassificationEngine } from '../classification/ClassificationEngine.js';
import type { PipelineObserver } from '../observability/PipelineObserver.js';
import depthLimit from 'graphql-depth-limit';
import { AppError } from '../shared/errors.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('api:server');

export interface ServerDependencies {
  pool: pg.Pool;
  lineageEngine: LineageEngine;
  publisher: EventPublisher;
  qualityValidator: QualityValidator;
  trendTracker: QualityTrendTracker;
  classificationEngine: ClassificationEngine;
  pipelineObserver: PipelineObserver;
  jwtSecret: string;
  jwtIssuer: string;
  graphqlDepthLimit: number;
  graphqlComplexityLimit: number;
}

export async function createServer(deps: ServerDependencies): Promise<{ app: express.Express; apollo: ApolloServer<ResolverContext> }> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // API server, not serving HTML
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8100',
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(queryTimer);

  // Health routes (unauthenticated)
  app.use(createHealthRoutes(deps.pool));

  // Auth middleware for all /api routes
  const auth = createAuthMiddleware(deps.jwtSecret, deps.jwtIssuer);
  app.use('/api', auth);
  app.use('/api', createRateLimiter());

  // REST routes
  app.use('/api/v1', createLineageRoutes(deps.lineageEngine, deps.publisher));
  app.use('/api/v1', createQualityRoutes(deps.qualityValidator, deps.trendTracker));
  app.use('/api/v1', createClassificationRoutes(deps.classificationEngine));
  app.use('/api/v1', createPipelineRoutes(deps.pipelineObserver));
  app.use('/api/v1', createReportRoutes(deps.pool));

  // GraphQL with Apollo Server
  const resolvers = createResolvers();
  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    validationRules: [depthLimit(deps.graphqlDepthLimit)],
    plugins: [],
  });

  await apollo.start();

  // Apollo Server middleware — cast needed due to Express type version mismatch
  const apolloMiddleware = expressMiddleware(apollo, {
    context: async ({ req }) => {
      const user = (req as unknown as express.Request & { user?: JwtPayload }).user;
      return {
        lineageEngine: deps.lineageEngine,
        qualityValidator: deps.qualityValidator,
        trendTracker: deps.trendTracker,
        classificationEngine: deps.classificationEngine,
        pipelineObserver: deps.pipelineObserver,
        user,
      } as ResolverContext;
    },
  });
  app.use('/graphql', auth, apolloMiddleware as unknown as express.RequestHandler);

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
        details: err.details,
      });
    } else {
      logger.error('Unhandled error', { error: err.message });
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      });
    }
  });

  return { app, apollo };
}
