# Overview — bulletproof-agentic-data-plane

`bulletproof-agentic-data-plane` is a TypeScript service that gives AI agents a
**governed** way to read and write data. It fronts your data with authentication,
rate limiting, and per-request query timing, classifies data by sensitivity,
scores data quality, tracks lineage as a tamper-evident hash chain, and streams
access/lineage events to a governance audit bus.

It exposes both a **GraphQL** API and a **REST** API over the same engines, plus
a **React/D3 lineage dashboard**.

## What it does

| Capability | Module | Summary |
|------------|--------|---------|
| **Data lineage** | `src/lineage/` | DAG-based provenance: sources → transforms → outputs, with backward trace and forward impact. Each event is HMAC-signed and hash-chained (tamper-evident). Agent identity is bound to every node; retention policies are enforced. |
| **Data classification** | `src/classification/` | Hybrid pattern + confidence-scored classification into four tiers (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`). Four versioned classifiers: `pii-detector`, `phi-detector`, `insurance-classifier`, `financial-detector`. Low-confidence detections are queued for human review; a compliance officer can override with a rationale. |
| **Data quality** | `src/quality/` | Scores a dataset 0–1000 across four dimensions (completeness, accuracy, consistency, timeliness). Blocks promotion below a configurable threshold (default 700) and tracks trends with decline alerts. |
| **Pipeline observability** | `src/observability/` | Detects four anomaly classes — schema drift, volume anomaly, null-rate spike, SLA breach — and notifies subscribed consumers via webhook. |
| **Regulatory reports** | `src/reports/` | Generates DOI, HIPAA, and rate-filing reports as JSON or PDF, stored as report artifacts. |
| **Event backbone** | `src/events/` | Hash-chained event stream (`HashChainedEventStream`), HMAC-SHA256 signing (`HmacSigner`), and a bridge to a local SQLite governance audit bus (`AuditBusBridge`). |

## Architecture

```
                 ┌────────────────────────────────────────────┐
   Agents /      │  API server (Express, port 8099)           │
   dashboard ───▶│  helmet · CORS · JWT auth · rate limit ·    │
                 │  query timer                                │
                 │   ├── GraphQL  (Apollo, /graphql)           │
                 │   └── REST     (/api/v1/*)                   │
                 └──────────────┬─────────────────────────────┘
                                │
        ┌───────────────────────┼────────────────────────────┐
        ▼            ▼          ▼           ▼                 ▼
   Lineage      Classification  Quality   Pipeline         Reports
   Engine       Engine          Validator Observer         Generator
        └───────────────────────┴────────────────────────────┘
                                │
                     EventPublisher (hash chain)
                        ├── PostgreSQL (lineage_event_chain, …)
                        └── SQLite governance audit bus
```

- **API server** — `src/api/server.ts`. Express with `helmet`, CORS, `express.json` (1 MB
  limit), a query-timing middleware that stamps `X-Query-Time-Ms` on every response,
  JWT auth on `/api/*` and `/graphql`, and a rate limiter (100 req/min).
- **GraphQL** — Apollo Server (`@apollo/server`) at `/graphql`, with a configurable
  query-depth limit (`graphql-depth-limit`, default 10). Introspection is disabled when
  `NODE_ENV=production`.
- **REST** — routers mounted under `/api/v1` for lineage, quality, classification,
  pipelines, and reports. Health/readiness probes are unauthenticated at `/health` and `/ready`.
- **Persistence** — PostgreSQL via `pg`, schema managed by numbered SQL migrations in
  `src/db/migrations/`. A local SQLite file backs the governance audit bus.
- **Dashboard** — a Vite/React/D3 lineage explorer in `src/dashboard/` (DAG viewer, node
  detail, classification heatmap, quality-trend and pipeline-health panels).

## Data tiers & roles

- **Tiers:** `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
- **Roles** (JWT `role` claim, ascending privilege): `viewer`, `analyst`,
  `compliance_officer`, `admin`. Each REST route and mutation enforces a required role.

## What is NOT covered here

This document describes only what exists in the source tree. The event-type catalogue in
`src/events/types.ts` also defines `reconciliation`, `economics` (cost), and `compliance`
event categories, but the corresponding engine modules and their REST routes are **not
present in this repository**, so those endpoints are not documented. See
[`scan/scan-report.md`](scan/scan-report.md) and the repository README for current status.

---

Apache-2.0 © 2026 bulletproofsoftware-ai. See [LICENSE](../LICENSE) and [NOTICE](../NOTICE).
