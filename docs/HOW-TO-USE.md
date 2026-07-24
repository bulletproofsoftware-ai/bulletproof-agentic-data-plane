# How to use — bulletproof-agentic-data-plane

The service exposes two equivalent surfaces over the same engines: a **GraphQL** API at
`/graphql` and a **REST** API under `/api/v1`. Both require a JWT bearer token; health
probes do not.

## Authentication

Every `/api/*` and `/graphql` request must carry a JWT signed with `JWT_SECRET`
(**HS256 only**, 1-hour expiry, `iss` must match `JWT_ISSUER`):

```
Authorization: Bearer <jwt>
```

The token payload carries `sub` (agent/user id) and `role`. Roles, in ascending
privilege: `viewer` → `analyst` → `compliance_officer` → `admin`. `generateToken()` in
`src/api/middleware/auth.ts` issues test tokens.

Responses include an `X-Query-Time-Ms` header. The API is rate-limited to **100 requests
per minute** per client (standard `RateLimit-*` headers returned).

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | none — returns `{status, timestamp, database}` |
| GET | `/ready` | none — returns `{ready:true}` when the DB is reachable |

## REST API (`/api/v1`)

Required role is shown per route.

### Lineage

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/lineage/nodes` | viewer+ | Paginated lineage nodes (filter by `operation`, `tier`, `agent_id`, `pipeline_id`, `page`, `limit`). |
| GET | `/lineage/trace/:outputFieldId` | viewer+ | Backward trace of an output field (optional `maxDepth`, 1–100). |
| GET | `/lineage/sources/:sourceId/outputs` | viewer+ | Forward impact — outputs derived from a source. |
| GET | `/lineage/events` | analyst+ | Query events by `from`/`to` (ISO), `agent_id`, `pipeline_id`, `event_type`, paginated. |
| GET | `/lineage/dag/:pipelineId` | viewer/analyst/admin | Full pipeline DAG (optional `maxNodes`, 1–5000). |
| GET | `/lineage/chain/verify` | compliance_officer+ | Verify hash-chain integrity (optional `pipeline_id`). |

### Quality

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/quality/datasets/:datasetId/score` | viewer+ | Latest quality score (404 if none). |
| GET | `/quality/datasets/:datasetId/trend` | analyst+ | Trend over `days` (1–365). |
| POST | `/quality/validate` | analyst/admin | Score a dataset from supplied metrics. |
| GET | `/quality/enforce/:datasetId` | analyst/admin | Enforce the blocking threshold for a dataset. |

`POST /quality/validate` body (all counts are non-negative integers unless noted):

```json
{
  "dataset_id": "orders_v2",
  "pipeline_id": "ingest-orders",
  "total_records": 10000,
  "total_required_fields": 50000,
  "non_null_required_fields": 49800,
  "validated_values": 120000,
  "total_values": 120000,
  "schema_conforming_records": 9995,
  "data_age_hours": 2,
  "sla_hours": 6,
  "config": { "blocking_threshold": 700 }
}
```

### Classification

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/classification/pipeline/:pipelineId` | analyst+ | Classifications + tier summary for a pipeline. |
| POST | `/classification/override` | compliance_officer+ | Override a detected tier (needs `record_id` UUID, `new_tier`, `rationale` ≥ 10 chars, `officer_token`). |
| GET | `/classification/reviews` | compliance_officer+ | Records queued for human review (`limit`, max 200). |
| GET | `/classification/classifiers` | analyst/admin | List registered classifier versions. |

### Pipelines

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/pipelines/:pipelineId/health` | viewer/analyst/admin | Pipeline health + anomalies + baselines. |
| GET | `/pipelines/:pipelineId/consumers` | analyst/admin | List subscribed consumers. |
| POST | `/pipelines/:pipelineId/consumers` | admin | Subscribe a consumer (`consumer_id`, `consumer_name`, `webhook_url`, optional `ack_timeout_minutes`). |

### Reports

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/reports/regulatory` | compliance_officer+ | Generate a `DOI`, `HIPAA`, or `RATE_FILING` report in `PDF` or `JSON`. |
| GET | `/reports/:reportId` | compliance_officer+ | Fetch a generated report artifact. |
| GET | `/reports` | compliance_officer+ | List report artifacts (`limit`, max 200). |

## GraphQL API (`/graphql`)

Apollo Server; introspection is on outside production. Query depth is capped
(`GRAPHQL_DEPTH_LIMIT`, default 10). Full SDL: `src/api/graphql/schema.ts`.

**Queries:** `lineageTrace`, `lineageDag`, `lineageEvents`, `qualityScore`,
`qualityTrend`, `classificationSummary`, `pendingReviews`, `pipelineHealth`.

**Mutations:** `overrideClassification`, `subscribeConsumer`.

Example — trace an output field:

```graphql
query {
  lineageTrace(outputFieldId: "field-123", maxDepth: 25) {
    outputFieldId
    totalNodes
    totalEdges
    durationMs
    sources { sourceId sourceType system }
    path { nodeId operation agentId tier createdAt }
  }
}
```

Example — override a classification (requires `compliance_officer` or `admin`):

```graphql
mutation {
  overrideClassification(input: {
    recordId: "…-uuid",
    newTier: RESTRICTED,
    rationale: "Contains policyholder SSNs confirmed on manual review",
    officerToken: "…"
  }) { recordId detectedTier status overrideOfficer }
}
```

## Data model reference

- **Tiers:** `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
- **Classification status:** `AUTO`, `NEEDS_REVIEW`, `OVERRIDDEN`, `CONFIRMED`.
- **Anomaly types:** `SCHEMA_DRIFT`, `VOLUME_ANOMALY`, `NULL_RATE_SPIKE`, `SLA_BREACH`.
- **Severity:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Report types:** `DOI`, `HIPAA`, `RATE_FILING`; formats `PDF`, `JSON`.

---

Apache-2.0 © 2026 bulletproofsoftware-ai. See [LICENSE](../LICENSE) and [NOTICE](../NOTICE).
