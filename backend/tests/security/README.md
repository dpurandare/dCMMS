# dCMMS Security Testing

This directory contains security testing scripts and documentation for the dCMMS API (DCMMS-044).

## Overview

Security testing covers:
- **OWASP Top 10** vulnerabilities
- **SQL Injection** protection
- **XSS (Cross-Site Scripting)** prevention
- **Authentication** and **Authorization** (RBAC)
- **Security Headers** configuration
- **Secrets** exposure
- **Rate Limiting**
- **Input Validation**

## Prerequisites

### For Automated Security Scan (OWASP ZAP)

**Install OWASP ZAP:**

**Option 1: Native Installation**
- Download from https://www.zaproxy.org/download/
- Install ZAP CLI: `pip install zapcli`

**Option 2: Docker (Recommended)**
```bash
docker pull owasp/zap2docker-stable
```

### For Manual Security Tests

- `curl` command-line tool
- `bash` shell
- Running dCMMS backend instance

## Quick Start

### 1. Run Automated Security Scan

```bash
# Make script executable
chmod +x owasp-zap-scan.sh

# Run OWASP ZAP scan (takes 15-45 minutes)
./owasp-zap-scan.sh

# View report
open security-reports/zap-report-*.html
```

### 2. Run Manual Security Tests

```bash
# Make script executable
chmod +x security-tests.sh

# Run security tests (takes 1-2 minutes)
./security-tests.sh

# Check exit code
echo $?  # 0 = passed, 1 = failed
```

### 3. Run Both

```bash
# Run all security tests
./owasp-zap-scan.sh && ./security-tests.sh
```

## Test Scripts

### 1. OWASP ZAP Automated Scan (`owasp-zap-scan.sh`)

**What it does:**
- Crawls all API endpoints (spider scan)
- Tests for 100+ vulnerability types:
  - SQL Injection
  - XSS (Reflected and Stored)
  - CSRF
  - Security Misconfigurations
  - Broken Authentication
  - Sensitive Data Exposure
  - XML External Entities (XXE)
  - Broken Access Control
  - Security Logging Issues
  - Insecure Deserialization

**Duration:** 15-45 minutes (depends on API complexity)

**Output:**
- HTML report: `security-reports/zap-report-TIMESTAMP.html`
- JSON report: `security-reports/zap-report-TIMESTAMP.json`
- XML report: `security-reports/zap-report-TIMESTAMP.xml`
- Console summary of findings

**Pass Criteria:**
- Zero high-risk vulnerabilities
- < 5 medium-risk vulnerabilities

### 2. Manual Security Tests (`security-tests.sh`)

**What it does:**
- **Test 1: SQL Injection Protection** - Tests query parameters and filters
- **Test 2: XSS Protection** - Tests input sanitization
- **Test 3: Authentication Bypass** - Validates token requirements
- **Test 4: Authorization (RBAC)** - Checks role-based access
- **Test 5: Security Headers** - Verifies security headers
- **Test 6: Secrets Exposure** - Checks for exposed secrets
- **Test 7: Rate Limiting** - Validates rate limiting
- **Test 8: CORS Configuration** - Checks CORS settings
- **Test 9: Input Validation** - Tests validation logic

**Duration:** 1-2 minutes

**Output:**
- Color-coded console output
- Pass/Fail/Warning for each test
- Summary at the end

**Pass Criteria:**
- Zero failed tests
- Warnings are acceptable but should be addressed

## Understanding Results

### OWASP ZAP Risk Levels

| Risk Level | Description | Action Required |
|------------|-------------|-----------------|
| **High** | Critical vulnerability, immediate fix required | Must fix before production |
| **Medium** | Significant risk, should be fixed | Fix before production |
| **Low** | Minor issue, fix when possible | Fix in next sprint |
| **Informational** | Best practice suggestion | Consider implementing |

### Common Vulnerabilities and Fixes

#### SQL Injection

**Symptom:** ZAP finds SQL injection in query parameters

**Fix:**
- Use parameterized queries (already implemented in Drizzle ORM)
- Validate and sanitize all user inputs
- Use ORM methods instead of raw SQL

**Example Fix:**
```typescript
// ❌ Bad - vulnerable to SQL injection
const query = `SELECT * FROM work_orders WHERE status = '${status}'`;

// ✅ Good - parameterized query
const workOrders = await db
  .select()
  .from(workOrdersTable)
  .where(eq(workOrdersTable.status, status));
```

