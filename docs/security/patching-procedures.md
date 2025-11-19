# Security Patching Procedures

**Document:** Security Patching Procedures
**Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** Security Team & Infrastructure Team
**Review Frequency:** Quarterly

---

## Purpose

This document defines the procedures for identifying, testing, and deploying security patches for the dCMMS platform to maintain a secure and resilient infrastructure.

---

## Patching SLA

| Severity | CVSS Score | Patch Window | Approval | Example |
|----------|------------|--------------|----------|---------|
| **Critical** | 9.0-10.0 | **24 hours** | CISO + CTO | RCE, Authentication bypass, Data breach |
| **High** | 7.0-8.9 | **7 days** | Security Lead | SQL Injection, XSS, Privilege escalation |
| **Medium** | 4.0-6.9 | **30 days** | Engineering Manager | Information disclosure, DoS |
| **Low** | 0.1-3.9 | **90 days** | Team Lead | Minor bugs, performance issues |

---

## Patch Sources

### Operating System Patches

**Ubuntu Security Notices:**
- **Source:** https://ubuntu.com/security/notices
- **Monitoring:** Automated via email subscription + RSS feed
- **Frequency:** Daily check

**Process:**
1. Security team monitors Ubuntu Security Notices
2. Evaluate applicability to dCMMS infrastructure
3. Test in staging environment
4. Deploy to production during maintenance window

---

### Application Dependencies

**Node.js & npm Packages:**
- **Tool:** Snyk (automated scanning)
- **Frequency:** Daily scans
- **Command:** `snyk test` in CI/CD pipeline

**Process:**
1. Snyk detects vulnerability in dependency
2. Alert sent to Security team and assigned engineer
3. Review fix version availability
4. Update package.json and test
5. Deploy via standard deployment process

---

### Docker Base Images

**Container Image Scanning:**
- **Tool:** Trivy
- **Frequency:** On every image build
- **Registry:** Docker Hub, AWS ECR

**Process:**
1. Trivy scans image during build
2. Block deployment if critical vulnerabilities found
3. Rebuild image with updated base image
4. Rescan and deploy

---

### Database (PostgreSQL)

**PostgreSQL Security Patches:**
- **Source:** PostgreSQL security announcements
- **Monitoring:** Mailing list subscription
- **Frequency:** Weekly check

**Process:**
1. Review PostgreSQL security advisory
2. Test patch on development database
3. Create database backup
4. Apply patch during maintenance window
5. Verify database functionality
6. Monitor performance for 24 hours

---

## Patch Testing Process

### Stage 1: Development Environment

**Timeline:** Day 0-1

**Steps:**
1. Apply patch to development environment
2. Run automated test suite
3. Manual functional testing
4. Performance regression testing

**Success Criteria:**
- ✅ All automated tests pass
- ✅ No functional regressions
- ✅ No performance degradation (> 10%)

---

### Stage 2: Staging Environment

**Timeline:** Day 1-3

**Steps:**
1. Deploy patch to staging environment
2. Run full integration test suite
3. Perform security validation
4. Load testing (for critical patches)

**Success Criteria:**
- ✅ Integration tests pass
- ✅ Security scan shows vulnerability remediated
- ✅ Load test performance acceptable

---

### Stage 3: Production Deployment

**Timeline:** Day 3-7 (or within SLA)

**Steps:**
1. Schedule maintenance window (if downtime required)
2. Notify stakeholders of patching activity
3. Create pre-deployment backup
4. Deploy patch to production
5. Monitor system health for 1 hour
6. Post-deployment validation

**Success Criteria:**
- ✅ Patch applied successfully
- ✅ All services operational
- ✅ No error rate spike
- ✅ Vulnerability no longer detected in scans

---

## Emergency Patching (Critical Vulnerabilities)

### Criteria for Emergency Patching

- **CVSS Score:** 9.0 or higher
- **Exploit Available:** Proof-of-concept or active exploitation
- **Publicly Disclosed:** Vulnerability publicly known
- **Affects Production:** dCMMS system is vulnerable

### Emergency Patch Process

**Timeline:** 24 hours from disclosure

**Hour 0-2: Assessment**
1. Security team receives vulnerability notification
2. Confirm dCMMS is affected
3. Assess severity and exploitability
4. Create incident ticket (HIGH priority)
5. Notify CISO, CTO, Engineering Manager

