> **Archived:** February 2026 — Tasks captured in [TasksTracking/13_GenAI_Implementation.md](../../TasksTracking/13_GenAI_Implementation.md) (DCMMS-GENAI-10, DCMMS-GENAI-11)

# CSRF Token Validation Issue in GenAI API Tests

## Issue Summary

API integration tests for GenAI endpoints are failing with "Invalid CSRF token" error when attempting to upload documents or perform other mutating operations, despite successfully obtaining a CSRF token from the `/api/v1/auth/csrf` endpoint.

## Status

- **Severity**: Low (Testing infrastructure issue, not production bug)
- **Impact**: Cannot run automated integration tests for GenAI endpoints
- **Backend API**: ✅ Working correctly (manually verified)
- **CSRF Protection**: ✅ Enabled and functioning
- **Authorization**: ✅ Working (tenant_admin has use:genai permission)

## Environment

- Backend Server: `http://localhost:4000`
- Node.js: v24.11.0
- Framework: Fastify with @fastify/csrf-protection
- Test Library: node-fetch v2.x

## Error Details

### Test Output

```
🚀 GenAI API Integration Test Suite

API URL: http://localhost:4000

🔐 Logging in...
✅ Logged in successfully
🔑 Getting CSRF token...
✅ Got CSRF token

📤 Test 1: Upload Document

❌ Test failed: Upload failed: Forbidden - {
  "statusCode":403,
  "error":"Forbidden",
  "message":"Invalid CSRF token"
}
```

### Test Script Flow

1. ✅ Login successful - Receive JWT access token
2. ✅ GET `/api/v1/auth/csrf` - Receive CSRF token and Set-Cookie header
3. ❌ POST `/api/v1/genai/upload` with:
   - Header: `X-CSRF-Token: <token>`
   - Header: `Cookie: <csrf-cookie>`
   - Result: **403 Invalid CSRF token**

## Technical Details

### CSRF Implementation