#### XSS (Cross-Site Scripting)

**Symptom:** Script tags not escaped in responses

**Fix:**
- Escape HTML in all user-generated content
- Use Content-Security-Policy headers
- Validate and sanitize inputs

**Example Fix:**
```typescript
// Backend - validate input
const createWorkOrderSchema = z.object({
  title: z.string().max(200).refine(
    (val) => !/<script>/i.test(val),
    'Title contains invalid characters'
  ),
});

// Frontend - escape output (React does this automatically)
<h1>{workOrder.title}</h1>
```

#### Missing Security Headers

**Symptom:** Security headers test fails

**Fix:** Add headers in `backend/src/server.ts`:

```typescript
await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

#### Authentication Bypass

**Symptom:** Endpoints accessible without valid token

**Fix:**
- Add `preHandler: server.authenticate` to all protected routes
- Verify JWT signature and expiration
- Use strong JWT secret

**Example Fix:**
```typescript
server.get(
  '/api/v1/work-orders',
  {
    preHandler: server.authenticate, // ← Add this
  },
  async (request, reply) => {
    // Handler code
  }
);
```

#### Secrets Exposure

**Symptom:** .env file or secrets visible in responses

**Fix:**
- Never commit .env files
- Add .env to .gitignore
- Use environment variables for all secrets
- Don't expose stack traces in production

**Example Fix:**
```typescript
// ❌ Bad - exposes database URL
throw new Error(`Database connection failed: ${DATABASE_URL}`);

// ✅ Good - generic error message
throw new Error('Database connection failed');
```

## Security Checklist

### Before Production Deployment

- [ ] All OWASP ZAP high-risk issues resolved
- [ ] All security tests passing
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Secrets in environment variables (not code)
- [ ] Error messages don't expose sensitive data
- [ ] Input validation on all endpoints
- [ ] Authentication required on all protected endpoints
- [ ] RBAC working correctly (tested with different user roles)
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CORS configured correctly
- [ ] Logging sensitive operations (login, data access)
- [ ] No secrets in Git history
- [ ] Dependencies updated (no known vulnerabilities)

### Ongoing Security Practices

- [ ] Run security scan before each release
- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Conduct penetration testing quarterly
- [ ] Security training for developers
- [ ] Incident response plan documented
- [ ] Security contacts established

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/security.yml`:

```yaml
name: Security Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start backend
        run: |
          cd backend
          npm install
          npm run build
          npm start &
          sleep 10

      - name: Run security tests
        run: |
          cd backend/tests/security
          chmod +x security-tests.sh
          ./security-tests.sh

      - name: OWASP ZAP Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

## Reporting Security Issues

**Found a security vulnerability?**

Please **DO NOT** open a public GitHub issue.

Instead:
1. Email: security@dcmms.com
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. We'll respond within 48 hours
4. We'll credit you in the fix (if desired)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Fastify Security Best Practices](https://fastify.dev/docs/latest/Guides/Recommendations/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Security Testing Metrics (DCMMS-044)

Target metrics from Sprint 5:

| Metric | Target | Status |
|--------|--------|--------|
| High-risk vulnerabilities | 0 | ✅ |
| Medium-risk vulnerabilities | < 5 | ✅ |
| SQL injection tests | All pass | ✅ |
| XSS tests | All pass | ✅ |
| Auth bypass tests | All pass | ✅ |
| Security headers | All configured | ✅ |
| Secrets exposure | None | ✅ |

---

## Troubleshooting

### OWASP ZAP Issues

**Problem: ZAP fails to start**
```bash
# Solution: Use Docker instead
docker run -u zap -p 8090:8090 -i owasp/zap2docker-stable zap.sh -daemon -host 0.0.0.0 -port 8090 -config api.disablekey=true
```

**Problem: Scan takes too long**
```bash
# Solution: Run baseline scan (faster)
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000 -r report.html
```

### Manual Test Issues

**Problem: Authentication fails**
- Verify backend is running on localhost:3000
- Check default admin credentials in .env
- Try manual login via curl

**Problem: All tests fail with connection error**
- Ensure backend is running
- Check TARGET_URL environment variable
- Verify no firewall blocking

---

**Last Updated:** December 2025
**Sprint:** 5 (MVP Integration & Testing)
**Task:** DCMMS-044 (Security Audit MVP)
