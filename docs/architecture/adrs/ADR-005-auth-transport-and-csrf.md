# ADR-005: Auth transport, and what CSRF protection is for

- **Status:** Accepted
- **Date:** 2026-09-19
- **Tasks:** REV-017, REV-018
- **Deciders:** Deepak Purandare

## Context

There was no written threat model. That absence is the root cause of this ADR:
a large, competently-built CSRF subsystem was aimed at a risk the design did
not have, while the risk the design *did* have went unaddressed.

### What the code did

**Both tokens were in `localStorage`** (`frontend/src/store/auth-store.ts`).
The access token lasts 15 minutes; the refresh token lasts 7 days. Any XSS —
one injected script, one compromised dependency — could read both. Stealing a
15-minute token buys an attacker a session. Stealing a 7-day refresh token buys
them a week of silent re-entry, and the theft leaves no trace in any log,
because the subsequent use looks exactly like the real user.

**Authentication was pure `Authorization: Bearer`.** There were no cookies
anywhere in `routes/auth.ts` or `plugins/jwt.ts`. Browsers do not attach an
`Authorization` header by themselves, so a cross-site request could not carry
the user's credential. **CSRF was not applicable to that design.**

**The team nonetheless built a CSRF subsystem**: `middleware/csrf.ts`,
`routes/csrf.ts`, `frontend/src/lib/csrf.ts` (277 lines), Redis token storage,
28 test assertions — the largest test cluster in the repository — two design
documents and `backend/scripts/add-csrf-protection.sh`.

**And it was never wired up.** `csrfProtection` is imported by exactly one
file: its own test.

```
$ grep -rn "csrfProtection" backend/src --include=*.ts
backend/src/__tests__/middleware/csrf.test.ts:2: …
```

No route, no hook, no `preHandler` references it. Tokens are generated at
login, stored in Redis and sent by the frontend on every mutation — and nothing
on the server ever checks them. The withdrawn security audit recorded
"CSRF ✅ PASS — JWT tokens (stateless)", which was the correct reason for the
wrong conclusion: CSRF did not apply, so the subsystem was unnecessary; but it
was also inert, so it would not have helped if it had.

## Decision

### 1. The refresh token moves to an HttpOnly cookie. The access token lives in memory.

- Refresh token: `HttpOnly; Secure (production); SameSite=Strict; Path=/api/v1/auth; Max-Age=7d`
- Access token: returned in the login response body, held in a Zustand store
  that is **not** persisted. Gone on reload; the client silently re-acquires one
  from the cookie.
- `/auth/refresh` accepts the token **only** from the cookie. It deliberately
  does not fall back to the request body — accepting both would leave the
  XSS-readable path open and make the change cosmetic.
- `/auth/logout` revokes server-side and clears the cookie.

### 2. `SameSite=Strict` is the CSRF defence for the cookie, not the token subsystem.

The cookie is the only ambient credential in the system, and it is scoped to
`Path=/api/v1/auth`. `SameSite=Strict` means a cross-site request never carries
it. Every other endpoint still authenticates with a Bearer token, which remains
non-ambient and therefore CSRF-immune.

### 3. The CSRF subsystem is kept, and must be either wired or removed (REV-018a).

It is now *potentially* meaningful, where before it was categorically
inapplicable. But a double-submit token keyed by user id does not fit
`/auth/refresh`, which by definition runs when the access token has expired and
there is no authenticated user to key against. So it cannot simply be attached
to the endpoint that needs protecting.

Keeping 277 lines of inert security machinery is its own hazard: it reads like
protection in code review and in audits, and it is not. REV-018a decides
between wiring it as defence in depth on authenticated state-changing routes,
or deleting it.

## The threat model this actually encodes

| Threat | Before | Now |
| :----- | :----- | :-- |
| XSS steals a 7-day refresh token | **Open.** `localStorage.getItem('refreshToken')` | Closed. JavaScript cannot read an HttpOnly cookie. |
| XSS steals a 15-minute access token | Open | **Still open**, and accepted. An in-memory token is reachable by script running in the page. The mitigation is the blast radius: 15 minutes, no silent renewal, and the CSP from REV-019 now actually enforces. |
| XSS persists across reloads | **Open.** Tokens survived in `localStorage` | Closed. Nothing auth-related is persisted. |
| CSRF against Bearer endpoints | Not applicable | Not applicable |
| CSRF against the refresh cookie | Did not exist | `SameSite=Strict` + `Path` scope |
| Stolen refresh token replayed | Open | Partly: tokens rotate on refresh and `logout` revokes all of a user's tokens. Theft is harder, not impossible. |

**Not addressed here:** token binding to device or IP, and detection of refresh
tokens used after rotation (a strong theft signal). Both are worth doing;
neither is done.

## Consequences

- `LoginResponse` and `RefreshTokenResponse` no longer carry `refreshToken`.
  Any client reading it — including the mobile app, which this review has not
  examined — breaks and must be updated.
- `withCredentials: true` is now required on the API client, and the backend
  CORS config must keep `credentials: true` with an explicit origin list. It
  already does; a wildcard origin would silently break the cookie.
- A page reload costs one extra round trip to `/auth/refresh`.
- `Secure` is set only when `NODE_ENV=production`, so local HTTP development
  still works. A staging environment served over HTTP will not set the cookie —
  that is intended, not a bug to work around.
