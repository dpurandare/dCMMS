# Snyk Vulnerability Scanning Procedures

**Purpose:** Guide for running Snyk security scans on dCMMS codebase
**Tool:** Snyk CLI v1.1300.2
**Frequency:** Weekly (automated), On-demand (before releases)
**Owner:** Security Team / DevOps

---

## Prerequisites

1. **Snyk CLI Installed** ✅
   ```bash
   npm install -g snyk
   snyk --version  # Should show v1.1300.2 or later
   ```

2. **Snyk Account** (Free tier available)
   - Sign up at: https://snyk.io/
   - Get API token from: https://app.snyk.io/account

3. **Authenticate Snyk CLI**
   ```bash
   snyk auth
   # Opens browser for authentication
   ```

4. **Dependencies Installed**
   ```bash
   cd backend && npm install
   cd frontend && npm install
   cd mobile && npm install
   ```

---

## Scanning Procedures

### 1. Backend Scan

```bash
cd /home/user/dCMMS/backend

# Install dependencies (if not already)
npm install

# Run Snyk test
snyk test --json > ../docs/security/snyk-backend-report.json

# Generate HTML report (optional)
snyk test --json | snyk-to-html -o ../docs/security/snyk-backend-report.html

# View summary
snyk test
```

**Expected Output:**
```
Testing /home/user/dCMMS/backend...

Organization: your-org
Package manager: npm
Target file: package.json
Project name: dcmms-backend
Open source: no
Project path: /home/user/dCMMS/backend

✓ Tested 100 dependencies for known vulnerabilities, no vulnerable paths found.
```

---

### 2. Frontend Scan

```bash
cd /home/user/dCMMS/frontend

# Install dependencies
npm install

# Run Snyk test
snyk test --json > ../docs/security/snyk-frontend-report.json

# View summary
snyk test
```

---

### 3. Mobile Scan

```bash
cd /home/user/dCMMS/mobile

# Install dependencies
npm install

# Run Snyk test
snyk test --json > ../docs/security/snyk-mobile-report.json

# View summary
snyk test
```

---

## Interpreting Results

### Severity Levels

| Severity | Action Required | Timeline |
|----------|----------------|----------|
| 🔴 **CRITICAL** | Fix immediately | Same day |
| 🟠 **HIGH** | Fix within 7 days | Next sprint |
| 🟡 **MEDIUM** | Fix within 30 days | Prioritize |
| 🔵 **LOW** | Fix when convenient | Backlog |

### Sample Output

```json
{
  "ok": false,
  "vulnerabilities": [
    {
      "id": "SNYK-JS-AXIOS-1234567",
      "title": "Prototype Pollution",
      "severity": "high",
      "packageName": "axios",
      "version": "1.6.5",
      "fixedIn": ["1.7.0"],
      "upgradePath": ["axios@1.7.0"]
    }
  ]
}
```

---

## Remediation Workflow

### 1. Review Vulnerabilities

```bash
snyk test --severity-threshold=high
```

### 2. Apply Automatic Fixes

```bash
# Attempt automatic fix
snyk wizard

# Or use npm update
npm update axios

# Or upgrade specific package
npm install axios@latest
```

### 3. Verify Fix

```bash
snyk test

# Re-run after fixes
npm install
snyk test --json > snyk-report-after-fix.json
```

### 4. Document Exceptions

If vulnerability cannot be fixed (e.g., no patch available):

```bash
# Ignore specific vulnerability
snyk ignore --id=SNYK-JS-AXIOS-1234567 --reason="No fix available, risk accepted" --expiry="2025-12-31"
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/snyk-security.yml
name: Snyk Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

---

## Reporting

### Generate Reports

```bash
# Combined report (all projects)
./scripts/run-snyk-scans.sh > docs/security/snyk-combined-report.txt

# Upload to Snyk dashboard
snyk monitor
```

### Report Format

1. **JSON** - Machine-readable, for automation
2. **HTML** - Human-readable, for stakeholders
3. **CSV** - For tracking/spreadsheets

---

## Troubleshooting

### Error: "Missing node_modules folder"

```bash
# Solution: Install dependencies first
npm install
```

### Error: "Authentication required"

```bash
# Solution: Authenticate with Snyk
snyk auth
```

### Error: "Rate limit exceeded"

```bash
# Solution: Wait or upgrade Snyk plan
# Free tier: 200 tests/month
```

---

## Best Practices

1. ✅ Run Snyk before every release
2. ✅ Fix critical/high vulnerabilities immediately
3. ✅ Monitor Snyk dashboard weekly
4. ✅ Keep dependencies up-to-date
5. ✅ Document risk acceptance for unfixable issues
6. ✅ Integrate Snyk into CI/CD pipeline

---

## Snyk CLI Command Reference

```bash
# Test for vulnerabilities
snyk test

# Test with severity threshold
snyk test --severity-threshold=high

# Test and monitor (send results to dashboard)
snyk monitor

# Test specific file
snyk test --file=package.json

# Test all projects
snyk test --all-projects

# Generate JSON report
snyk test --json

# Ignore vulnerability
snyk ignore --id=SNYK-JS-PKG-123

# List ignored vulnerabilities
snyk policy

# Update Snyk database
snyk update
```

---

## Contact

**Questions?** Contact Security Team
**Snyk Support:** support@snyk.io
**Documentation:** https://docs.snyk.io/
