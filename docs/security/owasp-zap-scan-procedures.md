# OWASP ZAP Security Scanning Procedures

**Purpose:** Guide for running OWASP ZAP dynamic security scans on dCMMS application
**Tool:** OWASP ZAP (Zed Attack Proxy)
**Frequency:** Before each release, After major changes
**Owner:** Security Team / QA Team

---

## Prerequisites

1. **Docker Installed**
   ```bash
   docker --version
   # Should show Docker version 20.x or later
   ```

2. **OWASP ZAP Docker Image**
   ```bash
   docker pull owasp/zap2docker-stable:latest
   ```

3. **Running Application**
   - Backend API running at: `http://localhost:3000`
   - Frontend running at: `http://localhost:3001`
   - Or use staging URL: `https://staging.dcmms.com`

4. **Test Credentials** (for authenticated scans)
   - Username: test@example.com
   - Password: TestPassword123!

---

## Scan Types

### 1. Baseline Scan (Passive)

**Duration:** ~5 minutes
**Coverage:** Passive vulnerability detection (no active attacks)

**Use Case:** Quick security check, CI/CD pipeline

```bash
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-baseline.py \
  -t http://host.docker.internal:3000 \
  -r docs/security/owasp-zap-baseline-report.html \
  -J docs/security/owasp-zap-baseline-report.json
```

**What it checks:**
- Missing security headers
- Cookie security
- Information disclosure
- Weak TLS configuration
- Basic XSS patterns

---

### 2. Full Scan (Active)

**Duration:** ~30-60 minutes
**Coverage:** Active vulnerability detection (includes attacks)

**Use Case:** Pre-release security validation

```bash
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-full-scan.py \
  -t http://host.docker.internal:3000 \
  -r docs/security/owasp-zap-full-report.html \
  -J docs/security/owasp-zap-full-report.json
```

**What it checks:**
- All baseline checks
- SQL injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Path traversal
- Command injection
- XML injection
- LDAP injection

**⚠️ Warning:** Full scan performs attacks. Only run in test/staging environments!

---

### 3. API Scan

**Duration:** ~15-20 minutes
**Coverage:** API-specific vulnerabilities

**Use Case:** REST API security validation

```bash
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-api-scan.py \
  -t http://host.docker.internal:3000/api/v1/swagger.json \
  -f openapi \
  -r docs/security/owasp-zap-api-report.html \
  -J docs/security/owasp-zap-api-report.json
```

**What it checks:**
- API authentication flaws
- Missing rate limiting
- Insecure HTTP methods
- API-specific injection attacks
- Authorization bypass

---

### 4. Authenticated Scan

**Duration:** ~45 minutes
**Coverage:** Vulnerabilities in authenticated areas

```bash
# Create authentication script
cat > docs/security/zap-auth-script.js <<'EOF'
function authenticate(helper, paramsValues, credentials) {
  var loginUrl = "http://host.docker.internal:3000/api/v1/auth/login";
  var postData = "email=" + credentials.getParam("username") +
                 "&password=" + credentials.getParam("password");

  var msg = helper.prepareMessage();
  msg.setRequestHeader("Content-Type: application/json");
  msg.setRequestBody('{"email":"' + credentials.getParam("username") +
                     '","password":"' + credentials.getParam("password") + '"}');

  helper.sendAndReceive(msg, false);

  return msg;
}
EOF

# Run authenticated scan
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-full-scan.py \
  -t http://host.docker.internal:3000 \
  -z "-config api.addrs.addr.name=.* -config api.addrs.addr.regex=true" \
  -r docs/security/owasp-zap-auth-report.html
```

---

## Scan Configuration

### Ignore False Positives

Create `.zap/rules.tsv`:
```tsv
# Ignore specific alerts
10021	IGNORE	# X-Content-Type-Options header missing (accepted)
10020	IGNORE	# X-Frame-Options header missing (accepted in dev)
```

Use in scan:
```bash
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-baseline.py \
  -t http://host.docker.internal:3000 \
  -c .zap/rules.tsv \
  -r docs/security/owasp-zap-baseline-report.html
```

### Custom Scan Policy

```bash
# Generate default policy
docker run --rm owasp/zap2docker-stable zap-cli --help

# Customize scan
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-full-scan.py \
  -t http://host.docker.internal:3000 \
  -I  # Ignore warnings
```

---

## Interpreting Results

### Risk Levels

| Risk | Alert Count | Action Required |
|------|-------------|-----------------|
| 🔴 **HIGH** | 0 | Block deployment |
| 🟠 **MEDIUM** | < 5 | Fix before release |
| 🟡 **LOW** | < 10 | Track and fix |
| 🔵 **INFORMATIONAL** | Any | Review |

