# Security Incident Response Procedures

**Document:** Security Incident Response Procedures
**Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** Security Team

---

## Overview

This document defines specific procedures for responding to security incidents affecting the dCMMS platform. It supplements the general [Incident Response Plan](../operations/incident-response-plan.md) with security-specific guidance.

---

## Security Incident Classification

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **S1 - Critical** | Active data breach, system compromise | < 15 min | Confirmed data breach, ransomware, active intrusion |
| **S2 - High** | Attempted breach, critical vulnerability exploit | < 30 min | Attempted unauthorized access, malware detected, DDoS attack |
| **S3 - Medium** | Security policy violation, suspicious activity | < 2 hours | Repeated failed logins, policy violation, phishing attempt |
| **S4 - Low** | Minor security event, informational | < 1 day | Password policy violation, low-risk vulnerability |

---

## Security Incident Response Team (SIRT)

**Core Team:**
- **Security Lead (Incident Commander):** Overall coordination
- **Security Engineer (Technical Lead):** Technical investigation
- **Infrastructure Engineer:** System access and containment
- **Database Administrator:** Data integrity verification
- **Legal Counsel:** Legal implications, breach notification

**Extended Team (as needed):**
- Forensics Specialist (external)
- Law Enforcement Liaison
- PR/Communications
- Customer Success (for customer communication)

---

## Incident Response Phases

### Phase 1: Detection & Reporting

**Detection Sources:**
- SIEM alerts (Wazuh, ELK)
- IDS/IPS alerts
- Antivirus/EDR alerts
- User reports
- Threat intelligence feeds
- Vendor security notifications

**Reporting:**
- Email: security@dcmms.com
- Slack: @security-team or #security channel
- PagerDuty: Security Engineer on-call
- Phone: [Security Hotline - 24/7]

### Phase 2: Initial Assessment (0-30 minutes)

**Security Engineer Actions:**
1. **Acknowledge** incident receipt
2. **Gather** initial information:
   - What was detected?
   - When did it occur?
   - Which systems are affected?
   - Is this confirmed or suspected?
3. **Classify** severity (S1-S4)
4. **Escalate** if S1/S2:
   - Page Security Lead
   - Create #incident-security-YYYYMMDD channel
   - Notify CTO (for S1)

### Phase 3: Containment (30 minutes - 2 hours)

**Goal:** Prevent further damage or data loss

**Short-term Containment:**
- Isolate affected systems (network segmentation)
- Block malicious IPs at firewall
- Disable compromised accounts
- Take affected systems offline if needed

**Preserve Evidence:**
- Snapshot affected systems
- Capture memory dumps
- Copy logs before they rotate
- Document all actions with timestamps

**Long-term Containment:**
- Apply temporary patches/workarounds
- Implement enhanced monitoring
- Rotate credentials
- Enable additional logging

### Phase 4: Investigation & Eradication (2 hours - days)

**Forensic Investigation:**
1. **Identify attack vector:** How did attacker gain access?
2. **Determine scope:** What systems were compromised?
3. **Assess impact:** What data was accessed/exfiltrated?
4. **Timeline reconstruction:** When did breach occur?
5. **Attacker attribution:** Who was responsible? (if possible)

**Eradication:**
- Remove malware/backdoors
- Close vulnerabilities exploited
- Rebuild compromised systems
- Reset all potentially compromised credentials

### Phase 5: Recovery (Variable timeline)

**System Restoration:**
1. Restore from clean backups (if needed)
2. Rebuild systems from known good images
3. Apply all security patches
4. Reconfigure with hardened settings
5. Restore data from backups

**Verification:**
- Vulnerability scans confirm vulnerabilities closed
- No malware detected in clean scans
- Systems functioning normally
- Enhanced monitoring shows no suspicious activity

### Phase 6: Post-Incident Activities

**Immediate (within 24 hours):**
- Declare incident resolved
- Update stakeholders
- Preserve evidence for potential legal action

**Short-term (within 1 week):**
- Conduct post-incident review meeting
- Document timeline and actions
- Identify lessons learned
- Create improvement action items

**Long-term (within 1 month):**
- Implement security improvements
- Update runbooks and procedures
- Conduct security training based on incident
- Review and update threat model

