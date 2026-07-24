# Security scan report — bulletproof-agentic-data-plane

This repository is scanned with [Code Hardener](https://codehardener.local) using the
**standard** profile (12 code-appropriate scanners: trivy, gitleaks, opengrep, checkov,
grype, syft, package-validator, oxlint, ruff, actionlint, jscpd, typos).

## Result

| Metric | Value |
|--------|-------|
| Score | **813 / 1000** (attestation certificate) |
| Critical | **0** |
| High | **0** |
| Medium | 41 |
| Low | 311 |
| Secrets (gitleaks) | **PASS — 0** |
| Scan ID | `30d9a63e-565d-433c-87de-7e24b472f1ee` |
| Branch / date | `main` · 2026-07-24 |
| Attestation | `17350e84-9245-4a48-9e50-5a3001fa1f56` (in-toto, ed25519) |

**0 critical and 0 high findings.** All high-severity findings from the initial scan were
remediated before publication.

Signed artifacts from this scan:

- [Attestation certificate PDF](bulletproof-agentic-data-plane-scan-report.pdf) (85 pages)
- [Full findings report (Markdown)](scan-report-full.md)
- [SARIF](scan-report.sarif.json)
- [Attestation (JSON)](attestation.json)

## Findings fixed to reach 0 critical / 0 high

| # | Severity | Scanner(s) | Finding | Fix |
|---|----------|-----------|---------|-----|
| 1 | HIGH | grype, trivy | **CVE-2026-48779** — `ws` memory-exhaustion DoS (fragmented frames). | Bumped `ws` to **8.21.1** (direct dependency). |
| 2 | HIGH | grype, trivy | **CVE-2026-12143** — `form-data` CRLF injection in multipart field/filenames (≤ 4.0.5). | Pinned `form-data` to **4.0.6** via an npm `overrides` entry (transitive dependency). |
| 3 | HIGH | opengrep `missing-user` | Container image stages did not declare a `USER`, so processes could run as **root**. | Added non-root `USER node` to the build and API runtime stages; `USER nginx` to the dashboard stage (with `chown` + writable pid path). |
| 4 | HIGH | trivy dockle `DS-0002` | Container runs as root user. | Same non-root `USER` remediation as above. |
| 5 | HIGH | trivy dockle `DS-0029` | `apt-get install` without `--no-install-recommends`. | Added `--no-install-recommends` to both `apt-get install` steps. |

After remediation the standard profile was re-run and confirmed **0 critical / 0 high**.

## What remains (low-risk, not blocking)

Per policy, medium/low findings are documented rather than force-fixed (some "fixes" — e.g.
stripping unused-variable guards — are cosmetic or would remove defensive code). Residual
findings:

- **Medium (41):** mostly cosmetic — `oxlint` unused-variable hints in dashboard code,
  `opengrep` notes on Express route params handled by `zod` validation, `insecure-random`
  suggestions in non-security dashboard layout code, and `github-actions-mutable-action-tag`
  advisories on CI action tags. A small number are **medium-severity** dependency advisories
  (`CVE-2026-44288`, `CVE-2026-8723`, `CVE-2026-41907`, `GHSA-9q82-xgwf-vj6h`) with no
  fixed release that also satisfies current constraints at the time of scanning; these are
  tracked for the next dependency-update cycle (Dependabot is configured — see
  `.github/dependabot.yml`).
- **Low (311):** informational lint/style and transitive advisory noise.

## Reproduce

```bash
# Standard profile, Code Hardener API
curl -X POST http://localhost:7002/api/v1/scans \
  -H 'X-User-Id: <your-id>' -H 'Content-Type: application/json' \
  -d '{"projectId":"<id>","repositoryUrl":"<repo>","scanType":"standard","branch":"main"}'
```

---

Apache-2.0 © 2026 bulletproofsoftware-ai. See [LICENSE](../../LICENSE) and [NOTICE](../../NOTICE).
