# Frontend Security

**Last Updated**: 2026-02-23
**Version**: 1.1

---

## Overview

This document outlines the security measures implemented in the dCMMS frontend application to protect against common web vulnerabilities.

---

## 1. Cross-Site Scripting (XSS) Protection

### Input Sanitization

All user-generated content is sanitized using **DOMPurify** before display.

**Implementation**: `src/lib/sanitize.ts`

**Functions**:
- `sanitizeHtml()` - Allows safe HTML tags (bold, italic, links, etc.)
- `sanitizeText()` - Strips all HTML (for plain text fields)
- `sanitizeInput()` - Removes dangerous scripts and event handlers
- `containsMaliciousContent()` - Detects potentially malicious patterns

**Usage**:
```typescript
import { sanitizeHtml } from '@/lib/sanitize';

// When displaying user content
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
```

**Protected Fields**:
- Work order descriptions
- Alert messages
- User profiles (bio, comments)
- Report content
- Any user-generated text

---

## 2. Security Headers

Comprehensive security headers configured in `next.config.js`:

### Content Security Policy (CSP)
Restricts sources for scripts, styles, images, and connections.

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' http://localhost:3001;
```

**Note**: `unsafe-inline` and `unsafe-eval` are required for Next.js/React. In production, consider using nonces for additional security.

### Other Headers

| Header                    | Value                    | Purpose                    |
| ------------------------- | ------------------------ | -------------------------- |
| X-Frame-Options           | SAMEORIGIN               | Prevents clickjacking      |
| X-Content-Type-Options    | nosniff                  | Prevents MIME sniffing     |
| X-XSS-Protection          | 1; mode=block            | Browser XSS filter         |
| Strict-Transport-Security | max-age=63072000         | Forces HTTPS               |
| Referrer-Policy           | origin-when-cross-origin | Controls referrer info     |
| Permissions-Policy        | camera(), microphone()   | Restricts browser features |

---

## 3. Authentication & Authorization

### Token Management

**Current Approach**: localStorage

**Tokens Stored**:
- `accessToken` - Short-lived (15 min), used for API requests
- `refreshToken` - Longer-lived (7 days), used to refresh access token

**Security Measures**:
- ✅ Automatic token refresh before expiry
- ✅ Tokens cleared on logout
- ✅ Token validation on every protected route
- ✅ RBAC permission checks before API calls

**Trade-offs**:

| Approach                           | Pros                                                       | Cons                                                |
| ---------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| **localStorage** (current)         | ✅ Simple<br>✅ Works with SPA<br>✅ Accessible to JavaScript | ❌ Vulnerable to XSS                                 |
| **HttpOnly Cookies** (alternative) | ✅ Not accessible to JavaScript<br>✅ More secure            | ❌ Requires CORS configuration<br>❌ Complex with SPA |

**Mitigation** for localStorage:
1. Input sanitization (DOMPurify) prevents XSS
2. CSP headers limit script execution
3. Short token expiry limits exposure
4. Automatic refresh reduces re-authentication

---

## 4. Cross-Site Request Forgery (CSRF) Protection

### Current Protection

**Primary Defense**: Bearer token authentication
- Tokens in `Authorization` header (not cookies)
- Custom header prevents simple cross-origin requests
- SameSite cookie policy (if using cookies)

### Optional Enhancement

CSRF tokens for critical operations (can be added later):

```typescript
// API client automatically adds CSRF token
headers: {
  'X-CSRF-Token': getCsrfToken(),
}
```

**Status**: Not required with bearer tokens, but can be added for defense-in-depth.

---

## 5. Audit Logging

All security-sensitive operations are logged for compliance and incident response.

**Implementation**: `src/lib/audit-logger.ts`

**Logged Actions**:
- User login/logout
- User creation/deletion
- Role changes
- Work order creation/deletion
- Asset modifications
- Report generation
- Permission changes

### Usage

```typescript
import { AuditLogger, AuditActions, AuditResources } from '@/lib/audit-logger';

// Log user deletion
AuditLogger.log(
  AuditActions.DELETE,
  AuditResources.USER,
  userId,
  { username: user.username }
);
```

**Storage**:
- In-memory (last 1000 logs)
- Console output (development)
- Backend endpoint (can be implemented)

---

## 6. Role-Based Access Control (RBAC)

### Implementation

Complete RBAC system with:
- **50+ granular permissions** (colon-notation: `action:resource`)
- **6 user roles** (`super_admin`, `tenant_admin`, `site_manager`, `technician`, `operator`, `viewer`)
- **Route-level protection** (`ProtectedSection`)
- **Feature-level protection** (button and section visibility)

### Permission Checks

```typescript
// Wrap a section — hidden if no permission
import { ProtectedSection } from '@/components/auth/protected';

<ProtectedSection permissions={["create:work-orders"]}>
  <Button>Create Work Order</Button>
</ProtectedSection>

// Disable a button — grayed out with tooltip if no permission
import { ProtectedButton } from '@/components/auth/protected';

<ProtectedButton permissions={["delete:assets"]} disabledTooltip="No permission to delete">
  Delete Asset
</ProtectedButton>

// Programmatic check in component logic
import { usePermissions } from '@/hooks/use-permissions';

const { can } = usePermissions();
{can('create:work-orders') && <Button>Create Work Order</Button>}
```

**Details**: See `src/lib/permissions.ts`

---

##  7. Secure Development Practices

### Code Review Checklist

Before deploying changes:

- [ ] All user inputs sanitized
- [ ] Permissions checked for new features
- [ ] Sensitive operations logged
- [ ] No hardcoded credentials
- [ ] Environment variables not exposed
- [ ] Dependencies up to date
- [ ] Security headers verified

### Testing

1. **XSS Prevention**: Try injecting `<script>alert('XSS')</script>` in input fields
2. **RBAC**: Test with different user roles
3. **Headers**: Check with browser DevTools
4. **Audit Logs**: Verify critical actions are logged

---

## 8. Known Limitations & Future Improvements

### Current Limitations

1. **localStorage for tokens** - Vulnerable to XSS (mitigated with sanitization)
2. **CSP allows unsafe-inline** - Required for Next.js (consider nonces in production)
3. **No rate limiting** - Should be implemented on backend
4. **Audit logs in memory** - Need persistent storage

### Planned Improvements

1. Consider HttpOnly cookies for refresh tokens
2. Implement CSP nonces for production
3. Add backend audit log endpoint
4. Implement rate limiting (backend)
5. Add security monitoring dashboard

---

## 9. Incident Response

### If XSS Attack Detected

1. Identify injection point
2. Review audit logs for affected users
3. Update sanitization rules
4. Force password reset for affected users
5. Review and patch vulnerability

### If Unauthorized Access Detected

1. Check audit logs for suspicious activity
2. Review permission configurations
3. Force logout all sessions
4. Investigate authentication flow
5. Update RBAC rules if needed

---

## 10. Compliance

### Data Protection

- User data sanitized before storage/display
- Passwords hashed (bcrypt)
- Audit trail for all sensitive operations
- RBAC prevents unauthorized access

### Standards

- OWASP Top 10 mitigations
- CWE (Common Weakness Enumeration) compliance
- Security headers best practices

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

---

**Contact**: For security concerns, contact the development team immediately.
