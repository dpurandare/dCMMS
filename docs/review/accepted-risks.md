# Accepted risks

Every entry here is a known finding that has **not** been fixed, with the
reason, the exposure, and who accepted it. An entry is a decision, not an
excuse: each one names what would make it exploitable, so the assumption can be
re-checked rather than assumed to hold forever.

Referenced by REV-023's verification: `npm audit --audit-level=high` does not
exit 0 in either project, and these are why.

Last reviewed: 2026-09-19

---

## AR-001 — `fast-jwt` advisories, via `@fastify/jwt@8`

- **Severity as reported:** 3 critical, 1 high, 2 moderate
- **Fix requires:** `@fastify/jwt@10`, which requires `fastify@5`
- **Tracked by:** REV-023a
- **Accepted by:** _(pending — Deepak)_
- **Re-check when:** REV-023a lands, or any of the conditions below changes

`npm audit` reports these against `fast-jwt@4.0.5`, pulled in by
`@fastify/jwt@8`. Upgrading needs the whole Fastify v4→v5 ecosystem move, which
is REV-023a.

Checked against how dCMMS actually configures JWT, on 2026-09-19:

| Advisory | Requires | dCMMS today |
| :------- | :------- | :---------- |
| GHSA-mvf2-f6gm-w987 — algorithm confusion via whitespace-prefixed RSA public key | An RSA public key as the verification key | **Not applicable.** Tokens are `HS256` with a symmetric string secret. Verified by decoding a live token: `{"alg":"HS256","typ":"JWT"}`. `.env.example` mentions `JWT_ALGORITHM=RS256` for production, but no code reads that variable. |
| GHSA-rp9m-7r4c-75qg — cache confusion via `cacheKeyBuilder` collisions | fast-jwt's cache to be enabled | **Not applicable.** `@fastify/jwt` does not enable it and `plugins/jwt.ts` passes no cache option. |
| GHSA-gmvf-9v4p-v8jc — auth bypass via empty HMAC secret accepted by an async key resolver | An async key resolver function | **Not applicable.** A static string secret is passed. REV-001 additionally refuses to boot on a secret under 64 characters. |
| GHSA-hm7r-c7qw-ghp6 — unknown `crit` header extensions accepted | A crafted token | **Applicable but low impact.** Accepting an unknown `crit` header does not by itself bypass signature verification. |
| GHSA-gm45-q3v2-6cf8 — improper `iss` validation | The application to rely on `iss` | **Not applicable.** dCMMS never sets or validates `iss`. |
| GHSA-3j8v-cgw4-2g6q — stateful RegExp causes non-deterministic claim validation | Allowed-claim validation to be configured | **Not applicable.** No allowed-claim options are set. |

**Assessment:** none of the three criticals is reachable in the current
configuration; each depends on a JWT feature this codebase does not use. The
risk is that a future change — switching to RS256, adding a key resolver,
enabling caching — makes one reachable without anyone rechecking this table.
That is the actual danger, and it is why REV-023a should not sit indefinitely.

**This is not a claim that the dependency is safe.** It is a claim that it is
not currently exploitable here, which is a weaker and time-limited statement.

---

## AR-002 — `next@14` advisories

- **Severity as reported:** 1 critical, 2 high (`next`, `postcss` via next)
- **Fix requires:** `next@16` — two major versions
- **Tracked by:** REV-023b
- **Accepted by:** _(pending — Deepak)_

Next 14 → 16 crosses the Next 15 async request APIs and App Router changes, and
would land on top of the nonce CSP and `force-dynamic` rendering introduced in
REV-019. It needs its own verification pass, not a version bump inside a
dependency sweep.

Unlike AR-001 this has **not** been analysed for reachability in this
application. Treat it as unquantified, not as low risk.

---

## AR-003 — `eslint-config-next` / `@next/eslint-plugin-next` / `glob`

- **Severity as reported:** 3 high
- **Fix requires:** `eslint-config-next@16`, i.e. AR-002
- **Tracked by:** REV-023b

Development-time tooling only. These packages do not ship in the deployed
artefact, so exposure is limited to a developer machine or a CI runner
processing a hostile repository.
