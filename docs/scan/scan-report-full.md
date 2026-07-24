# Security Scan Report: bulletproof-agentic-data-plane

**Scan ID:** `30d9a63e-565d-433c-87de-7e24b472f1ee`
**Date:** 2026-07-24T20:26:10.036Z
**Score:** 928/1000 (good)
**Branch:** main | **Commit:** `N/A`
**Profile:** standard

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 41 |
| Low | 311 |
| Info | 2 |
| **Total (open)** | **354** |

> **Note:** The counts above reflect _open_ findings only.
> 1 scanner(s) were skipped — see "Skipped Scanners" below.

## Scanners Executed

| Scanner | Status | Findings | Duration | Notes |
|---------|--------|----------|----------|-------|
| trivy | pass | 315 | 3.3s |  |
| gitleaks | pass | 0 | 0.6s |  |
| opengrep | pass | 25 | 7.3s |  |
| checkov | pass | 0 | 4.1s |  |
| grype | pass | 6 | 4.0s |  |
| syft | pass | 7 | 1.6s |  |
| package-validator | pass | 0 | 0.8s |  |
| oxlint | pass | 8 | 0.0s |  |
| ruff | skipped | 0 | 0.0s | _skipped: no_matching_files_ |
| actionlint | pass | 0 | 0.0s |  |
| jscpd | pass | 0 | 0.0s |  |
| typos | pass | 0 | 0.0s |  |
| _file_inventory | pass | 0 | 0.0s |  |

## Medium Findings (41)

### [MEDIUM] Variable 'idB' is declared but never used. Unused variables should start with a '_'.

- **File:** `src/dashboard/workers/layoutWorker.ts`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Variable 'idB' is declared but never used. Unused variables should start with a '_'.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Variable 'idB' is declared but never used. Unused variables should start with a '_'.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Variable 'idA' is declared but never used. Unused variables should start with a '_'.

- **File:** `src/dashboard/workers/layoutWorker.ts`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Variable 'idA' is declared but never used. Unused variables should start with a '_'.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Variable 'idA' is declared but never used. Unused variables should start with a '_'.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Variable 'nodeCount' is declared but never used. Unused variables should start with a '_'.

- **File:** `src/dashboard/workers/layoutWorker.ts`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Variable 'nodeCount' is declared but never used. Unused variables should start with a '_'.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Variable 'nodeCount' is declared but never used. Unused variables should start with a '_'.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Parameter 'context' is declared but never used. Unused parameters should start with a '_'.

- **File:** `src/classification/PIIDetector.ts`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Parameter 'context' is declared but never used. Unused parameters should start with a '_'.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Parameter 'context' is declared but never used. Unused parameters should start with a '_'.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Variable 'selectedNode' is declared but never used. Unused variables should start with a '_'.

- **File:** `src/dashboard/components/DAGViewer.tsx`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Variable 'selectedNode' is declared but never used. Unused variables should start with a '_'.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Variable 'selectedNode' is declared but never used. Unused variables should start with a '_'.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Identifier 'useCallback' is imported but never used.

- **File:** `src/dashboard/components/DAGViewer.tsx`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Identifier 'useCallback' is imported but never used.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Identifier 'useCallback' is imported but never used.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Parameter 'rolling30d' is declared but never used. Unused parameters should start with a '_'.

- **File:** `src/quality/QualityTrendTracker.ts`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Parameter 'rolling30d' is declared but never used. Unused parameters should start with a '_'.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Parameter 'rolling30d' is declared but never used. Unused parameters should start with a '_'.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Parameter 'rolling7d' is declared but never used. Unused parameters should start with a '_'.

- **File:** `src/quality/QualityTrendTracker.ts`
- **Scanner:** oxlint
- **Rule:** `OXLINT-UNKNOWN`

**What's wrong:** Parameter 'rolling7d' is declared but never used. Unused parameters should start with a '_'.

