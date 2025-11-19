# Security Operations Guide

**Document:** dCMMS Security Operations Guide
**Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** Security Team
**Classification:** Internal - Confidential
**Review Frequency:** Quarterly

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Security Organization](#security-organization)
3. [Security Monitoring](#security-monitoring)
4. [Access Control Management](#access-control-management)
5. [Security Patching](#security-patching)
6. [Vulnerability Management](#vulnerability-management)
7. [Security Incident Response](#security-incident-response)
8. [Compliance & Auditing](#compliance--auditing)
9. [Security Training](#security-training)
10. [Appendices](#appendices)

---

## Executive Summary

This Security Operations Guide defines the processes, procedures, and responsibilities for maintaining the security posture of the dCMMS platform. The guide ensures consistent security practices, rapid threat detection and response, and compliance with industry standards.

### Security Objectives

1. **Protect customer data** from unauthorized access, disclosure, or loss
2. **Maintain system availability** against security threats and attacks
3. **Ensure compliance** with data protection regulations (GDPR, CCPA, etc.)
4. **Detect and respond** to security incidents within defined SLAs
5. **Continuously improve** security posture through testing and monitoring

### Scope

This guide covers:
- Production, staging, and development environments
- Web application, mobile app, API, and backend services
- Databases, cloud infrastructure, and network security
- Third-party integrations and vendor access
- Employee access and authentication

---

## Security Organization

### Roles and Responsibilities

#### Security Lead / CISO

**Responsibilities:**
- Overall security strategy and governance
- Security policy development and enforcement
- Security budget and resource allocation
- Executive reporting and stakeholder communication
- Compliance oversight
- Security team management

**Authority:**
- Approve security policies and procedures
- Authorize emergency security actions
- Escalate to executive team when needed
- Mandate security requirements for projects

---

#### Security Engineer

**Responsibilities:**
- Security monitoring and alerting configuration
- Vulnerability scanning and assessment
- Security tool management (Snyk, OWASP ZAP, etc.)
- Security incident investigation
- Security hardening and configuration
- Security automation and scripting

**On-Call:** 24/7 rotation for security incidents

---

#### Security Analyst

**Responsibilities:**
- Daily security log review
- Security alert triage and investigation
- Threat intelligence monitoring
- Security metrics reporting
- User access reviews
- Security awareness training coordination

---

#### DevSecOps Engineer

**Responsibilities:**
- Secure CI/CD pipeline configuration
- Container and infrastructure security
- Secrets management (HashiCorp Vault integration)
- Security testing integration
- Infrastructure-as-Code security scanning
- Cloud security posture management

---

### Security Committee

**Members:**
- CISO / Security Lead (Chair)
- Engineering Manager
- Infrastructure Lead
- Compliance Officer
- Privacy Officer
- Legal Counsel (as needed)

**Meeting Frequency:** Monthly

**Responsibilities:**
- Review security metrics and trends
- Approve major security initiatives
- Review high-severity vulnerabilities
- Approve security exceptions and waivers
- Review security incidents and lessons learned

---

## Security Monitoring

### Security Information and Event Management (SIEM)

**Tool:** ELK Stack (Elasticsearch, Logstash, Kibana) + Wazuh (optional)

**Log Sources:**
- Application logs (Fastify backend, Next.js frontend)
- Web server logs (Nginx access/error logs)
- Database logs (PostgreSQL, QuestDB)
- SSH authentication logs
- AWS CloudTrail (API activity)
- Docker container logs
- Firewall logs
- IDS/IPS alerts

**Retention:**
- Hot storage: 30 days (Elasticsearch)
- Warm storage: 90 days (S3)
- Cold storage: 1 year (S3 Glacier)
- Compliance logs: 7 years (as required)

---

### Security Alerts

**Critical Security Alerts (Immediate Response):**

1. **Unauthorized Access Detected**
   - Multiple failed login attempts (> 10 in 5 minutes)
   - Login from blacklisted IP or country
   - Privilege escalation attempt
   - **Action:** Block IP, notify Security Lead, investigate

2. **Malware/Ransomware Detected**
   - Antivirus detection on servers
   - Suspicious file encryption activity
   - Unknown processes running
   - **Action:** Isolate system, preserve evidence, engage IR team

3. **Data Exfiltration Suspected**
   - Large data transfer to external IP
   - Database dump to unauthorized location
   - Unusual API data access patterns
   - **Action:** Block network connection, investigate, notify CISO

4. **DDoS Attack**
   - Traffic volume > 10x normal
   - High rate of requests from single IP/range
   - Service degradation due to traffic
   - **Action:** Enable DDoS protection, block sources, notify infrastructure

5. **Critical Vulnerability Exploit Attempt**
   - SQL injection attempt
   - XSS attempt
   - RCE (Remote Code Execution) attempt
   - **Action:** Block IP, patch vulnerability immediately, investigate

---

### Security Dashboards

**Grafana Security Dashboard:**

**Panels:**
1. Failed Authentication Attempts (24h trend)
2. Successful Logins by User
3. API Errors by Type (400, 401, 403, 500)
4. Firewall Blocks by Country
5. Database Query Anomalies
6. SSL Certificate Expiration (countdown)
7. Security Scan Results (Snyk, OWASP ZAP)
8. Vulnerability Count by Severity

**Access:** Security team, Engineering Manager, CTO

**Review Frequency:** Daily (Security Analyst), Weekly (Security Lead)

---

## Access Control Management

### Principle of Least Privilege

**Policy:** Users and systems are granted the minimum access required to perform their job functions.

**Implementation:**
- Role-Based Access Control (RBAC) for all systems
- Just-In-Time (JIT) access for elevated privileges
- Time-limited access for temporary needs
- Regular access reviews (quarterly)

---

### User Access Levels

| Level | Access | Granted To | Approval Required |
|-------|--------|------------|-------------------|
| **Admin** | Full system access | CTO, Engineering Manager | CISO + CTO |
| **Engineer** | Production read, Staging read/write | Senior Engineers | Engineering Manager |
| **Developer** | Dev read/write, Staging read | All Developers | Team Lead |
| **Support** | Production read-only (limited PII) | Customer Support | Support Manager |
| **Auditor** | Read-only logs and metrics | Compliance Team | CISO |

---

### Production Access Policy

**Requirements for Production Access:**
1. ✅ Completion of security training
2. ✅ Manager approval
3. ✅ CISO approval (for admin access)
4. ✅ Multi-factor authentication (MFA) enabled
5. ✅ SSH key registered (for server access)
6. ✅ VPN configured

**Access Request Process:**
1. Submit request via ticketing system
2. Manager reviews and approves
3. Security team provisions access
4. Access logged and monitored
5. Access reviewed quarterly

**Access Revocation:**
- Immediate upon employee termination
- Within 24 hours for role change
- Automatic expiration for temporary access

---

### Multi-Factor Authentication (MFA)

**Policy:** MFA is **REQUIRED** for:
- Production environment access
- AWS Console access
- Database access (production)
- VPN access
- Admin accounts
- GitHub (code repository) access

**Supported MFA Methods:**
1. **Preferred:** Hardware tokens (YubiKey)
2. **Acceptable:** Authenticator apps (Google Authenticator, Authy)
3. **Not Recommended:** SMS (only as fallback)

**Enforcement:**
- MFA enforced via AWS IAM policies
- MFA enforced via SSH configuration
- MFA grace period: 7 days for new users

---

### SSH Key Management

**Policy:**
- Password authentication **DISABLED** on all servers
- SSH keys rotated every 12 months
- Private keys encrypted with passphrase
- No sharing of SSH keys between users

**Key Registration Process:**
1. Generate 4096-bit RSA or ED25519 key pair
2. Submit public key via secure form
3. Security team adds to authorized_keys
4. Test access within 24 hours

**Key Rotation:**
- Annual mandatory rotation
- Immediate rotation if key compromised
- Old keys removed from all systems

---

### Secrets Management

**Tools:**
- **HashiCorp Vault:** Production secrets (API keys, database passwords)
- **AWS Secrets Manager:** AWS-specific credentials
- **Environment Variables:** Development (non-sensitive only)

**Policy:**
- ❌ **NEVER** commit secrets to Git
- ❌ **NEVER** hardcode secrets in code
- ✅ Use Vault for all production secrets
- ✅ Rotate secrets every 90 days
- ✅ Use unique secrets per environment

**Secret Rotation Schedule:**
- **Database Passwords:** 90 days
- **API Keys:** 90 days
- **JWT Signing Keys:** 180 days
- **SSL/TLS Certificates:** Auto-renewal via Let's Encrypt

---

## Security Patching

**See detailed procedures in:** [patching-procedures.md](./patching-procedures.md)

### Patching SLA

| Severity | Patch Window | Example |
|----------|--------------|---------|
| **Critical** | 24 hours | Remote Code Execution (RCE), Authentication bypass |
| **High** | 7 days | SQL Injection, XSS, Privilege escalation |
| **Medium** | 30 days | Information disclosure, DoS |
| **Low** | 90 days | Minor bugs, cosmetic issues |

### Patch Sources

**Monitored Sources:**
- OS security updates (Ubuntu Security Notices)
- Node.js security advisories
- npm package vulnerabilities (via Snyk)
- Docker base image updates
- PostgreSQL security announcements
- Third-party library CVEs

### Emergency Patching Process

**For Critical Vulnerabilities:**

1. **Detection** (0-2 hours)
   - Security team notified via alert or announcement
   - Severity assessed using CVSS score

2. **Assessment** (2-4 hours)
   - Confirm dCMMS is affected
   - Identify affected systems/services
   - Determine exploit availability

3. **Patching** (4-12 hours)
   - Test patch in staging
   - Deploy to production (emergency change approval)
   - Verify fix effectiveness

4. **Verification** (12-24 hours)
   - Run vulnerability scans
   - Monitor for exploitation attempts
   - Document remediation

---

## Vulnerability Management

**See detailed procedures in:** [vulnerability-management.md](./vulnerability-management.md)

### Vulnerability Scanning

**Tools:**
- **Snyk:** Dependency vulnerability scanning (npm, Docker)
- **OWASP ZAP:** Dynamic Application Security Testing (DAST)
- **npm audit:** npm package vulnerabilities
- **Trivy:** Container image scanning

**Scan Frequency:**
- **Daily:** Snyk automated scans
- **Weekly:** OWASP ZAP baseline scans
- **Monthly:** Full OWASP ZAP comprehensive scans
- **Per Deployment:** Container image scans (Trivy)

### Vulnerability Severity Classification

**Using CVSS 3.1 scoring:**

| CVSS Score | Severity | SLA | Example |
|------------|----------|-----|---------|
| **9.0-10.0** | Critical | 24 hours | RCE, Auth bypass |
| **7.0-8.9** | High | 7 days | SQL injection, XSS |
| **4.0-6.9** | Medium | 30 days | Info disclosure |
| **0.1-3.9** | Low | 90 days | Minor bugs |

### Vulnerability Remediation Process

1. **Detection:** Automated scan or manual discovery
2. **Triage:** Security team assesses severity and impact
3. **Assignment:** Ticket created and assigned to engineering
4. **Remediation:** Fix applied (patch, code fix, configuration change)
5. **Verification:** Re-scan to confirm fix
6. **Closure:** Ticket closed, metrics updated

---

## Security Incident Response

**See detailed procedures in:** [security-incident-response.md](./security-incident-response.md)

### Security Incident Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **S1 - Critical** | Data breach, active attack | < 15 min | CISO, CTO, Legal |
| **S2 - High** | Attempted breach, malware | < 30 min | Security Lead |
| **S3 - Medium** | Policy violation, suspicious activity | < 2 hours | Security Analyst |
| **S4 - Low** | Minor security event | < 1 day | Security Analyst |

### Security Incident Response Team (SIRT)

**Core Team:**
- Security Lead (Incident Commander)
- Security Engineer (Technical Lead)
- Infrastructure Engineer
- Legal Counsel (for breaches)
- Communications Manager (for public disclosure)

**Extended Team (as needed):**
- Forensics Specialist (external consultant)
- Law Enforcement Liaison
- PR/Media Relations

### Incident Response Phases

1. **Preparation:** Tools, training, procedures ready
2. **Detection:** Monitoring, alerts, user reports
3. **Containment:** Isolate affected systems, prevent spread
4. **Eradication:** Remove malware, close vulnerabilities
5. **Recovery:** Restore systems, verify integrity
6. **Lessons Learned:** Post-incident review, improvements

---

## Compliance & Auditing

### Regulatory Compliance

**Applicable Regulations:**
- **GDPR:** General Data Protection Regulation (EU)
- **CCPA:** California Consumer Privacy Act (US)
- **SOC 2 Type II:** Security, Availability, Confidentiality (Target: 2026)
- **ISO 27001:** Information Security Management (Target: 2026)

### Security Controls

**Implemented Controls (per SOC 2):**

| Control Area | Implementation | Status |
|--------------|----------------|--------|
| **Access Control** | RBAC, MFA, least privilege | ✅ Implemented |
| **Network Security** | Firewall, VPN, segmentation | ✅ Implemented |
| **Encryption** | TLS 1.3, AES-256 at rest | ✅ Implemented |
| **Logging & Monitoring** | SIEM, security dashboards | ✅ Implemented |
| **Incident Response** | IR plan, SIRT team | ✅ Implemented |
| **Vulnerability Management** | Scanning, patching SLAs | ✅ Implemented |
| **Business Continuity** | DR plan, backups | ✅ Implemented |
| **Physical Security** | Cloud provider controls | ✅ Implemented |
| **HR Security** | Background checks, training | ⏳ In Progress |

### Security Audits

**Internal Audits:**
- Frequency: Quarterly
- Scope: Access reviews, configuration audits, log reviews
- Owner: Security team
- Report to: Security Committee

**External Audits:**
- Frequency: Annually
- Scope: Penetration testing, SOC 2 audit
- Provider: External security firm
- Report to: Board of Directors

### Audit Logging

**Audit Events Logged:**
- User authentication (success/failure)
- Administrative actions (user creation, permission changes)
- Data access (PII, financial data)
- Configuration changes (firewall, security settings)
- Security events (alerts, incidents)

**Audit Log Protection:**
- Centralized logging (ELK stack)
- Immutable storage (write-once)
- Encrypted in transit and at rest
- Access restricted to Security and Compliance teams

---

## Security Training

### Security Awareness Training

**Mandatory for:** All employees

**Frequency:** Annually (new employees within 30 days of hire)

**Topics:**
- Password security and MFA
- Phishing and social engineering
- Data classification and handling
- Incident reporting procedures
- Clean desk policy
- Acceptable use policy

**Delivery:** Online training platform (e.g., KnowBe4)

**Completion Tracking:** HR system, 95% completion target

---

### Role-Specific Security Training

**For Developers:**
- Secure coding practices (OWASP Top 10)
- Input validation and sanitization
- Authentication and authorization
- Cryptography basics
- Secure API design

**For Operations:**
- Server hardening
- Network security
- Access control management
- Incident response procedures
- Log analysis

**For Support:**
- Social engineering awareness
- Secure communication with customers
- PII handling procedures
- Suspicious activity detection

---

### Phishing Simulation

**Frequency:** Quarterly

**Process:**
1. Security team sends simulated phishing emails
2. Track click rates and credential submissions
3. Provide immediate training for users who fall for simulation
4. Report metrics to Security Committee

**Target:** < 5% click rate

---

## Appendices

### Appendix A: Security Tool Inventory

| Tool | Purpose | Owner | Access |
|------|---------|-------|--------|
| **Snyk** | Dependency vulnerability scanning | Security Engineer | Engineering team |
| **OWASP ZAP** | Web application security testing | Security Engineer | Security team |
| **Wazuh** | Host-based intrusion detection | Security Engineer | Security team |
| **ELK Stack** | Security logging and SIEM | DevOps Engineer | Security, Ops teams |
| **HashiCorp Vault** | Secrets management | DevSecOps Engineer | Engineering team (read) |
| **AWS GuardDuty** | Threat detection for AWS | Security Engineer | Security team |
| **Fail2ban** | Brute force protection | Infrastructure Engineer | Ops team |
| **ClamAV** | Antivirus scanning | Security Engineer | Automated |

---

### Appendix B: Security Contacts

| Role | Primary Contact | Backup | Phone | Email |
|------|----------------|--------|-------|-------|
| **Security Lead** | [Name] | [Name] | [TBD] | security@dcmms.com |
| **Security Engineer** | [Name] | [Name] | [TBD] | security-team@dcmms.com |
| **CISO** | [Name] | - | [TBD] | ciso@dcmms.com |
| **Legal** | [Name] | [Name] | [TBD] | legal@dcmms.com |

**External Contacts:**
- **Cybersecurity Insurance:** [Provider], [Policy Number], [Phone]
- **External Security Firm:** [Company], [Contact], [Phone]
- **Law Enforcement:** Local FBI Cyber Division, [Phone]

---

### Appendix C: Security Metrics

**Key Security Metrics (Monthly Reporting):**

1. **Vulnerability Metrics:**
   - Open vulnerabilities by severity
   - Mean time to remediate (MTTR) by severity
   - Vulnerability backlog age

2. **Access Control Metrics:**
   - MFA adoption rate (target: 100%)
   - Access review completion rate (target: 100%)
   - Privileged access count (trend)

3. **Incident Metrics:**
   - Security incidents by severity
   - Mean time to detect (MTTD)
   - Mean time to respond (MTTR)

4. **Compliance Metrics:**
   - Security training completion rate
   - Audit finding remediation rate
   - Policy exception count

5. **Monitoring Metrics:**
   - Log ingestion rate
   - Alert false positive rate
   - Security scan coverage (% of systems)

---

### Appendix D: Security Policies Quick Reference

| Policy | Summary | Link |
|--------|---------|------|
| **Acceptable Use Policy** | Defines acceptable use of company systems | [TBD] |
| **Data Classification Policy** | Defines data sensitivity levels | [TBD] |
| **Password Policy** | Minimum 12 chars, complexity, MFA required | [TBD] |
| **Incident Response Policy** | Incident classification and response | incident-response-plan.md |
| **Access Control Policy** | RBAC, least privilege, access reviews | [This document] |
| **Encryption Policy** | TLS 1.3+ for transit, AES-256 for rest | [TBD] |

---

### Appendix E: Security Checklist for New Services

**Before deploying a new service to production:**

- [ ] Security design review completed
- [ ] Threat model documented
- [ ] Secure coding review performed
- [ ] Input validation implemented
- [ ] Authentication and authorization implemented
- [ ] Secrets stored in Vault (not hardcoded)
- [ ] HTTPS/TLS enforced
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting implemented
- [ ] Logging and monitoring configured
- [ ] Snyk scan passed (no critical/high vulnerabilities)
- [ ] OWASP ZAP scan completed
- [ ] Penetration test performed (for public-facing services)
- [ ] Security team sign-off obtained
- [ ] Incident response runbook created

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | Security Team | Initial version |

**Next Review Date:** 2026-02-19 (Quarterly)

**Document Owner:** Security Lead / CISO

**Approval:**
- Security Lead: _________________________ Date: _________
- CISO: _________________________ Date: _________
- CTO: _________________________ Date: _________

---

**For security incidents, contact:** security@dcmms.com or call [24/7 Security Hotline]

**For security questions, contact:** security-team@dcmms.com
