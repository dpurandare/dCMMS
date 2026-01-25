# CSRF Protection Implementation Guide

## Overview

This document outlines the CSRF (Cross-Site Request Forgery) protection implementation for the dCMMS application. CSRF protection requires both frontend and backend changes.

---

## Current Status

### Frontend ✅
- CSRF helper utilities implemented in `/frontend/src/lib/csrf.ts`
- Token management functions ready
- Header injection prepared

### Backend ⚠️  
- **REQUIRES IMPLEMENTATION**
- Token generation endpoint needed
- Token validation middleware needed

---

## Frontend Implementation

### CSRF Helper (`/frontend/src/lib/csrf.ts`)

**Functions Available:**
- `getCsrfToken()` - Get token from meta tag or sessionStorage
- `setCsrfToken(token)` - Store token after login
- `clearCsrfToken()` - Clear token on logout
- `addCsrfHeader(headers)` - Add CSRF header to requests
- `requiresCsrfProtection(method)` - Check if method needs CSRF

**Header Name:** `X-CSRF-Token`

---

## Backend Implementation Required

### Step 1: Token Generation

Add CSRF token generation to login/session endpoints:

```typescript
// backend/src/routes/auth.ts - After successful login
import { randomBytes } from 'crypto';

router.post('/login', async (request, reply) => {
  // ... existing login logic ...
  
  // Generate CSRF token
  const csrfToken = randomBytes(32).toString('hex');
  
  // Store in session or database
  await redis.set(`csrf:${userId}`, csrfToken, 'EX', 3600); // 1 hour
  
  return reply.send({
    accessToken,
    refreshToken,
    user,
    csrfToken, // Include in response
  });
});
```

### Step 2: Token Validation Middleware

Create CSRF validation middleware:

```typescript
// backend/src/middleware/csrf.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function csrfProtection(request: FastifyRequest, reply: FastifyReply) {
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (!protectedMethods.includes(request.method)) {
    return; // Skip for  GET, HEAD, OPTIONS
  }
  
  const csrfToken = request.headers['x-csrf-token'] as string;
  const userId = request.user?.id; // From JWT auth
  
  if (!csrfToken) {
    return reply.code(403).send({ error: 'CSRF token missing' });
  }
  
  // Verify token from Redis
  const storedToken = await redis.get(`csrf:${userId}`);
  
  if (csrfToken !== storedToken) {
    return reply.code(403).send({ error: 'Invalid CSRF token' });
  }
}
```

### Step 3: Apply Middleware

Apply to protected routes:

```typescript
// backend/src/routes/work-orders.ts
import { csrfProtection } from '../middleware/csrf';

router.post('/work-orders', {
  preHandler: [authenticate, csrfProtection],
}, async (request, reply) => {
  // Create work order
});
```

### Step 4: Meta Tag Injection (Optional)

For server-side rendered pages, inject CSRF token in HTML:

```typescript
// backend/src/index.ts
fastify.get('*', async (request, reply) => {
  const csrfToken = await redis.get(`csrf:${request.user?.id}`);
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="csrf-token" content="${csrfToken}" />
        ...
      </head>
      ...
    </html>
  `;
  
  reply.type('text/html').send(html);
});
```

---

## Frontend Integration

### Update Auth Store

Modify login to save CSRF token:

```typescript
// frontend/src/store/auth-store.ts
import { setCsrfToken } from '@/lib/csrf';

const login = async (email: string, password: string) => {
  const response = await api.auth.login({ email, password });
  
  // Store tokens
  localStorage.setItem('accessToken', response.accessToken);
  localStorage.setItem('refreshToken', response.refreshToken);
  
  // Store CSRF token
  if (response.csrfToken) {
    setCsrfToken(response.csrfToken);
  }
  
  set({ user: response.user, isAuthenticated: true });
};
```

### Update API Client

Add CSRF header to protected requests:

```typescript
// frontend/src/lib/api-client.ts
import { getCsrfToken, requiresCsrfProtection } from '@/lib/csrf';

apiClient.interceptors.request.use((config) => {
  // Add auth token
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add CSRF token for state-changing requests
  if (config.method && requiresCsrfProtection(config.method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return config;
});
```

### Update Logout

Clear CSRF token on logout:

```typescript
// frontend/src/store/auth-store.ts
import { clearCsrfToken } from '@/lib/csrf';

const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  clearCsrfToken(); // Clear CSRF token
  
  set({ user: null, isAuthenticated: false });
};
```

---

## Testing

### Backend Tests

```typescript
describe('CSRF Protection', () => {
  it('should reject requests without CSRF token', async () => {
    const response = await request(app)
      .post('/api/v1/work-orders')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('CSRF token missing');
  });
  
  it('should accept requests with valid CSRF token', async () => {
    const response = await request(app)
      .post('/api/v1/work-orders')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-CSRF-Token', validCsrfToken);
    
    expect(response.status).toBe(200);
  });
});
```

### Frontend Tests

```typescript
describe('CSRF Helper', () => {
  it('should store and retrieve CSRF token', () => {
    setCsrfToken('test-token-123');
    expect(getCsrfToken()).toBe('test-token-123');
  });
  
  it('should clear CSRF token', () => {
    setCsrfToken('test-token');
    clearCsrfToken();
    expect(getCsrfToken()).toBeNull();
  });
  
  it('should identify protected methods', () => {
    expect(requiresCsrfProtection('POST')).toBe(true);
    expect(requiresCsrfProtection('GET')).toBe(false);
  });
});
```

---

## Security Considerations

1. **Token Entropy**: Use cryptographically secure random tokens (32+ bytes)
2. **Token Expiration**: Set reasonable expiration (1-2 hours)
3. **Token Rotation**: Generate new token on each login
4. **SameSite Cookies**: If using cookies, set `SameSite=Strict`
5. **HTTPS Only**: CSRF protection requires HTTPS in production

---

## Alternative: Double Submit Cookie

Instead of server-side storage, use double submit cookie pattern:

1. Set CSRF token in httpOnly cookie (backend)
2. Also include in response body (for client to store)
3. Client sends token in custom header
4. Server compares cookie value with header value

**Benefit:** No server-side storage needed  
**Drawback:** Vulnerable to subdomain attacks

---

## Migration Plan

**Phase 1:** Backend implementation (2-3 hours)
- Add token generation to login
- Create validation middleware
- Apply to protected routes

**Phase 2:** Frontend integration (1 hour)
- Update auth store
- Update API client request interceptor
- Update logout

**Phase 3:** Testing (1 hour)
- Backend unit tests
- Frontend integration tests
- Manual testing

**Total Estimated Time:** 4-5 hours

---

## Status

- [ ] Backend: Token generation endpoint
- [ ] Backend: Validation middleware
- [ ] Backend: Apply to routes
- [x] Frontend: CSRF helper utilities
- [ ] Frontend: Auth store integration
- [ ] Frontend: API client integration
- [ ] Frontend: Logout integration
- [ ] Testing: Backend tests
- [ ] Testing: Frontend tests
- [ ] Testing: Manual verification