### Sample Report

```
PASS: 0 WARN: 3 FAIL: 1

FAIL-NEW: 1	FAIL-INPROG: 0	WARN-NEW: 3	WARN-INPROG: 0	INFO: 5	IGNORE: 2	PASS: 45

High: 0
Medium: 1
Low: 3
Informational: 5
```

### Common Vulnerabilities

#### 1. Missing Security Headers

**Risk:** MEDIUM
**Fix:**
```typescript
// backend/src/server.ts
await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  },
});
```

#### 2. Cookie without Secure Flag

**Risk:** MEDIUM
**Fix:**
```typescript
reply.setCookie('sessionId', token, {
  secure: true,  // HTTPS only
  httpOnly: true,  // No JavaScript access
  sameSite: 'strict',  // CSRF protection
});
```

#### 3. XSS Vulnerability

**Risk:** HIGH
**Fix:** Already protected by React (automatic escaping)

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/owasp-zap-scan.yml
name: OWASP ZAP Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  zap_scan:
    runs-on: ubuntu-latest
    name: OWASP ZAP Baseline Scan

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Start Application
        run: |
          docker-compose up -d
          sleep 30  # Wait for app to start

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v3
        with:
          name: zap-report
          path: report_html.html
```

---

## Remediation Workflow

### 1. Review High/Medium Alerts

```bash
# Generate report
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:3000 -r zap-report.html

# Open report
open zap-report.html  # macOS
xdg-open zap-report.html  # Linux
```

### 2. Fix Vulnerabilities

For each HIGH/MEDIUM alert:
1. Understand the vulnerability
2. Locate affected code
3. Implement fix
4. Re-run scan to verify
5. Document in security audit report

### 3. Accept Risk (if unfixable)

Document in `docs/security/risk-acceptance.md`:
```markdown
## Risk ID: ZAP-001
**Vulnerability:** X-Frame-Options header missing
**Risk:** LOW
**Reason:** Required for Swagger UI embedding
**Mitigation:** Disabled only in development
**Accepted By:** Security Officer
**Date:** 2025-11-19
```

---

## Scan Schedule

| Environment | Scan Type | Frequency |
|-------------|-----------|-----------|
| **Development** | Baseline | On-demand |
| **Staging** | Full + API | Before each release |
| **Production** | Baseline | Weekly (passive only) |

---

## Troubleshooting

### Error: Cannot connect to target

```bash
# Check if application is running
curl http://localhost:3000/api/v1/health

# Use host.docker.internal for Docker Desktop
docker run --rm owasp/zap2docker-stable \
  zap-baseline.py -t http://host.docker.internal:3000
```

### Error: Scan timeout

```bash
# Increase timeout
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-full-scan.py -t http://localhost:3000 \
  -T 60  # 60 minutes timeout
```

### Error: Too many alerts

```bash
# Ignore low-priority alerts
docker run --rm -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:3000 \
  -l PASS  # Only show failures
```

---

## Best Practices

1. ✅ Run baseline scan in CI/CD pipeline
2. ✅ Run full scan before each release
3. ✅ Use staging environment for active scans
4. ✅ Never run full scan in production
5. ✅ Document all risk acceptances
6. ✅ Review ZAP reports with security team
7. ✅ Update ZAP Docker image regularly

---

## OWASP ZAP Command Reference

```bash
# Baseline scan (passive)
docker run --rm owasp/zap2docker-stable \
  zap-baseline.py -t <URL>

# Full scan (active)
docker run --rm owasp/zap2docker-stable \
  zap-full-scan.py -t <URL>

# API scan
docker run --rm owasp/zap2docker-stable \
  zap-api-scan.py -t <OPENAPI_URL> -f openapi

# Generate JSON report
-J <filename>.json

# Generate HTML report
-r <filename>.html

# Ignore warnings
-I

# Set timeout (minutes)
-T 60

# Use config file
-c rules.tsv
```

---

## Additional Resources

- **ZAP Documentation:** https://www.zaproxy.org/docs/
- **ZAP Docker:** https://www.zaproxy.org/docs/docker/
- **OWASP Top 10:** https://owasp.org/Top10/
- **ZAP Scripts:** https://github.com/zaproxy/community-scripts

---

## Contact

**Questions?** Contact Security Team
**ZAP Support:** https://groups.google.com/group/zaproxy-users
**Report Issues:** https://github.com/zaproxy/zaproxy/issues