**Hour 2-6: Preparation**
1. Obtain patch or fix from vendor/maintainer
2. Test patch in development environment
3. Prepare deployment plan
4. Identify rollback procedure
5. Draft communication to stakeholders

**Hour 6-18: Deployment**
1. Deploy to staging environment
2. Run critical path tests
3. Get approval from CISO + Engineering Manager
4. Deploy to production (emergency change)
5. Monitor closely for 2 hours post-deployment

**Hour 18-24: Validation**
1. Run vulnerability scan to confirm fix
2. Monitor for exploitation attempts
3. Document remediation actions
4. Update security metrics
5. Send post-patch communication

### Emergency Change Approval

**Approval Required:**
- ✅ Security Lead
- ✅ Engineering Manager
- ✅ CTO (for critical infrastructure changes)

**Approval Method:**
- Slack approval in #security-emergencies channel
- Email confirmation to security@dcmms.com
- Document approval in incident ticket

---

## Patch Deployment Methods

### Method 1: Package Manager (apt/yum)

**Use Case:** Operating system patches

```bash
# Update package lists
sudo apt update

# Review available security updates
sudo apt list --upgradable

# Apply security updates only
sudo unattended-upgrades -d

# Or apply all updates
sudo apt upgrade -y

# Reboot if kernel updated
sudo reboot
```

**Automation:** Automated via Ansible playbooks

---

### Method 2: npm Package Updates

**Use Case:** Node.js dependencies

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (for non-breaking changes)
npm audit fix

# Update specific package
npm update <package-name>

# Update to latest (potentially breaking)
npm install <package-name>@latest

# Verify fixes
npm audit
snyk test
```

**Automation:** Automated PRs via Dependabot

---

### Method 3: Docker Image Rebuild

**Use Case:** Container base image updates

```bash
# Pull latest base image
docker pull node:20-alpine

# Rebuild application image
docker build -t dcmms-backend:latest .

# Scan for vulnerabilities
trivy image dcmms-backend:latest

# Push to registry
docker push dcmms-backend:latest

# Deploy to Kubernetes/ECS
kubectl set image deployment/dcmms-backend dcmms-backend=dcmms-backend:latest
```

**Automation:** CI/CD pipeline auto-rebuild on base image update

---

### Method 4: Infrastructure as Code (Terraform)

**Use Case:** Cloud infrastructure updates

```bash
# Update provider versions in Terraform
terraform init -upgrade

# Plan changes
terraform plan

# Apply infrastructure updates
terraform apply

# Verify infrastructure health
terraform output
```

---

## Patch Rollback Procedures

### When to Rollback

- Application crashes after patch
- Performance degradation > 30%
- Error rate increase > 5%
- Critical functionality broken
- Data integrity issues

### Rollback Process

**Step 1: Immediate Action**
1. Stop deployment if in progress
2. Declare incident (P2 severity)
3. Notify engineering team in #incidents channel

**Step 2: Rollback Execution**

**For Code Deployment:**
```bash
# Rollback to previous version
kubectl rollout undo deployment/dcmms-backend

# Or deploy specific previous version
kubectl set image deployment/dcmms-backend dcmms-backend=dcmms-backend:v1.2.3
```

**For Database Changes:**
```bash
# Restore from backup
pg_restore -d dcmms /backups/dcmms_before_patch.dump

# Or restore from point-in-time
# (See disaster-recovery-plan.md)
```

**For Infrastructure:**
```bash
# Revert Terraform changes
git revert <commit-hash>
terraform apply
```

**Step 3: Verification**
1. Verify system functionality restored
2. Monitor error rates and performance
3. Confirm user access working
4. Update status page

**Step 4: Root Cause Analysis**
1. Investigate why patch caused issues
2. Document findings in incident report
3. Determine alternative patching approach
4. Schedule retry with improved testing

---

## Patching Schedule

### Regular Maintenance Windows

| Environment | Day | Time (UTC) | Duration | Frequency |
|-------------|-----|------------|----------|-----------|
| **Development** | Any weekday | Business hours | 2 hours | As needed |
| **Staging** | Wednesday | 14:00-16:00 | 2 hours | Weekly |
| **Production** | Sunday | 02:00-06:00 | 4 hours | Monthly |

### Monthly Patch Tuesday

**Schedule:** Second Tuesday of each month (following Microsoft Patch Tuesday)

**Activities:**
1. Review all security advisories from previous month
2. Prioritize patches by severity
3. Test patches in development/staging
4. Schedule production deployment for following weekend

---

## Patch Communication

### Pre-Patch Notification

**Audience:** Engineering team, Support team, Key customers (for production)

**Timing:** 48 hours before production patching

**Template:**
```
Subject: [dCMMS] Scheduled Maintenance - [Date] [Time]