The backend uses [@fastify/csrf-protection](https://github.com/fastify/csrf-protection) with double-cookie pattern:

**Backend Configuration** ([`src/middleware/csrf.ts`](file:///home/deepak/Public/dCMMS/backend/src/middleware/csrf.ts)):
```typescript
await server.register(csrf, {
  cookieKey: '_csrf',
  cookieOpts: {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: false, // Development
  },
});
```

**CSRF Endpoint** ([`src/routes/auth.routes.ts`](file:///home/deepak/Public/dCMMS/backend/src/routes/auth.routes.ts)):
```typescript
server.get('/csrf', {
  preHandler: [server.authenticate],
}, async (request, reply) => {
  const csrfToken = await reply.generateCsrf();
  return { csrfToken };
});
```

### Test Implementation

**Current Test Code** ([`src/scripts/test_genai_api.ts`](file:///home/deepak/Public/dCMMS/backend/src/scripts/test_genai_api.ts)):

```typescript
async function getCsrfToken() {
  const response = await fetch(`${API_URL}/api/v1/auth/csrf`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  // Extract CSRF cookie
  const cookies = response.headers.raw()["set-cookie"];
  if (cookies && cookies.length > 0) {
    csrfCookie = cookies[0].split(";")[0];
  }

  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function testUploadDocument() {
  const response = await fetch(`${API_URL}/api/v1/genai/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "X-CSRF-Token": csrfToken,  // ← Token from response body
      Cookie: csrfCookie,          // ← Cookie from Set-Cookie header
      ...form.getHeaders(),
    },
    body: form,
  });
  // Returns 403 Invalid CSRF token
}
```

## Hypothesis

The issue likely stems from one of the following:

### 1. Cookie Parsing Issue
The `Set-Cookie` header might contain multiple attributes that need proper parsing:
```
Set-Cookie: _csrf=abc123; Path=/; HttpOnly; SameSite=Strict
```

**Current**: `csrfCookie = cookies[0].split(";")[0]` 
**Might need**: More sophisticated cookie parsing or the entire cookie string

### 2. Cookie Domain Mismatch
- Request URL: `http://localhost:4000`
- Cookie might expect specific domain or no domain attribute

### 3. SameSite=Strict Restriction
With `sameSite: 'strict'`, the cookie might not be sent if:
- Initial CSRF fetch and subsequent POST aren't considered "same-site"
- Node-fetch doesn't properly handle SameSite cookies

### 4. Missing Cookie Jar
`node-fetch` v2 doesn't automatically handle cookies. Need to:
- Manually extract ALL cookies from responses
- Send ALL cookies with subsequent requests
- Match cookie names exactly

## What Works

✅ The CSRF protection IS working correctly for browser-based clients
✅ The frontend application can successfully use these endpoints
✅ Manual testing with tools like Postman/Insomnia works
✅ The CSRF token is generated correctly
✅ Authorization and authentication work perfectly

## Attempted Solutions

### Attempt 1: Basic Cookie Extraction
```typescript
csrfCookie = cookies[0].split(";")[0];
```
**Result**: ❌ Invalid CSRF token

### Attempt 2: Array Mapping
```typescript
cookies.push(...setCookieHeaders.map((c: string) => c.split(";")[0]));
```
**Result**: ❌ Syntax error (incorrect arrow function encoding)

### Attempt 3: Single Cookie Variable
```typescript
let csrfCookie = "";
csrfCookie = cookies[0].split(";")[0];
Cookie: csrfCookie
```
**Result**: ❌ Invalid CSRF token

## Recommended Solutions

### Option 1: Use `tough-cookie` Library (Recommended)

Install proper cookie handling:
```bash
npm install tough-cookie @types/tough-cookie
```

Update test script:
```typescript
import { CookieJar } from 'tough-cookie';

const cookieJar = new CookieJar();

async function getCsrfToken() {
  const response = await fetch(`${API_URL}/api/v1/auth/csrf`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  // Store cookies
  const setCookies = response.headers.raw()["set-cookie"];
  for (const cookie of setCookies) {
    await cookieJar.setCookie(cookie, API_URL);
  }
  
  const data = await response.json();
  return data.csrfToken;
}

async function testUploadDocument() {
  const cookies = await cookieJar.getCookieString(API_URL);
  
  const response = await fetch(`${API_URL}/api/v1/genai/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "X-CSRF-Token": csrfToken,
      Cookie: cookies,
      ...form.getHeaders(),
    },
    body: form,
  });
}
```

### Option 2: Use `fetch` with Cookie Support

Switch to `node-fetch` v3 or `undici` which has better cookie support:
```bash
npm install undici
```

### Option 3: Disable CSRF for Test Environment

Add environment-based CSRF configuration:
```typescript
// src/middleware/csrf.ts
if (process.env.NODE_ENV === 'test') {
  // Skip CSRF registration or use permissive settings
}
```
**⚠️ Not recommended for production-like testing**

### Option 4: Debug with Full Cookie Headers

Log and compare:
```typescript
console.log('Set-Cookie headers:', response.headers.raw()["set-cookie"]);
console.log('Sending Cookie:', csrfCookie);
console.log('Sending X-CSRF-Token:', csrfToken);
```

## Files Affected

- [`backend/src/scripts/test_genai_api.ts`](file:///home/deepak/Public/dCMMS/backend/src/scripts/test_genai_api.ts) - Test script with cookie handling
- [`backend/src/middleware/csrf.ts`](file:///home/deepak/Public/dCMMS/backend/src/middleware/csrf.ts) - CSRF configuration
- [`backend/src/routes/auth.routes.ts`](file:///home/deepak/Public/dCMMS/backend/src/routes/auth.routes.ts) - CSRF token endpoint

## Related Links

- [Fastify CSRF Protection Docs](https://github.com/fastify/csrf-protection)
- [tough-cookie Documentation](https://github.com/salesforce/tough-cookie)
- [node-fetch Cookie Handling Issue](https://github.com/node-fetch/node-fetch/issues/386)

## Workaround for Now

For immediate testing, you can:

1. **Test via browser/Postman** - Manual testing works fine
2. **Test without mutations** - Read-only endpoints (`GET /documents`, `GET /jobs/:id`) don't require CSRF
3. **Use frontend tests** - The React app successfully uses these endpoints

## Next Steps

1. Implement Option 1 (tough-cookie) for proper cookie handling
2. Add comprehensive logging to debug exact cookie format issues  
3. Consider using a dedicated API testing library (Supertest, Playwright, etc.)
4. Update all API integration tests to use the new cookie handling approach

## Context

This issue was discovered during the GenAI implementation testing phase after successfully completing:
- ✅ Vector dimension fix (1536→768 for Gemini)
- ✅ RBAC permission setup (use:genai for tenant_admin)
- ✅ Backend server configuration (port 4000)
- ✅ Database migrations
- ✅ Redis authentication

The GenAI functionality itself is fully working - this is purely a test infrastructure issue.

---

**Created**: 2026-01-26  
**Last Updated**: 2026-01-26  
**Priority**: Low  
**Assignee**: TBD
