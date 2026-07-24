# Install — bulletproof-agentic-data-plane

## Prerequisites

- **Node.js ≥ 20** (see `engines` in `package.json`).
- **PostgreSQL** — reachable at `DATABASE_URL`. Schema is created automatically by the
  bundled migrations on startup.
- A writable path for the **SQLite governance audit bus** (`AUDIT_BUS_DB_PATH`).
- Build toolchain for native modules — `better-sqlite3` compiles native bindings during
  `npm install`. On Linux/macOS ensure a C/C++ toolchain (e.g. `build-essential` /
  Xcode CLT) and Python are available.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Then edit `.env`. Required variables (the process refuses to start if these are unset):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string. |
| `AUDIT_BUS_SERVICE_KEY` | HMAC signing key for the audit bus — **≥ 32 characters**. Generate with `openssl rand -hex 32`. |
| `JWT_SECRET` | Secret used to sign/verify API JWTs (HS256). Generate with `openssl rand -hex 32`. |

Common optional variables (defaults shown):

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUDIT_BUS_DB_PATH` | `./data/audit.db` | SQLite audit-bus file. |
| `JWT_ISSUER` | `agentic-data-plane` | Expected JWT `iss` claim. |
| `API_PORT` | `8099` | API server port. |
| `DASHBOARD_PORT` | `8100` | Dashboard port. |
| `CORS_ORIGIN` | `http://localhost:8100` | Allowed browser origin. |
| `QUALITY_BLOCKING_THRESHOLD` | `700` | Quality score below which promotion is blocked. |
| `CLASSIFICATION_MIN_CONFIDENCE` | `0.75` | Minimum confidence before a detection is auto-accepted. |
| `GRAPHQL_DEPTH_LIMIT` | `10` | Max GraphQL query depth. |
| `GRAPHQL_COMPLEXITY_LIMIT` | `1000` | Query-complexity budget. |

See [`.env.example`](../.env.example) for the full list (lineage retention, pipeline
anomaly thresholds, etc.).

## 3. Build & run

```bash
npm run build        # tsc → dist/
npm start            # node dist/index.js
```

On startup the service runs migrations, verifies DB connectivity, initializes the event
publisher, and listens on `API_PORT`:

```
API server listening on port 8099
GraphQL endpoint: http://localhost:8099/graphql
Health check: http://localhost:8099/health
```

Run migrations standalone with `npm run migrate`.

## Development mode

```bash
npm run dev          # tsx watch src/index.ts (hot reload)
npm test             # jest unit tests
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

The dashboard is developed separately:

```bash
npm run dashboard:dev      # vite dev server on :8100
npm run dashboard:build    # production build
```

## Docker

A multi-stage [`Dockerfile`](../Dockerfile) is included with an `api` stage (Node,
exposes 8099) and a `dashboard` stage (nginx, exposes 8100). Both runtime stages run as
**non-root** users.

```bash
docker build --target api -t agentic-data-plane-api .
docker build --target dashboard -t agentic-data-plane-dashboard .
```

> **Scope note:** this repository ships six engines — lineage, classification, quality,
> observability, reports, and events. `npm run build`, `npm start`, and the Docker `api`
> stage compile and run against those. See [`scan/scan-report.md`](scan/scan-report.md)
> for the security posture of the shipped code.

---

Apache-2.0 © 2026 bulletproofsoftware-ai. See [LICENSE](../LICENSE) and [NOTICE](../NOTICE).
