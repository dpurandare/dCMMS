# dCMMS Security Audit Report — **WITHDRAWN**

**Status:** 🔴 **WITHDRAWN 2026-09-19.** The conclusions of the November 2025
audit are not supported and must not be relied on.
**Withdrawn under:** REV-024
**Original document:** recoverable from git — `git show fe3d936:docs/security/security-audit-report.md`

---

## Why it was withdrawn

The original stated:

> **Overall Security Rating:** 🟢 **EXCELLENT** (93/100)
> ✅ **0 Critical Vulnerabilities** · ✅ **0 High Vulnerabilities**
> **Production Readiness:** ✅ **APPROVED** for deployment

Every one of those claims was contradicted by the code at the time it was
written.

### The document disagreed with itself

This is the important part, and it is not a case of anyone inventing results.
The **body** of the report was careful and honest. The **summary** was not, and
the summary is what everyone read.

| Section | What the body said | What the summary said |
| :------ | :----------------- | :-------------------- |
| §4.1 Snyk scan | ⚪ **PENDING** — "requires `npm install`", all three scan checkboxes unticked | ✅ 0 Critical, 0 High |
| §4.2 Known vulnerable dependencies | ⚪ **UNKNOWN** (requires Snyk scan) | ✅ 0 Critical, 0 High |
| §5.1 OWASP ZAP | ⚪ **PENDING** — requires Docker and a running application | 🟢 LOW deployment risk |
| §7.1 Vulnerability statistics | — | CRITICAL 0 · HIGH 0 · 🟢 **PRODUCTION READY** |

**The report counted "not tested" as "zero findings."** Three sections said the
work had not been done; by §7 that had become a table of zeros, and by the
executive summary a deployment approval. Nothing in between flagged the
substitution.

§5.2 compounded it: "Manual Penetration Testing — ✅ **COMPLETED (Code
Review)**", a table of ten ✅ PASS results produced by reading code rather than
attacking a running system. Two of those entries were wrong:

- **"Authorization Bypass ✅ PASS — Tenant isolation enforced."** 16 route files
  and 28 service files contain no reference to `tenantId` at all, and
  `routes/notifications.ts:513` reads
  `tenantId: "default-tenant-id" // TODO: Get from auth context`. There is no
  cross-tenant test in the repository. See REV-020.
- **"Brute Force ✅ PASS — Rate limiting enabled."** The only limit is a global
  100 req/min, which is not a credential-stuffing defence. There is no
  per-account lockout or failed-attempt tracking. See REV-022.

One entry was right, and interestingly so: **"CSRF ✅ PASS — JWT tokens
(stateless)."** That reasoning is correct, and it contradicts the 277-line CSRF
subsystem the team built. See REV-018.

### What was actually true at the time

| Claim in the report | Measured |
| :------------------ | :------- |
| 0 critical, 0 high vulnerabilities | **88 vulnerabilities: 5 critical, 42 high** across both projects (REV-023) |
| "industry-standard implementations for authentication (JWT)" | `plugins/jwt.ts:20` fell back to the committed literal `"changeme-secret-key"` when `JWT_SECRET` was unset (REV-001) |
| "SQL injection protection (ORM)" | The ORM itself carried a SQL-injection advisory via improperly escaped identifiers (REV-023) |
| "APPROVED for deployment" | `POST /api/v1/auth/login` returned **500** on a freshly provisioned stack — `relation "refresh_tokens" does not exist` (REV-011) |

The application could not be logged into. It was approved for production anyway,
because nothing in the approval path required anyone to start it.

---

## The current security position

This replaces the rating. It is deliberately not a score.

**Fixed and verified** (Phase 0 and Phase 1 of the review):

- Hardcoded JWT secret fallback removed; boot refuses to start on a missing,
  placeholder, or under-64-character secret (REV-001)
- All 23 credential-shaped `process.env.X || "<literal>"` fallbacks removed,
  including a production admin password that was hardcoded *and* printed to
  stdout (REV-002)
- 67 of 88 dependency vulnerabilities cleared, including the ORM's SQL-injection
  advisory (REV-023)
- Content-Security-Policy now enforcing, with per-request nonces, instead of
  `script-src 'unsafe-inline' 'unsafe-eval'` (REV-019)
- Dead second RBAC vocabulary deleted; frontend/backend permission parity now
  tested, which immediately caught three permissions that had drifted (REV-021)
- Auto-seeding can no longer run in an environment that failed to set
  `NODE_ENV` (REV-016)

**Known and not fixed:**

- `docs/review/accepted-risks.md` — AR-001 `fast-jwt`, AR-002 `next@14`,
  AR-003 eslint tooling. AR-001 is analysed advisory by advisory; AR-002 is
  **unquantified**.
- REV-017 — access and refresh tokens are in `localStorage`; any XSS yields the
  7-day refresh token. Decision taken to move the refresh token to an HttpOnly
  cookie; not yet implemented.
- REV-020 — tenant isolation is **unaudited and untested**. In a multi-tenant
  CMMS this is the highest-consequence bug class available.
- REV-022 — no login throttling or account lockout.

**No penetration test has been performed against a running dCMMS.** The
original §5.1 was honest that ZAP had never been run, and that is still true.

---

## What has to change before a report like this is written again

The failure was structural, not personal. A reviewer working from the body of
that document would have reached the right conclusions; the format let a
summary table overwrite them, and the summary carried a sign-off field.

1. A section whose status is PENDING or UNKNOWN may not contribute a zero to a
   vulnerability count. Absence of a scan is not absence of findings.
2. "Production ready" requires evidence that the application starts, that a user
   can log in, and that the checks in question were executed — each with pasted
   output. This is the evidence rule already adopted for
   `TasksTracking/15_Review_Remediation.md` (REV-057).
3. A code-reading exercise is a code review. It is not a penetration test and
   must not be recorded in a row labelled one.

Findings register: [`TasksTracking/15_Review_Remediation.md`](../../TasksTracking/15_Review_Remediation.md)
Accepted risks: [`docs/review/accepted-risks.md`](../review/accepted-risks.md)