---

## Specific Incident Types

### Data Breach

**Definition:** Unauthorized access to or exfiltration of customer/company data

**Immediate Actions:**
1. Contain breach (block access, isolate systems)
2. Determine scope of data compromised
3. Preserve forensic evidence
4. Notify Legal and Compliance teams

**Legal/Regulatory Requirements:**
- **GDPR:** Notify supervisory authority within 72 hours
- **CCPA:** Notify affected individuals "in the most expedient time possible"
- **State laws:** Vary by state, typically 30-90 days

**Communication:**
- Customers: Breach notification letters
- Regulators: Formal breach notification
- Public: Press release (if required)
- Credit monitoring: Offer to affected individuals

### Ransomware Attack

**Definition:** Malware encrypts data and demands ransom for decryption key

**DO NOT:**
- ❌ Pay ransom (FBI recommendation)
- ❌ Delete encrypted files (may need for forensics/recovery)
- ❌ Attempt decryption without expert guidance

**Immediate Actions:**
1. **Isolate** infected systems (disconnect from network)
2. **Identify** ransomware variant (file extensions, ransom note)
3. **Preserve** ransom note and encrypted files (evidence)
4. **Assess** backup availability
5. **Report** to FBI/law enforcement

**Recovery:**
1. Verify backups are not infected
2. Wipe and rebuild affected systems
3. Restore data from clean backups
4. Apply security patches
5. Conduct security assessment to prevent recurrence

**Resources:**
- No More Ransom Project: https://www.nomoreransom.org/
- FBI Internet Crime Complaint Center (IC3)

### DDoS Attack

**Definition:** Distributed Denial of Service attack overwhelming systems

**Detection:**
- Sudden traffic spike (10x+ normal)
- High CPU/memory usage
- Service degradation/unavailability
- Multiple requests from same IP ranges

**Immediate Actions:**
1. Enable DDoS protection (AWS Shield, Cloudflare)
2. Block source IPs at firewall
3. Enable rate limiting
4. Scale infrastructure if possible
5. Contact ISP/cloud provider for assistance

**Mitigation:**
- WAF (Web Application Firewall) rules
- Content Delivery Network (CDN)
- Traffic filtering (geo-blocking if attack is geographically concentrated)
- Increase infrastructure capacity temporarily

### Phishing Attack

**Targeting Employees:**
1. Report to Security team immediately
2. Do not click links or download attachments
3. Forward email to security@dcmms.com
4. Delete email

**Targeting Customers:**
1. Take down phishing site (contact hosting provider)
2. Notify customers via official channels
3. Report to phishing databases (PhishTank, Google Safe Browsing)
4. Document and analyze attack

### Insider Threat

**Definition:** Security threat from employees, contractors, or partners

**Indicators:**
- Unusual data access patterns
- Data exfiltration attempts
- Privilege abuse
- Policy violations
- Behavioral changes

**Investigation:**
- Work with HR and Legal
- Review access logs
- Audit data accessed
- Interview witnesses
- Preserve evidence (emails, logs, files)

**Actions:**
- Revoke access immediately
- Confiscate company devices
- Conduct forensic investigation
- Legal action if warranted

### Supply Chain Attack

**Definition:** Attack via compromised third-party software/service

**Examples:**
- Compromised npm package
- Malicious Docker image
- Backdoored software update

**Detection:**
- Dependency scanning (Snyk)
- Code review of dependencies
- Monitoring security advisories

**Response:**
1. Identify compromised dependency
2. Assess if dCMMS is affected
3. Remove or replace compromised component
4. Scan for indicators of compromise
5. Review other dependencies from same source

---

## Evidence Collection & Preservation

### Digital Forensics

**Evidence to Collect:**
- System logs (application, database, server)
- Network traffic captures
- Memory dumps
- Disk images
- Email communications
- Physical access logs

**Chain of Custody:**
- Document who collected evidence
- Document when and where collected
- Store in secure, tamper-proof location
- Maintain log of who accessed evidence
- Hash files to prove integrity

**Tools:**
- `dd` for disk imaging
- `tcpdump` / Wireshark for network capture
- `volatility` for memory analysis
- ELK stack for log analysis

