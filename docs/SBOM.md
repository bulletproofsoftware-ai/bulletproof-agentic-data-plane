# Software Bill of Materials (SBOM)

A CycloneDX SBOM for the production dependency tree is committed alongside this document:

- [`agentic-data-plane.cyclonedx.json`](agentic-data-plane.cyclonedx.json) — CycloneDX
  1.5, generated with `npm sbom --sbom-format cyclonedx --omit dev`.

## Summary

| Metric | Value |
|--------|-------|
| Format | CycloneDX 1.5 |
| Root component | `bulletproof-agentic-data-plane@1.0.0` |
| Total components (production) | **284** |

## License distribution

| License | Components |
|---------|-----------:|
| MIT | 219 |
| ISC | 38 |
| BSD-3-Clause | 16 |
| Apache-2.0 | 4 |
| BSD-2-Clause | 1 |
| 0BSD | 1 |
| Unlicense | 1 |
| (MIT OR WTFPL) | 1 |
| (BSD-2-Clause OR MIT OR Apache-2.0) | 1 |
| (MIT AND BSD-3-Clause) | 1 |
| No SPDX license in package metadata | 1 |

All resolved licenses are permissive (MIT/ISC/BSD/Apache/0BSD/Unlicense family) and
compatible with this project's Apache-2.0 license.

**No-license component:** `png-js@1.0.0` (a transitive dependency of `pdfkit`) publishes no
`license` field in its package metadata. Its source repository is MIT-licensed; the omission
is upstream packaging, not a restrictive license.

## Direct dependencies

| Package | Version | Role |
|---------|---------|------|
| `@apollo/server` | ^4.11.0 | GraphQL server |
| `express` | ^4.21.0 | HTTP framework |
| `graphql` | ^16.9.0 | GraphQL runtime |
| `graphql-depth-limit` | ^1.1.0 | GraphQL depth guard |
| `graphql-subscriptions`, `graphql-ws` | ^2.0.0 / ^5.16.0 | GraphQL subscriptions |
| `helmet` | ^8.0.0 | Security headers |
| `cors` | ^2.8.5 | CORS |
| `express-rate-limit` | ^7.4.0 | Rate limiting |
| `jsonwebtoken` | ^9.0.2 | JWT auth (HS256) |
| `pg` | ^8.13.0 | PostgreSQL client |
| `better-sqlite3` | ^11.7.0 | SQLite audit bus |
| `d3` | ^7.9.0 | Dashboard graph layout |
| `pdfkit` | ^0.15.0 | Report PDFs |
| `uuid` | ^10.0.0 | Identifiers |
| `ws` | ^8.21.1 | WebSocket transport |
| `zod` | ^3.23.0 | Input validation |

## Security-relevant version pins

The following were bumped during security remediation (see
[`scan/scan-report.md`](scan/scan-report.md)):

- **`ws` → 8.21.1** — fixes CVE-2026-48779 (memory-exhaustion DoS).
- **`form-data` → 4.0.6** — fixes CVE-2026-12143 (CRLF injection); pinned via an npm
  `overrides` entry (transitive dependency).

## Base images

The multi-stage [`Dockerfile`](../Dockerfile) builds on:

- `node:20-slim` — build + API runtime stages (runs as non-root `node`).
- `nginx:alpine` — dashboard runtime stage (runs as non-root `nginx`).

## Regenerating

```bash
npm install
npm sbom --sbom-format cyclonedx --omit dev > docs/agentic-data-plane.cyclonedx.json
```

---

Apache-2.0 © 2026 bulletproofsoftware-ai. See [LICENSE](../LICENSE) and [NOTICE](../NOTICE).
