export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  type Query {
    # Lineage queries
    lineageTrace(outputFieldId: ID!, maxDepth: Int): LineageTraceResult!
    lineageDag(pipelineId: ID!, maxNodes: Int): DagResult!
    lineageEvents(from: DateTime!, to: DateTime!, agentId: String, pipelineId: String, eventType: String, page: Int, limit: Int): LineageEventPage!

    # Quality queries
    qualityScore(datasetId: ID!): QualityScore
    qualityTrend(datasetId: ID!, days: Int): QualityTrend!

    # Classification queries
    classificationSummary(pipelineId: ID!): ClassificationSummary!
    pendingReviews(limit: Int): [ClassificationRecord!]!

    # Pipeline health
    pipelineHealth(pipelineId: ID!): PipelineHealth!
  }

  type Mutation {
    overrideClassification(input: OverrideInput!): ClassificationRecord!
    subscribeConsumer(input: ConsumerInput!): ConsumerSubscription!
  }

  type LineageTraceResult {
    outputFieldId: ID!
    path: [LineageNode!]!
    sources: [SourceInfo!]!
    transforms: [TransformInfo!]!
    totalNodes: Int!
    totalEdges: Int!
    durationMs: Int!
  }

  type LineageNode {
    nodeId: ID!
    operation: String!
    agentId: String!
    sessionId: String!
    transformFn: String
    schemaHash: String
    tier: DataTier
    metadata: JSON
    createdAt: DateTime!
  }

  type SourceInfo {
    sourceId: ID!
    sourceType: String!
    system: String!
  }

  type TransformInfo {
    nodeId: ID!
    operation: String!
    agentId: String!
  }

  type DagResult {
    pipelineId: ID!
    nodes: [DagNode!]!
    edges: [DagEdge!]!
    totalNodes: Int!
    totalEdges: Int!
  }

  type DagNode {
    id: ID!
    label: String!
    tier: DataTier!
    operation: String!
    agentId: String
    timestamp: DateTime!
  }

  type DagEdge {
    from: ID!
    to: ID!
    transform: String
  }

  type LineageEventPage {
    events: [JSON!]!
    total: Int!
    page: Int!
    limit: Int!
    durationMs: Int!
  }

  type QualityScore {
    scoreId: ID!
    datasetId: ID!
    pipelineId: ID
    totalScore: Int!
    completeness: Int!
    accuracy: Int!
    consistency: Int!
    timeliness: Int!
    blocked: Boolean!
    blockingThreshold: Int!
    failingChecks: [String!]
    scoredAt: DateTime!
  }

  type QualityTrend {
    datasetId: ID!
    trend: [TrendPoint!]!
    rolling7dAvg: Float!
    rolling30dAvg: Float!
    trendDirection: TrendDirection!
    alert: QualityAlert
  }

  type TrendPoint {
    date: String!
    avgScore: Float!
    minScore: Int!
    maxScore: Int!
  }

  type QualityAlert {
    alertId: ID!
    datasetId: ID!
    pipelineId: ID
    alertType: String!
    message: String!
    currentScore: Int!
    threshold: Int!
    createdAt: DateTime!
  }

  type ClassificationRecord {
    recordId: ID!
    fieldPath: String!
    pipelineId: ID
    detectedTier: DataTier!
    detectedType: String!
    classifierId: String!
    classifierVersion: String!
    confidence: Float!
    status: ClassificationStatus!
    overrideRationale: String
    overrideOfficer: String
    detectedAt: DateTime!
  }

  type ClassificationSummary {
    pipelineId: ID!
    total: Int!
    byTier: TierCounts!
    needsReview: Int!
  }

  type TierCounts {
    public: Int!
    internal: Int!
    confidential: Int!
    restricted: Int!
  }

  type PipelineHealth {
    pipelineId: ID!
    status: HealthStatus!
    anomalies: [PipelineAnomaly!]!
    lastRun: DateTime
    baselines: PipelineBaselines
  }

  type PipelineAnomaly {
    anomalyId: ID!
    pipelineId: ID!
    anomalyType: AnomalyType!
    severity: Severity!
    expectedValue: String
    actualValue: String
    affectedFields: [String!]
    detectedAt: DateTime!
  }

  type PipelineBaselines {
    volume: BaselineStat
    nullRate: BaselineStat
    slaMs: BaselineStat
  }

  type BaselineStat {
    value: Float!
    sigma: Float!
  }

  type ConsumerSubscription {
    subscriptionId: ID!
    pipelineId: ID!
    consumerId: ID!
    consumerName: String!
    webhookUrl: String!
    active: Boolean!
  }

  enum DataTier { PUBLIC INTERNAL CONFIDENTIAL RESTRICTED }
  enum ClassificationStatus { AUTO NEEDS_REVIEW OVERRIDDEN CONFIRMED }
  enum AnomalyType { SCHEMA_DRIFT VOLUME_ANOMALY NULL_RATE_SPIKE SLA_BREACH }
  enum Severity { LOW MEDIUM HIGH CRITICAL }
  enum HealthStatus { HEALTHY DEGRADED UNHEALTHY }
  enum TrendDirection { IMPROVING STABLE DECLINING }

  input OverrideInput {
    recordId: ID!
    newTier: DataTier!
    rationale: String!
    officerToken: String!
  }

  input ConsumerInput {
    pipelineId: ID!
    consumerId: ID!
    consumerName: String!
    webhookUrl: String!
    ackTimeoutMinutes: Int
  }
`;
