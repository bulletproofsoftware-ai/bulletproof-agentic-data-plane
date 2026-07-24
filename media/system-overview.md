# Bulletproof-Agentic-Data-Plane Technical Briefing

## Executive Summary

The **bulletproof-agentic-data-plane** is a TypeScript-based service designed to provide AI agents with a governed, authenticated, and audited framework for reading and writing data. It acts as a specialized data plane that interfaces with existing data assets through both GraphQL and REST APIs. The system prioritizes data integrity and security by employing a tamper-evident hash-chained lineage log, automated data classification across four sensitivity tiers, and a rigorous quality scoring engine.

Operationalized via Node.js and PostgreSQL, the service includes a React/D3-based dashboard for lineage exploration and pipeline health monitoring. While the core engines for lineage, classification, quality, and observability are fully functional and unit-tested, the current repository lacks specific modules for reconciliation, economics, and compliance, which prevents a complete "out-of-the-box" build without operator intervention.

## Core Functional Modules

### 1. Data Lineage and Provenance
The lineage module (`src/lineage/`) manages a Directed Acyclic Graph (DAG) representing the flow from data sources to transforms and final outputs. 
*   **Tamper-Evidence:** Every governance event is HMAC-SHA256 signed and chained to the previous event's hash. This creates a lineage log where modifications, deletions, or insertions can be detected via a dedicated verification endpoint (`/api/v1/lineage/chain/verify`).
*   **Retention Management:** The `RetentionManager` enforces policies based on data tiering—Standard (7 years) and Restricted (10 years). Deletions are treated as events and must be authorized by an officer.

### 2. Data Classification
The classification engine (`src/classification/`) uses a hybrid pattern-matching and confidence-scoring model to sort data into four tiers: **PUBLIC, INTERNAL, CONFIDENTIAL,** and **RESTRICTED**.
*   **Classifiers:** The system utilizes four versioned, hot-swappable classifiers: `pii-detector`, `phi-detector`, `insurance-classifier`, and `financial-detector`.
*   **Human-in-the-Loop:** Detections with a confidence score below the `CLASSIFICATION_MIN_CONFIDENCE` threshold (default 0.75) are routed to a review queue for manual override or confirmation by a compliance officer.

### 3. Data Quality and Observability
The data quality engine (`src/quality/`) evaluates datasets on a scale of 0–1000, distributed across four dimensions (completeness, accuracy, consistency, and timeliness), each worth 250 points.
*   **Quality Gates:** A `QUALITY_BLOCKING_THRESHOLD` (default 700) prevents the promotion of failing datasets.
*   **Anomaly Detection:** The observability module tracks four specific anomaly classes:
    1.  Schema drift
    2.  Volume anomaly
    3.  Null-rate spikes
    4.  SLA breaches

## System Architecture and Security

### Technical Stack
| Component | Technology |
| :--- | :--- |
| Runtime | Node.js ≥ 20 |
| API Framework | Express (REST) & Apollo Server (GraphQL) |
| Primary Database | PostgreSQL (via `pg` connection pool) |
| Audit Backbone | SQLite (via `better-sqlite3`) |
| Frontend | React, Vite, and D3.js |
| Security | Helmet, CORS, and JWT (HS256) |

### Security Posture
The service enforces a strict security model:
*   **Authentication:** Exclusively uses JWT with HS256 signing. Tokens expire after one hour.
*   **Role-Based Access Control (RBAC):** Four hierarchical roles (viewer, analyst, compliance_officer, admin) restrict access to specific REST routes and GraphQL mutations.
*   **Operational Security:** Container images (Node/Nginx) run as non-root users. JSON bodies are capped at 1 MB, and authenticated routes are rate-limited to 100 requests per minute per client.
*   **Audit Bus:** A local SQLite governance audit bus tracks all access and lineage events, bridged via the `AuditBusBridge`.

## Database Schema Reference

The system uses numbered SQL migrations to manage the following core tables:

| Table / View | Purpose |
| :--- | :--- |
| `lineage_nodes`, `lineage_edges` | Core DAG provenance graph. |
| `quality_scores` | Per-dataset quality metrics. |
| `classification_records` | Detected and overridden data classifications. |
| `pipeline_baselines` | Volume, null-rate, and SLA performance baselines. |
| `consumer_subscriptions` | Webhook configurations for pipeline notifications. |
| `lineage_event_chain` | The hash-chained, HMAC-signed event log. |
| `quality_trends` (view) | Aggregated rolling quality trends. |

## Important Quotes

> "Every governance event is HMAC-SHA256 signed and chained to the previous event's hash, making the lineage log tamper-evident." — *ADMINISTRATOR.md*

> "The service exposes two equivalent surfaces over the same engines: a GraphQL API at /graphql and a REST API under /api/v1. Both require a JWT bearer token." — *HOW-TO-USE.md*

> "Known limitation: src/index.ts / src/api/server.ts wire in reconciliation, economics, and compliance engines/routes whose module files are absent from this repository, so a full npm run build... does not complete as shipped." — *ADMINISTRATOR.md / INSTALL.md*

## Actionable Insights for Implementation

*   **Address Module Gaps Prior to Deployment:** Operators must either supply the missing reconciliation, economics, and compliance modules or remove the associated wiring in `src/index.ts` and `src/api/server.ts` to achieve a successful build.
*   **Key Security Configuration:** The `AUDIT_BUS_SERVICE_KEY` must be at least 32 characters long. Failure to meet this length will prevent the HMAC signer from initializing, aborting the startup process.
*   **Role Assignment Strategy:** Follow the "least privilege" principle when assigning JWT roles:
    *   Use **viewer** for general monitoring of health and lineage.
    *   Use **analyst** for quality validation and event querying.
    *   Reserve **compliance_officer** for classification overrides and report generation (DOI, HIPAA, RATE_FILING).
    *   Reserve **admin** for consumer webhook management.
*   **Quality Enforcement:** To ensure data integrity in production pipelines, utilize the `POST /quality/validate` endpoint to score datasets and the `GET /quality/enforce/:datasetId` endpoint to trigger the blocking threshold logic.