**How to fix:** Review this finding and apply the appropriate fix based on the description: Parameter 'rolling7d' is declared but never used. Unused parameters should start with a '_'.

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `/package-lock.json`
- **Scanner:** grype
- **Rule:** `GHSA-9q82-xgwf-vj6h`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** Apollo Server: Browser bug allows for bypass of XS-Search (read-only Cross-Site Request Forgery) prevention

**Code:**
```json
Package: @apollo/server
Version: 4.13.0
Type: npm
Language: javascript
```

**How to fix:** Update @apollo/server to version 5.5.0

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `/package-lock.json`
- **Scanner:** grype
- **Rule:** `CVE-2026-44288`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** protobufjs has overlong UTF-8 decoding

**Code:**
```json
Package: @protobufjs/utf8
Version: 1.1.0
Type: npm
Language: javascript
```

**How to fix:** Update @protobufjs/utf8 to version 1.1.1

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `/package-lock.json`
- **Scanner:** grype
- **Rule:** `CVE-2026-8723`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set

**Code:**
```json
Package: qs
Version: 6.14.2
Type: npm
Language: javascript
```

**How to fix:** Update qs to version 6.15.2

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `/package-lock.json`
- **Scanner:** grype
- **Rule:** `CVE-2026-41907`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided

**Code:**
```json
Package: uuid
Version: 9.0.1
Type: npm
Language: javascript
```

**How to fix:** Update uuid to version 11.1.1

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `/package-lock.json`
- **Scanner:** grype
- **Rule:** `CVE-2026-41907`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided

**Code:**
```json
Package: uuid
Version: 10.0.0
Type: npm
Language: javascript
```

**How to fix:** Update uuid to version 11.1.1

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Math.random() is not cryptographically secure. If this value is used for any security purpose (tokens, IDs, keys, etc.), use crypto.randomBytes() or crypto.randomUUID() instead.