---

## Communication Protocols

### Internal Communication

**Security Incident Slack Channel:**
- Channel: `#incident-security-YYYYMMDD-NNN`
- Participants: SIRT team only
- Purpose: Real-time coordination

### External Communication

**Customers (for data breach):**
- Notification required by law (varies by jurisdiction)
- Provide details: what happened, what data affected, remediation steps
- Offer credit monitoring/identity protection (if PII affected)

**Regulators:**
- GDPR: 72-hour notification to supervisory authority
- Work with Legal team for compliance

**Law Enforcement:**
- Report to FBI IC3 for cybercrime
- Local law enforcement for physical threats
- Provide evidence and cooperate with investigation

**Media/Public:**
- All public statements via PR team only
- Security team provides technical facts to PR
- Consistent messaging across channels

---

## Legal & Compliance Considerations

### Breach Notification Laws

**GDPR (EU):**
- Notify supervisory authority within 72 hours
- Notify affected individuals "without undue delay"
- Document breach in internal register

**CCPA (California):**
- Notify affected individuals "in most expedient time possible"
- Offer free credit monitoring for 12 months (if SSN compromised)

**State Laws (US):**
- Varies by state (47 states have breach notification laws)
- Typically 30-90 days to notify
- Work with Legal to ensure compliance

### Attorney-Client Privilege

**Protect Sensitive Communications:**
- Work with Legal counsel for privileged advice
- Mark communications as "Attorney-Client Privileged"
- Limit distribution of privileged documents
- Store privileged documents securely

---

## Security Incident Metrics

**Tracked Metrics:**
1. **Mean Time to Detect (MTTD):** Time from incident occurrence to detection
   - Target: < 1 hour for critical incidents

2. **Mean Time to Respond (MTTR):** Time from detection to initial response
   - Target: < 15 minutes for S1, < 30 minutes for S2

3. **Mean Time to Contain (MTTC):** Time from detection to containment
   - Target: < 2 hours for S1

4. **Mean Time to Recover (MTTR):** Time from detection to full recovery
   - Target: < 24 hours for S1

5. **Incident Count by Severity:** Trend over time

---

## Appendix: Security Incident Report Template

```markdown
# Security Incident Report

**Incident ID:** SEC-YYYYMMDD-NNN
**Severity:** [S1 / S2 / S3 / S4]
**Status:** [Open / Contained / Resolved / Closed]

## Executive Summary
[Brief description of the incident and impact]

## Timeline
| Time (UTC) | Event |
|------------|-------|
| YYYY-MM-DD HH:MM | Incident detected |
| YYYY-MM-DD HH:MM | SIRT activated |
| YYYY-MM-DD HH:MM | Containment achieved |
| YYYY-MM-DD HH:MM | Eradication complete |
| YYYY-MM-DD HH:MM | Systems restored |
| YYYY-MM-DD HH:MM | Incident resolved |

## Incident Details
- **Type:** [Data Breach / Malware / DDoS / Phishing / Insider Threat / Other]
- **Attack Vector:** [Description of how attack occurred]
- **Affected Systems:** [List]
- **Data Compromised:** [Yes/No, details if yes]

## Impact Assessment
- **Systems Affected:** [Count and list]
- **Users Affected:** [Count]
- **Data Compromised:** [Type and volume]
- **Downtime:** [Duration]
- **Estimated Cost:** [$Amount]

## Root Cause
[Technical explanation of how incident occurred]

## Response Actions Taken
1. [Action 1]
2. [Action 2]
...

## Evidence Collected
- [Evidence 1: Location, Hash]
- [Evidence 2: Location, Hash]

## Legal/Regulatory Actions
- [Breach notifications sent: Yes/No]
- [Law enforcement contacted: Yes/No]
- [Regulatory filing: Yes/No]

## Lessons Learned
### What Went Well
- [Item 1]

### What Didn't Go Well
- [Item 1]

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [Action 1] | [Name] | YYYY-MM-DD | High |

## Sign-off
- **Incident Commander:** _________________ Date: _______
- **Security Lead:** _________________ Date: _______
- **CISO:** _________________ Date: _______
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | Security Team | Initial version |

**Next Review Date:** 2026-02-19