Dear Team,

We will be performing scheduled security patching on [Date] at [Time UTC].

Expected Impact: [None / Brief service interruption / Downtime]
Duration: [X hours]
Affected Services: [List]

Security Patches Being Applied:
- [Patch 1]: [Brief description]
- [Patch 2]: [Brief description]

Maintenance Window: [Start Time] - [End Time] UTC

For questions, contact: infrastructure@dcmms.com
```

### Post-Patch Communication

**Audience:** Same as pre-patch

**Timing:** Within 1 hour of completion

**Template:**
```
Subject: [dCMMS] Maintenance Complete - [Date]

The scheduled maintenance on [Date] has been completed successfully.

Patches Applied:
- ✅ [Patch 1]
- ✅ [Patch 2]

All systems are operational and verified.

If you experience any issues, please report to: support@dcmms.com
```

---

## Patch Metrics & Reporting

### Key Metrics

**Tracked Monthly:**
1. **Patch Compliance Rate**
   - % of systems fully patched
   - Target: > 95%

2. **Mean Time to Patch (MTTP)**
   - Critical: < 24 hours (Target)
   - High: < 7 days (Target)
   - Medium: < 30 days (Target)

3. **Patch Success Rate**
   - % of patches applied without rollback
   - Target: > 98%

4. **Overdue Patches**
   - Count of patches past SLA
   - Target: 0 critical, < 5 high

### Monthly Security Report

**Report Sections:**
1. Patches applied this month (by severity)
2. Outstanding patches (by severity and age)
3. Patch compliance by system/service
4. Incidents related to patching
5. Upcoming critical patches

**Recipients:**
- Security Committee
- Engineering Manager
- CTO

---

## Automated Patching

### Automated Security Updates (Unattended Upgrades)

**Enabled for:**
- Security updates only (not all updates)
- Non-production environments

**Configuration:** `/etc/apt/apt.conf.d/50unattended-upgrades`

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
```

---

### Dependabot (GitHub)

**Enabled for:** All code repositories

**Configuration:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "security"
```

**Process:**
1. Dependabot creates PR for dependency updates
2. CI/CD runs automated tests
3. Security team reviews and approves
4. Auto-merge if all tests pass (low/medium severity)
5. Manual review for high/critical severity

---

## Appendix: Patching Checklist

### Pre-Patch Checklist

- [ ] Vulnerability severity confirmed (CVSS score)
- [ ] Patch/fix identified and obtained
- [ ] Impact assessment completed
- [ ] Testing plan created
- [ ] Rollback plan documented
- [ ] Backups verified (for production)
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders notified
- [ ] Approval obtained (per severity SLA)

### Patch Deployment Checklist

- [ ] Pre-deployment backup created
- [ ] Patch applied to dev environment
- [ ] Dev tests passed
- [ ] Patch applied to staging environment
- [ ] Staging tests passed
- [ ] Security scan confirms vulnerability fixed
- [ ] Production deployment approved
- [ ] Patch applied to production
- [ ] Post-deployment health check passed
- [ ] Monitoring active for 1+ hour
- [ ] No error rate spike detected

### Post-Patch Checklist

- [ ] Vulnerability re-scan confirms fix
- [ ] System performance validated
- [ ] Stakeholders notified of completion
- [ ] Patch ticket closed
- [ ] Metrics updated
- [ ] Documentation updated (if configuration changed)
- [ ] Lessons learned documented (if issues occurred)

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | Security Team | Initial version |

**Next Review Date:** 2026-02-19

**Approval:**
- Security Lead: _________________________ Date: _________
- Engineering Manager: _________________________ Date: _________
