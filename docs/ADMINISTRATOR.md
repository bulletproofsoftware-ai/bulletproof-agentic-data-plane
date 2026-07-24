# Administrator guide — bulletproof-agentic-data-plane

Operational reference for running the data plane.

## Configuration

Configuration is entirely env-driven and validated at startup by `src/shared/config.ts`.
Missing required variables (`DATABASE_URL`, `AUDIT_BUS_SERVICE_KEY`, `JWT_SECRET`) abort
the process with a clear error. `AUDIT_BUS_SERVICE_KEY` must be **≥ 32 characters** or the
HMAC signer refuses to initialize. See [INSTALL.md](INSTALL.md) for the full variable
table.

## Database & migrations

- PostgreSQL, accessed via a `pg` connection pool (`src/db/pool.ts`).
- Migrations are numbered SQL files in `src/db/migrations/`, applied automatically on
  startup (and via `npm run migrate`). Applied migrations are tracked in the
  `_data_plane_migrations` table so re-runs are idempotent.

Tables created by the migrations:

| Table / view | Migration | Purpose |
|--------------|-----------|---------|
| `lineage_nodes`, `lineage_edges` | 000 | DAG provenance graph. |
| `quality_scores` | 001 | Per-dataset quality scores. |
| `classification_records` | 002 | Detected/overridden classifications. |
| `pipeline_baselines` | 003 | Volume/null-rate/SLA baselines. |
| `consumer_subscriptions` | 004 | Webhook consumer subscriptions. |
| `retention_policies` | 005 | Retention rules per tier. |
| `report_artifacts` | 006 | Generated regulatory reports. |
| `lineage_event_chain` | 007 | Hash-chained, HMAC-signed event log. |
| `quality_trends` (view) | 008 | Rolling quality-trend aggregation. |
| `_data_plane_migrations` | 009 | Migration bookkeeping. |

## Authentication & authorization

- **JWT / HS256 only.** Tokens are verified against `JWT_SECRET`, must match `JWT_ISSUER`,
  and expire after 1 hour. Non-HS256 tokens are rejected (`src/api/middleware/auth.ts`).
- **Roles:** `viewer`, `analyst`, `compliance_officer`, `admin`. Each REST route and
  GraphQL mutation enforces a minimum role via `requireRole(...)`. Grant the least
  privilege needed:
  - *viewer* — read lineage/quality/pipeline health.
  - *analyst* — event queries, quality validation, classifier listing.
  - *compliance_officer* — classification overrides, review queue, chain verification, reports.
  - *admin* — consumer management + everything above.

## Security posture

- `helmet` sets security headers; CORS is restricted to `CORS_ORIGIN`.
- JSON bodies are capped at **1 MB**.
- Rate limiting: **100 req/min** per client on authenticated routes.
- GraphQL query depth is capped (`GRAPHQL_DEPTH_LIMIT`); introspection is disabled when
  `NODE_ENV=production`.
- Every governance event is HMAC-SHA256 signed and chained to the previous event's hash,
  making the lineage log tamper-evident. Use `GET /api/v1/lineage/chain/verify` to detect
  insertion/deletion/modification.
- Container images run as **non-root** (`node` for the API, `nginx` for the dashboard).

See [`scan/scan-report.md`](scan/scan-report.md) for the latest Code Hardener results.

## Classification tuning

- Four registered classifiers: `pii-detector`, `phi-detector`, `insurance-classifier`,
  `financial-detector` (all v1.0.0), managed by `ClassifierVersionManager` and
  hot-swappable by version.
- `CLASSIFICATION_MIN_CONFIDENCE` (default 0.75) gates auto-acceptance; below it, records
  land in the review queue (`GET /classification/reviews`) for a compliance officer.
- `CLASSIFICATION_PII_DETECTION_TARGET` (default 0.985) documents the detection-rate goal.

## Quality gates

- Scores run 0–1000 across completeness, accuracy, consistency, timeliness (250 pts each
  by default).
- `QUALITY_BLOCKING_THRESHOLD` (default 700) blocks promotion of failing datasets.
- `QUALITY_ALERT_DECLINE_PERCENT` (default 5) raises a trend alert on a decline of that
  magnitude.

## Pipeline observability

- Anomaly detection covers schema drift, volume anomaly, null-rate spike, and SLA breach.
- `PIPELINE_ANOMALY_SIGMA_THRESHOLD` (default 2.0) and
  `PIPELINE_NULL_RATE_SPIKE_THRESHOLD` (default 0.10) tune sensitivity.
- Subscribed consumers are notified by webhook; target delivery within
  `PIPELINE_ALERT_DELIVERY_SLA_MS` (default 30 000 ms).

## Retention

- `LINEAGE_RETENTION_YEARS_STANDARD` (7) and `LINEAGE_RETENTION_YEARS_RESTRICTED` (10)
  drive the `RetentionManager`. Deletions are recorded as `data.lineage_delete` events
  with a regulation reference and authorizing officer.

## Operations

- **Health:** `GET /health` (DB-backed) and `GET /ready` for orchestration probes.
- **Graceful shutdown:** `SIGTERM`/`SIGINT` stop the HTTP server and Apollo, close the
  audit bus, and drain the PG pool.
- **Logging:** structured logs via `src/shared/logger.ts`.

## Known limitation

`src/index.ts` / `src/api/server.ts` wire in `reconciliation`, `economics`, and
`compliance` engines/routes whose module files are **absent** from this repository, so a
full `npm run build` / `npm start` / Docker `api` build does not complete as shipped.
Operators should either supply those modules or remove the wiring before deploying. The
present engines (lineage, classification, quality, observability, reports, events)
type-check and are unit-tested.

---

Apache-2.0 © 2026 bulletproofsoftware-ai. See [LICENSE](../LICENSE) and [NOTICE](../NOTICE).
