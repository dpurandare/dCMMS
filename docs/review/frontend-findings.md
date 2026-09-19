# Frontend Findings — Per-Page Review (REV-034)

**Date:** 2026-09-19 · **Reviewer pass:** single-agent, as part of finishing Phase 2.
**Scope:** every route group under `frontend/src/app/` (18 groups, 33 `page.tsx`
files as of today — 11 backend routes were deleted earlier today under REV-025;
confirmed none of them had a frontend caller, so no page here was orphaned by
that).

**Coverage note, in the interest of the same evidence discipline the rest of
this review holds everyone else to:** the highest-traffic and highest-risk
pages (`alerts`, `work-orders`, `crews`, `dashboard`, `genai`, `wind-dashboard`,
`settings`, `ml/models`, `assets`) got a full read. The remainder got a
targeted grep pass (protection mechanism, apiClient paths, loading/error
keywords) rather than a full line-by-line read — where that's true, the Notes
column says so explicitly. A grep pass can produce false negatives for pages
that delegate rendering to a child component (e.g. `reports/page.tsx` looked
like it had no loading state under a keyword search; it does — it lives in the
`<ReportList>` child component it renders).

## Route protection mechanisms found (three, used inconsistently)

1. **`<ProtectedSection permissions={[...]}>`** — the intended pattern.
   Conditionally *mounts* children (not just CSS-hides them), so an
   unauthorized user's page component never even runs its data-fetching
   effect. Used by 14 of 33 page files.
2. **`<AuthGuard>`** (`src/components/auth/auth-guard.tsx`) — authentication
   only, no permission check. Calls `api.auth.getMe()` to verify the session
   against the backend (with retry/backoff on network errors), shows a
   loading spinner while checking, redirects to `/auth/login` on failure.
   Solid implementation. Used by `dashboard`, `settings`, `docs`, `help`,
   `analytics` (the top-level page, not `analytics/dashboard`).
3. **Inline `isAuthenticated` check** (`useAuthStore().isAuthenticated` +
   `router.push('/auth/login')` in a `useEffect`) — authentication only, hand-
   rolled per page instead of a shared component. Used by most CRUD pages:
   `work-orders`, `assets`, `sites`, `sites/[id]`, `compliance-reports/[id]`,
   `work-orders/[id]`, `work-orders/[id]/edit`, `assets/[id]`,
   `assets/[id]/edit`, `users/[id]`, etc.

There is **no route-level or layout-level guard** — `src/middleware.ts` only
sets CSP headers (no auth logic at all), and the root `src/app/layout.tsx` has
no auth check either. Whatever protection a page has, it has to provide
itself.

## Finding 1 (top) — four pages have no protection of any kind

`src/app/genai/page.tsx`, `src/app/wind-dashboard/page.tsx`,
`src/app/work-orders/new/page.tsx`, `src/app/assets/new/page.tsx` use none of
the three mechanisms above — no `ProtectedSection`, no `AuthGuard`, no inline
`isAuthenticated` check. Severity differs per page:

- **`genai/page.tsx`** is the most consequential: it renders `ChatInterface`,
  `FileUploader` and `DocumentList` with zero gating, despite a real
  `use:genai` permission existing in `frontend/src/types/api.ts`'s `Permission`
  union. Backend authorization (`routes/genai.routes.ts`, not reviewed here —
  see REV-029's parallel pass) is the only thing stopping an unauthorized
  session from using it; the page itself puts no barrier in the way.
- **`work-orders/new/page.tsx`** and **`assets/new/page.tsx`** (create forms):
  same gap — `create:work-orders`/`create:assets` exist as permissions but
  aren't checked at the page level. Lower severity than `genai` since a create
  form's only consequence of unauthorized *viewing* is exposure of the form
  UI itself, not data; an actual submit still depends on the backend
  accepting it.
- **`wind-dashboard/page.tsx`**: see Finding 2 below — this one's data is 100%
  fake, so there's nothing sensitive to protect, but the gap is still real
  and worth closing for consistency (and in case it's ever wired to real data).

## Finding 2 — `wind-dashboard/page.tsx` is entirely fabricated client-side

`generateMockData()` (top of the file) invents 50 turbines with `Math.random()`
for wind speed, power output, efficiency and operational status — no backend
API call anywhere in the file. Unlike the backend mock services fixed today
under REV-027a (`X-Mock-Data` header, refuses to run in production), there is
no labeling here at all — a viewer has no way to know this dashboard isn't
real. No `TasksTracking/*.md` module was found describing this page, so
there's no self-certified "✅ Complete" claim to correct — it reads as a
standalone prototype/demo rather than a claimed feature, but it should either
be labeled as a demo in the UI or wired to `routes/telemetry.ts` (which is
real).

## Finding 3 — `alerts.service.ts` still sends a client-supplied `tenantId`

`getAlerts()` and `getAlertStats()` (`frontend/src/services/alerts.service.ts`)
take a required `tenantId` param and send it as a query string param to
`GET /alerts` and `GET /alerts/stats`. This is exactly the shape of the
cross-tenant IDOR that was found and fixed in `routes/alerts.ts` earlier this
review (client-supplied tenant ID, rather than one derived from the JWT). The
backend fix (not re-verified here — REV-029's lane) should mean the server
now ignores this value and derives the tenant from the authenticated user
regardless of what's sent, which would make this dead weight rather than a
live vulnerability — but it's a footgun: if the backend's tenant-derivation is
ever "simplified" back to trusting a query param (an easy regression to
introduce without noticing, since the frontend already sends a plausible-
looking value), the hole reopens silently. Recommend dropping `tenantId` from
`GetAlertsParams`/`GetAlertStatsParams` entirely so there's no client-supplied
value to accidentally trust.

## Finding 4 — inconsistent error surfacing on forms

`work-orders/new/page.tsx` and `assets/new/page.tsx` use a raw browser
`alert()` on submit failure (`alert(err.response?.data?.message || 'Failed to
create...')`), while the rest of the app (and `api-client.ts`'s own response
interceptor) uses a `showToast.error(...)` pattern. Minor UX inconsistency,
not a bug.

## Finding 5 — `crews` pages reuse `read:users`/`create:users`/etc. permissions

`crews/page.tsx` and `crews/[id]/page.tsx` gate themselves on `read:users`,
not a crew-specific permission — because none exists in the `Permission`
union (`frontend/src/types/api.ts`). This is **not a frontend bug**: the
backend does the identical thing (`routes/crews.ts`, with its own code
comment: `// Reusing a similar level permission since create:crews doesn't
implicitly exist in spec but admins do this`), so behavior is consistent
front-to-back. Worth noting as a vocabulary gap for whoever eventually adds
real crew-specific RBAC, not as something to fix now.

## What's confirmed correct

- Every `apiClient`/`api.*` call found (checked all literal-string and
  template-literal paths across `frontend/src/services/*.ts`) resolves to a
  route actually registered in `backend/src/server.ts` as of today, including
  `/users/:userId/notification-preferences` (registered under
  `routes/notifications.ts`, not `routes/users.ts` — easy to miss, confirmed
  live with a 200 and real data against the running stack) and
  `/dashboards/:id/render`, `/genai/jobs/:id`, `/forecasts/generation/generate`.
  None of the 11 routes deleted today under REV-025 have any frontend caller.
- `ml/anomalies/page.tsx` and `ml/models/page.tsx` correctly call the now-
  registered, intentionally-mock `ml-inference`/`model-governance` backend
  routes; `ml/models/page.tsx` already handles the backend's `stage` required-
  query-param constraint correctly (fetches all 5 stages in parallel for the
  "all" filter, with its own comment acknowledging the constraint).
- `frontend/src/lib/api-client.ts`'s default API URL and token-refresh race
  condition were both fixed earlier today (REV-033, REV-035) — verified
  working, not re-flagged here.
- The 14 `ProtectedSection`-wrapped pages all use permission strings that
  exist in the `Permission` union and plausibly match the page's purpose
  (`read:alerts` for alerts, `read:compliance` for compliance-reports,
  `read:ml-features` for ml/models, etc.).

## Per-route table

| Route | apiClient calls resolve? | Loading/Empty/Error | Protection | Tenant-data risk | Notes |
|---|---|---|---|---|---|
| `/` (root) | n/a — redirect only | n/a | n/a | none | `redirect('/auth/login')`, nothing else |
| `/auth/login` | ✅ | ✅ | n/a (correctly public) | none | |
| `/dashboard` | ✅ | ✅ | AuthGuard (auth-only) | low | full read |
| `/alerts` | ✅ | ✅ (loading/empty/error all present) | ProtectedSection `read:alerts` | **Finding 3**: sends client `tenantId` | full read |
| `/analytics` | ✅ | spot-check only | AuthGuard (auth-only) | low | |
| `/analytics/dashboard` | ✅ | spot-check only | ProtectedSection `read:analytics` | low | |
| `/assets` | ✅ | spot-check only | inline `isAuthenticated` + inline permission check | low | |
| `/assets/[id]` | ✅ | spot-check only | inline `isAuthenticated` + inline permission check | low | |
| `/assets/[id]/edit` | ✅ | spot-check only | inline `isAuthenticated` | low | |
| `/assets/new` | ✅ | ✅ (submit loading/error, `alert()` not toast) | **none** | low | **Finding 1, 4** |
| `/audit-logs` | ✅ | spot-check only | ProtectedSection `read:audit-logs` | low | |
| `/compliance-reports` | ✅ | spot-check only | ProtectedSection `read:compliance` | low | |
| `/compliance-reports/[id]` | ✅ | spot-check only | inline `isAuthenticated` | low | |
| `/crews` | ✅ | spot-check only | ProtectedSection `read:users` (see Finding 5) | low | |
| `/crews/[id]` | ✅ | spot-check only | ProtectedSection `read:users` (see Finding 5) | low | full read |
| `/docs` | ✅ | spot-check only | AuthGuard (auth-only) | low | |
| `/genai` | ✅ | spot-check only | **none** | medium | **Finding 1** — most consequential of the four |
| `/help` | ✅ | spot-check only | AuthGuard (auth-only) | none | static content |
| `/ml/anomalies` | ✅ | spot-check only | ProtectedSection `read:alerts` | low | intentional mock backend, correct |
| `/ml/forecasts` | ✅ | spot-check only | ProtectedSection `read:forecasts` | low | |
| `/ml/models` | ✅ | ✅ | ProtectedSection `read:ml-features` | low | full read, intentional mock backend, correct |
| `/reports` | ✅ | ✅ (delegates to `<ReportList>`) | ProtectedSection `read:reports` | low | |
| `/settings` | ✅ | spot-check only | AuthGuard (auth-only) | low | |
| `/sites` | ✅ | spot-check only | inline `isAuthenticated` | low | |
| `/sites/[id]` | ✅ | spot-check only | inline `isAuthenticated` | low | |
| `/users` | ✅ | spot-check only | ProtectedSection `read:users` | low | |
| `/users/[id]` | ✅ | spot-check only | ProtectedSection `read:users` | low | |
| `/users/[id]/edit` | ✅ | spot-check only | ProtectedSection `update:users` | low | |
| `/users/new` | ✅ | spot-check only | ProtectedSection `create:users` | low | |
| `/wind-dashboard` | n/a — no backend call | n/a | **none** | none | **Finding 1, 2** — entirely fake data |
| `/work-orders` | ✅ | ✅ (full read) | inline `isAuthenticated`, no permission check | low | full read |
| `/work-orders/[id]` | ✅ | spot-check only | inline `isAuthenticated` + inline permission check | low | |
| `/work-orders/[id]/edit` | ✅ | spot-check only | inline `isAuthenticated` | low | |
| `/work-orders/new` | ✅ | ✅ (submit loading/error, `alert()` not toast) | **none** | low | **Finding 1, 4** |

## Summary

33 pages reviewed (9 full-read, 24 targeted-grep). **29 clean or minor**, **4
flagged** for missing page-level protection (Finding 1), plus three
lower-severity findings (2–4) that don't block anything but are worth fixing.
Ranked by severity:

1. `genai/page.tsx` has no page-level gate at all, despite a real permission
   existing for it (Finding 1).
2. `alerts.service.ts` still ships a client-supplied `tenantId` that a future
   backend regression could trust again (Finding 3).
3. `work-orders/new` and `assets/new` have no page-level gate (Finding 1,
   lower severity than genai).
4. `wind-dashboard` is 100% fabricated data with no labeling as such
   (Finding 2) — not a security issue, but a truth-in-labeling one, which is
   the whole theme of this review.
5. Minor: inconsistent error UI (`alert()` vs toast) on two create forms
   (Finding 4).

No cross-tenant data leak, no unregistered/404ing `apiClient` call, and no
orphaned reference to any of the 11 routes deleted earlier today were found.