- **File:** `src/dashboard/workers/layoutWorker.ts:48`
- **Scanner:** opengrep
- **Rule:** `configs.insecure-random-js-general`
- **CWE:** [CWE-330: Use of Insufficiently Random Values](https://cwe.mitre.org/data/definitions/330.html)

**What's wrong:** Math.random() is not cryptographically secure. If this value is used for any security purpose (tokens, IDs, keys, etc.), use crypto.randomBytes() or crypto.randomUUID() instead.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Math.random() is not cryptographically secure. If this value is used for any security purpose (tokens, IDs, keys, etc.), use crypto.randomBytes() or crypto.randomUUID() instead.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Math.random() is not cryptographically secure. If this value is used for any security purpose (tokens, IDs, keys, etc.), use crypto.randomBytes() or crypto.randomUUID() instead.


- **File:** `src/dashboard/workers/layoutWorker.ts:47`
- **Scanner:** opengrep
- **Rule:** `configs.insecure-random-js-general`
- **CWE:** [CWE-330: Use of Insufficiently Random Values](https://cwe.mitre.org/data/definitions/330.html)

**What's wrong:** Math.random() is not cryptographically secure. If this value is used for any security purpose (tokens, IDs, keys, etc.), use crypto.randomBytes() or crypto.randomUUID() instead.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Math.random() is not cryptographically secure. If this value is used for any security purpose (tokens, IDs, keys, etc.), use crypto.randomBytes() or crypto.randomUUID() instead.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/reportRoutes.ts:89`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/reportRoutes.ts:72`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/qualityRoutes.ts:99`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/qualityRoutes.ts:59`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/qualityRoutes.ts:40`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/pipelineRoutes.ts:49`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/pipelineRoutes.ts:34`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/pipelineRoutes.ts:33`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/pipelineRoutes.ts:22`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/lineageRoutes.ts:115`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/lineageRoutes.ts:104`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/lineageRoutes.ts:74`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/lineageRoutes.ts:63`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/classificationRoutes.ts:62`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/classificationRoutes.ts:28`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/classificationRoutes.ts:25`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Request parameter or query string used without validation. Validate and sanitize all user input before use.


- **File:** `src/api/rest/classificationRoutes.ts:24`
- **Scanner:** opengrep
- **Rule:** `configs.express-unvalidated-params`
- **CWE:** [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

**What's wrong:** Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Code:**
```typescript
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: Request parameter or query string used without validation. Validate and sanitize all user input before use.


**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. \`uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608\`.

- **File:** `.github/workflows/scorecard.yml:22`
- **Scanner:** opengrep
- **Rule:** `yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag`
- **CWE:** [CWE-1357: Reliance on Insufficiently Trustworthy Component](https://cwe.mitre.org/data/definitions/1357.html)
- **OWASP:** A08:2021 - Software and Data Integrity Failures

**What's wrong:** GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. `uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608`.

**Code:**
```yaml
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-gi

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. \`uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608\`.

- **File:** `.github/workflows/scorecard.yml:18`
- **Scanner:** opengrep
- **Rule:** `yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag`
- **CWE:** [CWE-1357: Reliance on Insufficiently Trustworthy Component](https://cwe.mitre.org/data/definitions/1357.html)
- **OWASP:** A08:2021 - Software and Data Integrity Failures

**What's wrong:** GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. `uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608`.

**Code:**
```yaml
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-gi

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. \`uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608\`.

- **File:** `.github/workflows/scorecard.yml:17`
- **Scanner:** opengrep
- **Rule:** `yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag`
- **CWE:** [CWE-1357: Reliance on Insufficiently Trustworthy Component](https://cwe.mitre.org/data/definitions/1357.html)
- **OWASP:** A08:2021 - Software and Data Integrity Failures

**What's wrong:** GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. `uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608`.

**Code:**
```yaml
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-gi

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. \`uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608\`.

- **File:** `.github/workflows/ci.yml:16`
- **Scanner:** opengrep
- **Rule:** `yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag`
- **CWE:** [CWE-1357: Reliance on Insufficiently Trustworthy Component](https://cwe.mitre.org/data/definitions/1357.html)
- **OWASP:** A08:2021 - Software and Data Integrity Failures

**What's wrong:** GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. `uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608`.

**Code:**
```yaml
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-gi

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. \`uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608\`.

- **File:** `.github/workflows/ci.yml:15`
- **Scanner:** opengrep
- **Rule:** `yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag`
- **CWE:** [CWE-1357: Reliance on Insufficiently Trustworthy Component](https://cwe.mitre.org/data/definitions/1357.html)
- **OWASP:** A08:2021 - Software and Data Integrity Failures

**What's wrong:** GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-github-action compromises. Pin the reference to a full 40-character commit SHA instead, e.g. `uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608`.

**Code:**
```yaml
requires login
```

**How to fix:** Review this finding and apply the appropriate fix based on the description: GitHub Actions step uses a mutable tag or branch reference. Tags and branch names can be silently repointed by the action owner, enabling supply-chain attacks — as seen in the trivy-action and kics-gi

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `package-lock.json`
- **Scanner:** trivy
- **Rule:** `CVE-2026-41907`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** uuid is for the creation of RFC9562 (formerly RFC4122) UUIDs. Prior to 14.0.0, v3, v5, and v6 accept external output buffers but do not reject out-of-range writes (small buf or large offset). This allows silent partial writes into caller-provided buffers. This vulnerability is fixed in 14.0.0.

**Code:**
```json
Package: uuid
Installed: 10.0.0
Fixed: 11.1.1, 12.0.1, 13.0.1
```

**How to fix:** Update uuid to version 11.1.1, 12.0.1, 13.0.1

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `package-lock.json`
- **Scanner:** trivy
- **Rule:** `CVE-2026-8723`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** ### Summary



`qs.stringify` throws `TypeError` when called with `arrayFormat: 'comma'` and `encodeValuesOnly: true` on an array containing `null` or `undefined`. The throw is synchronous and not handled by any of qs's null-related options (`skipNulls`, `strictNullHandling`).



### Details



In the comma + `encodeValuesOnly` branch, `lib/stringify.js:145` mapped the array through the raw encoder before joining:



```js



obj = utils.maybeMap(obj, encoder);



```



`utils.encode` (`lib/utils.js:195`) reads `str.length` with no null guard, so a `null` or `undefined` element throws `TypeError`. `skipNulls` and `strictNullHandling` are both checked in the per-element loop below this line and never get a chance to run.



Same class of bug as the filter-array path fixed in 0c180a4. The vulnerable shape of the comma + `encodeValuesOnly` branch was introduced in 4c4b23d ("encode comma values more consistently", PR #463, 2023-01-19), first released in v6.11.1.



#### PoC



```js



const qs = require('qs');



qs.stringify({ a: [null, 'b'] },      { arrayFormat: 'comma', encodeValuesOnly: true });



qs.stringify({ a: [undefined, 'b'] }, { arrayFormat: 'comma', encodeValuesOnly: true });



qs.stringify({ a: [null] },           { arrayFormat: 'comma', encodeValuesOnly: true });



// TypeError: Cannot read properties of null (reading 'length')



//     at encode (lib/utils.js:195:13)



//     at Object.maybeMap (lib/utils.js:322:37)



//     at stringify (lib/stringify.js:145:25)



```



#### Fix



`lib/stringify.js:145`, applied in 21f80b3 on `main` and released as v6.15.2:



```diff



- obj = utils.maybeMap(obj, encoder);



+ obj = utils.maybeMap(obj, function (v) {



+     return v == null ? v : encoder(v);



+ });



```



`null` and `undefined` now pass through `maybeMap` unchanged and reach the `join(',')` step as-is. For `{ a: [null, 'b'] }` this produces `a=,b`, matching the non-`encodeValuesOnly` comma path (which already joins before encoding and produces `a=%2Cb` for the same input). Single-element `[null]` arrays still collapse via the existing `obj.join(',') || null` and remain subject to `skipNulls` / `strictNullHandling` in the main loop.



### Affected versions



`>=6.11.1 <6.15.2` — fixed in v6.15.2.



The vulnerable code shape was introduced in 4c4b23d and first shipped in v6.11.1. Earlier versions — including all of 6.7.x, 6.8.x, 6.9.x, 6.10.x, and 6.11.0 — implemented the comma + `encodeValuesOnly` path differently (joining before encoding) and are not affected. Empirically verified across released versions.



### Impact



Application code that calls `qs.stringify` with both `arrayFormat: 'comma'` and `encodeValuesOnly: true` (both non-default) on input that may contain a `null` or `undefined` array element will throw synchronously instead of producing a query string. In a typical Node.js HTTP framework (Express, Fastify, Koa, hapi) the sync throw is caught by the framework's error boundary and the affected request returns a 500; the worker process does not exit and subsequent requests are unaffected. The "kills the worker process" framing applies only to call sites outside a request-handler error boundary (background jobs, startup paths, stream pipelines) or to deployments with framework error handling explicitly disabled.



The vulnerable input is a `null` or `undefined` entry inside an array; this is reachable from JSON request bodies or from application code constructing arrays from user input, but not from standard HTML form submissions (which produce strings or omitted fields, not literal `null`).

**Code:**
```json
Package: qs
Installed: 6.14.2
Fixed: 6.15.2
```

**How to fix:** Update qs to version 6.15.2

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `package-lock.json`
- **Scanner:** trivy
- **Rule:** `CVE-2026-44288`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** protobufjs compiles protobuf definitions into JavaScript (JS) functions. Prior to 7.5.6 and 8.0.2, protobufjs includes a minimal UTF-8 decoder that accepted overlong UTF-8 byte sequences and decoded them to their canonical characters instead of replacing them. An attacker who can provide protobuf binary data decoded through the affected UTF-8 path may be able to bypass application-level checks that inspect raw bytes before protobuf string decoding. For example, bytes that do not contain certain ASCII characters could decode to strings containing those characters. This vulnerability is fixed in 7.5.6 and 8.0.2.

**Code:**
```json
Package: @protobufjs/utf8
Installed: 1.1.0
Fixed: 1.1.1
```

**How to fix:** Update @protobufjs/utf8 to version 1.1.1

**Action:** Plan to fix this issue in your next sprint or release.

---

### [MEDIUM] Using outdated libraries with known security issues.

- **File:** `package-lock.json`
- **Scanner:** trivy
- **Rule:** `GHSA-9q82-xgwf-vj6h`
- **OWASP:** A06:2021-Vulnerable and Outdated Components

**What's wrong:** # Impact

In a Cross-Site Request Forgery attack, untrusted web content causes browsers to send authenticated requests to web servers which use cookies for authentication. While the web content is prevented from reading the request's response due to the Cross-Origin Request Sharing (CORS) protocol, an attacker may be able to cause side effects in the server ("CSRF" attack), or learn something about the response via timing analysis ("XS-Search" attack).

Apollo Server has a built-in feature which prevents CSRF and XS-Search attacks: it refuses to process GraphQL requests that could possibly have been sent by a spec-compliant web browser without a protective "preflight" step. See [Apollo Server's docs](https://www.apollographql.com/docs/apollo-server/security/cors) for more details on CORS, CSRF attacks, and Apollo Server's CSRF prevention feature.

This feature is fully effective against attacks carried out against users of spec-compliant browsers. Unfortunately, a major browser introduced a bug in 2025 which meant in certain cases, it failed to follow the CORS spec. The browser's maintainers have already committed to fixing the bug and making the browser spec-compliant again.

Even with this bug, Apollo Server's CSRF prevention feature **blocks** "side effect" CSRF attacks: Apollo Server will still correctly refuse to execute _mutations_ in requests that were not preflighted. However, some specially crafted authenticated GraphQL _queries_ can be issued across origins *without preflight* in buggy versions of this browser, allowing for XS-Search attacks: an attacker can analyze response times to learn facts about the responses to requests such as whether fields return null or approximately how many list entries are returned from fields.

GraphQL servers are only vulnerable if they rely on cookies (or HTTP Basic Auth) for authentication.

## Patches

The vulnerability is patched in `@apollo/server` v5.5.0. This release contains a single change: GraphQL requests sent in HTTP `GET` requests which contain a `Content-Type` header naming a type other than `application/json` are rejected. (`GET` requests with no `Content-Type` are allowed.) This change prevents XS-Search attacks even in browsers which are non-compliant in ways similar to this browser.

There are no known cases where GraphQL apps depend on the ability of clients to send non-empty `Content-Type` headers with GET requests other than `application/json`, so this change has not been made configurable; if this change breaks a use case, [file an issue](https://github.com/apollographql/apollo-server/issues) and more configurability can be added.

Apollo is not currently providing a patch for previous major versions of Apollo Server, which are all [end-of-life](https://www.apollographql.com/docs/apollo-server/previous-versions).

### Workarounds

If upgrading is not possible, this particular browser's bug can be mitigated by preventing any HTTP request with a `Content-Type` header containing `message/` from reaching Apollo Server (e.g. in a proxy or middleware).

For example, when using Apollo Server's Express integration, something like this can be placed *before* attaching `expressMiddleware` to the `app`:

```js
app.use((req, res, next) => {
  for (let i = 0; i < req.rawHeaders.length - 1; i += 2) {
    if (
      req.rawHeaders[i].toLowerCase() === 'content-type' &&
      req.rawHeaders[i + 1].includes('message/')
    ) {
      return res.status(415).json({ error: 'Content-Type not allowed' });
    }
  }
  next();
});
```

While the patch prevents a broader class of similar issues, the only known way to exploit this vulnerability is against a particular browser which currently plans to ship a fix in May 2026. If it is already past June 2026 and this vulnerability has not been addressed yet, it is likely that the system is not currently vulnerable. Upgrading to the latest version of Apollo Server is still recommended for the broader protection.

## Resources

The browser bug causes a similar vulnerability in Apollo Router; see https://github.com/apollographql/router/security/advisories/GHSA-hff2-gcpx-8f4p

**Code:**
```json
Package: @apollo/server
Installed: 4.13.0
Fixed: 5.5.0
```

**How to fix:** Update @apollo/server to version 5.5.0

**Action:** Plan to fix this issue in your next sprint or release.

---

## Low Findings (311)

- **SBOM-LICENSE-UNKNOWN**: Unknown License: png-js@1.0.0 (`/package-lock.json`)
- **SBOM-LICENSE-UNKNOWN**: Unknown License: ossf/scorecard-action@v2.4.0 (`/.github/workflows/scorecard.yml`)
- **SBOM-LICENSE-UNKNOWN**: Unknown License: github/codeql-action/upload-sarif@v3 (`/.github/workflows/scorecard.yml`)
- **SBOM-LICENSE-UNKNOWN**: Unknown License: agentic-data-plane@1.0.0 (`/package-lock.json`)
- **SBOM-LICENSE-UNKNOWN**: Unknown License: actions/setup-node@v4 (`/.github/workflows/ci.yml`)
- **SBOM-LICENSE-UNKNOWN**: Unknown License: actions/checkout@v4 (`/.github/workflows/scorecard.yml`)
- **SBOM-LICENSE-UNKNOWN**: Unknown License: actions/checkout@v4 (`/.github/workflows/ci.yml`)
- **CVE-2026-12590**: CVE-2026-12590: Vulnerability in body-parser@1.20.4 (`/package-lock.json`)
- **LICENSE-Apache-2.0**: License Compliance: Apache-2.0 in  (`LICENSE`)
- **LICENSE-MIT**: License Compliance: MIT in xtend (`package-lock.json`)
- **LICENSE-ISC**: License Compliance: ISC in wrappy (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in which-typed-array (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in which-collection (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in which-boxed-primitive (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in whatwg-url (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in whatwg-mimetype (`package-lock.json`)
- **LICENSE-BSD-2-Clause**: License Compliance: BSD-2-Clause in webidl-conversions (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in vary (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in value-or-promise (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in utils-merge (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in util-deprecate (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in unpipe (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in unicode-trie (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in unicode-properties (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in undici-types (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in typed-array-buffer (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in type-is (`package-lock.json`)
- **LICENSE-Apache-2.0**: License Compliance: Apache-2.0 in tunnel-agent (`package-lock.json`)
- **LICENSE-0BSD**: License Compliance: 0BSD in tslib (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in tr46 (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in toidentifier (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in to-buffer (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in tiny-inflate (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in tar-stream (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in tar-fs (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in strip-json-comments (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in string_decoder (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in stop-iteration-iterator (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in statuses (`package-lock.json`)
- **LICENSE-ISC**: License Compliance: ISC in split2 (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in simple-get (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in simple-concat (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in side-channel-weakmap (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in side-channel-map (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in side-channel-list (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in side-channel (`package-lock.json`)
- **LICENSE-(MIT AND BSD-3-Clause)**: License Compliance: (MIT AND BSD-3-Clause) in sha.js (`package-lock.json`)
- **LICENSE-ISC**: License Compliance: ISC in setprototypeof (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in set-function-name (`package-lock.json`)
- **LICENSE-MIT**: License Compliance: MIT in set-function-length (`package-lock.json`)

> ... and 261 more low findings

## Skipped Scanners (1)

Scanners that did not run on this scan, with the reason why and how to enable them.

| Scanner | Reason | How to enable |
|---------|--------|---------------|
| `ruff` | no_matching_files | No .py files found — Ruff requires a Python project |

## Recommendations

1. Update 313 vulnerable dependency/dependencies -- run `npm audit fix` or equivalent

---
*Generated by Code Hardener v0.1.0 | 2026-07-24T20:27:35.154Z*