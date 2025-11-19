# Incident Response Plan

**Document:** dCMMS Incident Response Plan
**Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** Operations Team
**Review Frequency:** Quarterly

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Incident Classification](#incident-classification)
3. [Roles and Responsibilities](#roles-and-responsibilities)
4. [Incident Response Lifecycle](#incident-response-lifecycle)
5. [Incident Types and Response Procedures](#incident-types-and-response-procedures)
6. [Communication Protocols](#communication-protocols)
7. [Escalation Matrix](#escalation-matrix)
8. [On-Call Rotation](#on-call-rotation)
9. [Post-Incident Review](#post-incident-review)
10. [Tools and Resources](#tools-and-resources)
11. [Appendices](#appendices)

---

## Executive Summary

This Incident Response Plan (IRP) defines the processes, procedures, and responsibilities for managing and resolving incidents affecting the dCMMS platform. The plan ensures rapid response, clear communication, and systematic resolution of issues to minimize impact on users and business operations.

### Purpose

- Minimize system downtime and service disruptions
- Provide clear guidance for incident handling
- Ensure effective communication during incidents
- Enable rapid escalation when needed
- Facilitate continuous improvement through post-incident reviews

### Scope

This plan covers all incidents affecting:
- dCMMS production environment
- Critical infrastructure (databases, servers, networks)
- User-facing services (web application, API, mobile app)
- Data integrity and security
- Third-party integrations (payment gateways, cloud services)

---

## Incident Classification

### Severity Levels

#### **Severity 1 (Critical / P1)**

**Definition:** Complete service outage or critical security breach

**Impact:**
- Production system completely unavailable
- Data loss or corruption affecting multiple users
- Security breach exposing sensitive data
- Revenue-impacting issues (> $10,000/hour)

**Response Time:**
- Acknowledgment: < 15 minutes
- Initial Response: < 30 minutes
- Status Updates: Every 30 minutes

**Examples:**
- Complete database failure
- Entire application down (HTTP 500/503 errors)
- Data breach or ransomware attack
- Payment processing completely failed

**Response Team:** Incident Commander + All hands on deck

---

#### **Severity 2 (High / P2)**

**Definition:** Major functionality degraded or security vulnerability

**Impact:**
- Core features unavailable or severely degraded
- Significant performance degradation (> 50% slower)
- Security vulnerability requiring immediate patching
- Affecting > 25% of users

**Response Time:**
- Acknowledgment: < 30 minutes
- Initial Response: < 1 hour
- Status Updates: Every 1 hour

**Examples:**
- API response time > 2 seconds (10x slower than target)
- Work order creation failing
- Telemetry data ingestion stopped
- Authentication service intermittent failures
- Critical security vulnerability (CVE score > 9.0)

**Response Team:** Incident Commander + Relevant on-call engineers

---

#### **Severity 3 (Medium / P3)**

**Definition:** Non-critical feature impaired or minor security issue

**Impact:**
- Non-critical features unavailable
- Performance degradation (20-50% slower)
- Minor security issue requiring patching
- Affecting < 25% of users

**Response Time:**
- Acknowledgment: < 2 hours
- Initial Response: < 4 hours
- Status Updates: Every 4 hours

**Examples:**
- Report generation failing
- Dashboard widgets not loading
- Email notifications delayed
- Minor UI bugs affecting usability
- Non-critical API endpoints returning errors

**Response Team:** On-call engineer

---

#### **Severity 4 (Low / P4)**

**Definition:** Minor issue or cosmetic problem

**Impact:**
- Cosmetic issues not affecting functionality
- Documentation errors
- Minor performance degradation (< 20%)
- Feature requests disguised as bugs

**Response Time:**
- Acknowledgment: < 1 business day
- Initial Response: < 2 business days
- Status Updates: As needed

**Examples:**
- UI alignment issues
- Typos in documentation
- Minor chart rendering issues
- Tooltip text incorrect

**Response Team:** Regular support team (no on-call escalation)

---

## Roles and Responsibilities

### Incident Commander (IC)

**Primary Role:** Overall incident coordination and decision-making

**Responsibilities:**
- Declare incident and assign severity level
- Coordinate response team activities
- Make critical decisions during incident
- Communicate with stakeholders
- Declare incident resolved
- Ensure post-incident review is conducted

**Who:** Senior Engineer, DevOps Lead, or Engineering Manager

**On-Call:** 24/7 rotation (weekly shifts)

---

### Technical Lead (TL)

**Primary Role:** Technical investigation and resolution

**Responsibilities:**
- Lead technical troubleshooting
- Coordinate with subject matter experts
- Implement fixes or workarounds
- Validate solutions before deployment
- Document technical details

**Who:** Senior Backend/Infrastructure Engineer

**On-Call:** 24/7 rotation (weekly shifts)

---

### Communications Lead (CL)

**Primary Role:** Internal and external communication

**Responsibilities:**
- Draft status updates for stakeholders
- Manage status page updates
- Coordinate with customer support
- Prepare customer communications
- Update internal teams

**Who:** Product Manager or Customer Success Manager

**On-Call:** Business hours (escalation path for after-hours)

---

### Database Administrator (DBA)

**Primary Role:** Database-related incident handling

**Responsibilities:**
- Investigate database performance issues
- Handle database recovery procedures
- Manage database failover if needed
- Optimize slow queries
- Monitor database health

**Who:** Senior Database Engineer

**On-Call:** 24/7 rotation (weekly shifts)

---

### Security Lead

**Primary Role:** Security incident response

**Responsibilities:**
- Investigate security incidents
- Coordinate security breach response
- Implement security patches
- Liaise with legal/compliance teams
- Conduct security forensics

**Who:** Security Engineer or CISO

**On-Call:** 24/7 on-call (dedicated pager)

---

## Incident Response Lifecycle

### Phase 1: Detection & Reporting (0-5 minutes)

**Detection Sources:**
- Automated monitoring alerts (Prometheus, Grafana)
- User reports (support tickets, emails)
- On-call engineer proactive monitoring
- Social media mentions
- Third-party monitoring services

**Actions:**
1. Incident detected via monitoring or reported by user
2. On-call engineer receives alert (PagerDuty, Slack, SMS)
3. On-call engineer acknowledges alert within 15 minutes (P1) or 30 minutes (P2)

**Tools:**
- PagerDuty for alert routing
- Grafana for monitoring dashboards
- Zendesk for support tickets

---

### Phase 2: Triage & Classification (5-15 minutes)

**Actions:**
1. **Verify the incident**
   - Confirm issue is real (not false alarm)
   - Reproduce if possible
   - Check scope of impact

2. **Classify severity**
   - Use severity matrix above
   - Consider: users affected, revenue impact, data risk

3. **Declare incident** (P1/P2 only)
   - Create incident channel in Slack (`#incident-YYYYMMDD-NNN`)
   - Page Incident Commander
   - Notify relevant stakeholders

**Tools:**
- Slack for incident channels
- PagerDuty for paging
- Incident template (Appendix A)

---

### Phase 3: Investigation & Diagnosis (15 minutes - 2 hours)

**Actions:**
1. **Gather information**
   - Review logs (application, database, server)
   - Check recent deployments
   - Review monitoring dashboards
   - Interview users if needed

2. **Identify root cause**
   - Use diagnostic tools (logs, traces, metrics)
   - Form hypothesis
   - Test hypothesis

3. **Determine fix strategy**
   - Quick fix vs. proper fix
   - Rollback deployment
   - Configuration change
   - Database query
   - Infrastructure scaling

**Tools:**
- Grafana / Prometheus for metrics
- Kibana / Elasticsearch for logs
- PostgreSQL logs and pg_stat_statements
- AWS CloudWatch
- New Relic / Datadog (if integrated)

---

### Phase 4: Resolution & Recovery (Variable)

**Actions:**
1. **Implement fix**
   - Apply hotfix or rollback
   - Test in staging (if time permits)
   - Deploy to production
   - Monitor for side effects

2. **Verify resolution**
   - Confirm issue is resolved
   - Monitor key metrics for 15-30 minutes
   - Get user confirmation if applicable

3. **Remove workarounds** (if any)
   - Clean up temporary fixes
   - Restore normal operations

**Deployment Procedures:**
- P1: Emergency deployment process (skip CI/CD if needed)
- P2: Fast-track deployment with minimal testing
- P3/P4: Standard deployment process

---

### Phase 5: Communication & Updates (Throughout)

**Frequency:**
- P1: Every 30 minutes
- P2: Every 1 hour
- P3: Every 4 hours
- P4: As needed

**Communication Channels:**
- **Internal:** Slack (`#incident-*` channel)
- **External:** Status page (status.dcmms.com)
- **Customers:** Email notifications (for critical incidents)

**Status Update Template:** See Appendix B

---

### Phase 6: Closure & Post-Incident Review (24-72 hours after)

**Actions:**
1. **Declare incident resolved**
   - Confirm all systems operational
   - Remove incident status from status page
   - Close incident channel (after 24 hours)

2. **Schedule post-incident review** (within 72 hours)
   - Book meeting with response team
   - Prepare timeline and metrics

3. **Conduct post-incident review**
   - What happened? (timeline)
   - What went well?
   - What didn't go well?
   - Action items for improvement

4. **Document lessons learned**
   - Update runbooks
   - Improve monitoring/alerting
   - Preventive measures

**Post-Incident Review Template:** See Appendix C

---

## Incident Types and Response Procedures

### 1. Application Outage

**Symptoms:**
- HTTP 500/503 errors
- Application unresponsive
- Users cannot access system

**Investigation Steps:**
1. Check application server status (Nginx, Fastify)
2. Review application logs for errors
3. Check database connectivity
4. Verify server resources (CPU, memory, disk)
5. Review recent deployments

**Common Causes:**
- Application crash
- Database connection pool exhausted
- Memory leak (OOM killer)
- Configuration error
- Deployment failure

**Resolution:**
- Restart application services
- Scale up resources if needed
- Rollback deployment if recent
- Fix configuration error
- Database connection pool adjustment

---

### 2. Database Performance Degradation

**Symptoms:**
- Slow API responses (> 2 seconds)
- Database connection timeouts
- High database CPU usage

**Investigation Steps:**
1. Check database metrics (CPU, memory, connections)
2. Review slow query log
3. Check pg_stat_statements for slow queries
4. Verify index usage
5. Check for long-running transactions

**Common Causes:**
- Missing indexes
- Inefficient queries
- Table bloat
- Lock contention
- Connection pool saturation

**Resolution:**
- Kill long-running queries
- Add missing indexes
- Optimize slow queries
- Run VACUUM/ANALYZE
- Increase connection pool size
- Scale database resources

---

### 3. Telemetry Data Ingestion Failure

**Symptoms:**
- Devices reporting offline
- No recent telemetry data
- Kafka lag increasing

**Investigation Steps:**
1. Check MQTT broker status (Mosquitto)
2. Verify Kafka broker health
3. Check QuestDB write performance
4. Review telemetry service logs
5. Test device connectivity

**Common Causes:**
- MQTT broker down
- Kafka broker failure
- QuestDB disk full
- Network connectivity issues
- Rate limiting

**Resolution:**
- Restart MQTT broker
- Restart Kafka brokers
- Clear disk space on QuestDB
- Increase Kafka partitions
- Adjust rate limits

---

### 4. ML Service Failure

**Symptoms:**
- ML predictions not returning
- Anomaly detection not working
- Predictive maintenance failing

**Investigation Steps:**
1. Check ML service health endpoint
2. Review ML service logs
3. Verify Feast Feature Store connectivity
4. Check model serving status
5. Test feature retrieval

**Common Causes:**
- ML service crashed
- Feature store (Redis) down
- Model loading failure
- Insufficient memory
- Timeout issues

**Resolution:**
- Restart ML service
- Reload models
- Increase service memory
- Fix feature store connectivity
- Adjust timeout configuration

---

### 5. Security Incident

**Symptoms:**
- Unauthorized access detected
- Suspicious activity in logs
- Malware/ransomware alert
- Data breach notification

**Investigation Steps:**
1. **IMMEDIATELY** isolate affected systems
2. Preserve forensic evidence (logs, memory dumps)
3. Identify attack vector
4. Assess scope of breach
5. Notify Security Lead and Legal team

**Common Scenarios:**
- SQL injection attempt
- Brute force attack
- DDoS attack
- Malware infection
- Data exfiltration

**Resolution:**
- Block malicious IPs
- Patch vulnerabilities
- Reset compromised credentials
- Restore from clean backups
- Engage external security firm (if severe)

**⚠️ CRITICAL:** Security incidents ALWAYS require Security Lead involvement

---

### 6. Third-Party Service Outage

**Symptoms:**
- Payment processing failing
- Email notifications not sending
- Cloud storage unavailable
- OAuth login failing

**Investigation Steps:**
1. Check third-party service status page
2. Verify API credentials
3. Test API connectivity
4. Review integration logs
5. Check rate limits

**Common Causes:**
- Third-party service outage
- API key expired
- Rate limit exceeded
- Network connectivity
- Configuration change

**Resolution:**
- Implement fallback/workaround
- Contact third-party support
- Switch to backup service (if available)
- Queue requests for retry
- Notify users of degraded functionality

---

## Communication Protocols

### Internal Communication

**Primary Channel:** Slack incident channel

**Channel Naming:** `#incident-YYYYMMDD-NNN`
- Example: `#incident-20251119-001`

**Channel Purpose:**
- Real-time coordination
- Status updates
- Technical discussion
- Decision logging

**Participants:**
- Incident Commander
- Technical Lead
- Relevant engineers
- Database Administrator (if database issue)
- Security Lead (if security issue)
- Communications Lead

---

### External Communication

#### Status Page (status.dcmms.com)

**Update Frequency:**
- P1: Every 30 minutes
- P2: Every 1 hour
- P3: Every 4 hours

**Status Levels:**
- 🟢 Operational
- 🟡 Degraded Performance
- 🟠 Partial Outage
- 🔴 Major Outage
- 🔵 Under Maintenance

**Sample Status Update:**
```
[2025-11-19 14:30 UTC] Investigating
We are investigating reports of slow API response times.
We will provide an update in 30 minutes.

[2025-11-19 15:00 UTC] Identified
We have identified a database query performance issue.
Our team is working on a fix. Expected resolution: 16:00 UTC.

[2025-11-19 15:45 UTC] Monitoring
A fix has been deployed. We are monitoring the system to
ensure performance is restored.

[2025-11-19 16:15 UTC] Resolved
The issue has been resolved. All systems are operating normally.
```

---

#### Customer Email Notifications

**Trigger:** P1/P2 incidents affecting > 50% of users

**Timing:**
- Initial notification: Within 1 hour of detection
- Resolution notification: When incident is resolved
- Post-incident summary: Within 24 hours (optional)

**Email Template:** See Appendix D

---

#### Social Media

**Platforms:** Twitter (@dCMMS_Status), LinkedIn (company page)

**Trigger:** P1 incidents only

**Sample Tweet:**
```
We are currently experiencing service disruptions affecting
some users. Our team is actively working on a resolution.
Updates: https://status.dcmms.com
```

---

### Stakeholder Notification

**Stakeholders to Notify:**

| Stakeholder | P1 | P2 | P3 | P4 | Method |
|-------------|----|----|----|----|--------|
| **CTO** | Immediately | Within 1h | Next day | No | Phone/Slack |
| **CEO** | Within 30min | Within 2h | No | No | Slack/Email |
| **Customer Success** | Immediately | Within 30min | Within 4h | No | Slack |
| **Sales Team** | Within 1h | Within 2h | No | No | Slack/Email |
| **All Employees** | Within 2h | End of day | No | No | All-hands Slack |

---

## Escalation Matrix

### Level 1: On-Call Engineer

**Handles:** All P3/P4 incidents, initial P1/P2 response

**Escalation Trigger:**
- Unable to resolve P3 within 4 hours
- Any P1/P2 incident
- Security-related issue
- Data integrity issue

**Escalates To:** Incident Commander (IC)

---

### Level 2: Incident Commander

**Handles:** All P1/P2 incidents

**Escalation Trigger:**
- Unable to resolve P2 within 4 hours
- P1 incident not resolved within 2 hours
- Requires executive decision
- Multi-team coordination needed
- Potential data loss

**Escalates To:** Engineering Manager + CTO

---

### Level 3: Engineering Manager + CTO

**Handles:** Critical P1 incidents, executive decisions

**Escalation Trigger:**
- P1 incident exceeds 4 hours
- Significant customer impact (> 75% users)
- Potential revenue loss > $50,000
- Legal/compliance implications
- External vendor escalation needed

**Escalates To:** CEO, Board (if needed)

---

### Escalation Contact List

| Role | Primary | Backup | Phone | Email |
|------|---------|--------|-------|-------|
| **On-Call Engineer** | [See Rotation] | [See Rotation] | [TBD] | oncall@dcmms.com |
| **Incident Commander** | [Name] | [Name] | [TBD] | [TBD] |
| **Database Administrator** | [Name] | [Name] | [TBD] | [TBD] |
| **Security Lead** | [Name] | [Name] | [TBD] | security@dcmms.com |
| **Engineering Manager** | [Name] | [Name] | [TBD] | [TBD] |
| **CTO** | [Name] | - | [TBD] | [TBD] |
| **CEO** | [Name] | - | [TBD] | [TBD] |

---

## On-Call Rotation

### On-Call Schedule

**Rotation Type:** Weekly rotation (Monday 9am - Monday 9am UTC)

**On-Call Roles:**
1. **Primary On-Call Engineer** (Tier 1)
2. **Secondary On-Call Engineer** (Backup)
3. **Incident Commander** (Tier 2)
4. **Database Administrator** (Specialist)

**Rotation Calendar:** Managed in PagerDuty

**Sample 4-Week Rotation:**

| Week | Primary Engineer | Secondary Engineer | Incident Commander | DBA |
|------|-----------------|-------------------|-------------------|-----|
| Week 1 | Alice Johnson | Bob Smith | Carol White | David Lee |
| Week 2 | Bob Smith | Carol White | David Lee | Alice Johnson |
| Week 3 | Carol White | David Lee | Alice Johnson | Bob Smith |
| Week 4 | David Lee | Alice Johnson | Bob Smith | Carol White |

---

### On-Call Responsibilities

**Before Your Shift:**
- Review open incidents and ongoing issues
- Ensure laptop is charged and accessible
- Test PagerDuty connectivity
- Review recent deployments and known issues
- Ensure VPN and access credentials work

**During Your Shift:**
- Respond to alerts within SLA (15-30 minutes)
- Monitor system health proactively
- Keep laptop nearby (even during sleep hours)
- Be available for escalations
- Document all actions taken

**After Your Shift:**
- Hand off any ongoing incidents to next engineer
- Document open issues
- Update runbooks if needed
- Report any escalation concerns

---

### On-Call Compensation

**Compensation Structure:**
- On-call stipend: $200/week
- After-hours incident response: 1.5x hourly rate
- P1 weekend incident: 2x hourly rate
- Time-in-lieu available for extended incidents

**Minimum Call-Out:** 2 hours (even if incident resolved faster)

---

### On-Call Best Practices

**DO:**
- ✅ Acknowledge alerts promptly
- ✅ Communicate early and often
- ✅ Escalate when uncertain
- ✅ Document all actions
- ✅ Ask for help

**DON'T:**
- ❌ Ignore alerts (even if you think it's a false alarm)
- ❌ Make changes without documentation
- ❌ Deploy untested fixes to production
- ❌ Go silent during an incident
- ❌ Suffer in silence - escalate!

---

## Post-Incident Review

### Purpose

- Understand root cause
- Identify improvement opportunities
- Prevent recurrence
- Share learnings across team
- Update documentation

### Timing

**Schedule Post-Incident Review:**
- P1: Within 24-48 hours
- P2: Within 72 hours
- P3: Optional (if learnings valuable)
- P4: Not required

### Participants

- Incident Commander
- Technical Lead(s)
- Database Administrator (if relevant)
- Engineering Manager
- Product Manager
- Any engineer who contributed to resolution

### Agenda (1 hour meeting)

1. **Incident Timeline** (15 min)
   - What happened and when?
   - Detection to resolution timeline
   - Key decision points

2. **What Went Well?** (10 min)
   - Effective responses
   - Helpful tools/processes
   - Good communication

3. **What Didn't Go Well?** (15 min)
   - Delays or bottlenecks
   - Missing tools/documentation
   - Communication breakdowns

4. **Root Cause Analysis** (10 min)
   - Technical root cause
   - Process gaps
   - Human factors

5. **Action Items** (10 min)
   - Preventive measures
   - Monitoring improvements
   - Documentation updates
   - Assign owners and deadlines

**Post-Incident Review Template:** See Appendix C

---

## Tools and Resources

### Monitoring & Alerting

| Tool | Purpose | Access |
|------|---------|--------|
| **Grafana** | Metrics visualization | https://grafana.dcmms.com |
| **Prometheus** | Metrics collection | https://prometheus.dcmms.com |
| **PagerDuty** | Alert routing, on-call | https://dcmms.pagerduty.com |
| **Status Page** | External status updates | https://status.dcmms.com |

### Logging & Debugging

| Tool | Purpose | Access |
|------|---------|--------|
| **Kibana** | Log search and analysis | https://kibana.dcmms.com |
| **PostgreSQL Logs** | Database query logs | SSH to DB server |
| **Application Logs** | Backend service logs | `/var/log/dcmms/` |
| **AWS CloudWatch** | Cloud infrastructure logs | AWS Console |

### Communication

| Tool | Purpose | Access |
|------|---------|--------|
| **Slack** | Incident coordination | #incident-* channels |
| **Zoom** | Incident war room | https://zoom.us/dcmms |
| **Email** | Customer notifications | support@dcmms.com |
| **Twitter** | Public status updates | @dCMMS_Status |

### Documentation

| Resource | Location |
|----------|----------|
| **Runbooks** | `/docs/runbooks/` |
| **Architecture Diagrams** | `/docs/architecture/` |
| **Deployment Procedures** | `/docs/deployment/` |
| **DR Plan** | `/docs/operations/disaster-recovery-plan.md` |
| **Security Procedures** | `/docs/security/` |

---

## Appendices

### Appendix A: Incident Declaration Template

```
========================================
INCIDENT DECLARATION
========================================
Incident ID: INC-YYYYMMDD-NNN
Declared By: [Name]
Declared At: [YYYY-MM-DD HH:MM UTC]
Severity: [P1 / P2 / P3 / P4]

SUMMARY:
[Brief description of the incident]

IMPACT:
- Users Affected: [Number or percentage]
- Services Affected: [List]
- Revenue Impact: [Estimated $]

INCIDENT COMMANDER: [Name]
TECHNICAL LEAD: [Name]
COMMUNICATIONS LEAD: [Name]

NEXT UPDATE: [Time]

Incident Channel: #incident-YYYYMMDD-NNN
========================================
```

---

### Appendix B: Status Update Template

```
[YYYY-MM-DD HH:MM UTC] [STATUS_LEVEL]

[Detailed description of current status]

Current Impact: [Description]
Users Affected: [Number/percentage]
Next Update: [Time]

For more information: #incident-YYYYMMDD-NNN
```

**Status Levels:**
- **Investigating:** We are investigating reports of [issue]
- **Identified:** We have identified the cause as [root cause]
- **Monitoring:** A fix has been deployed and we are monitoring
- **Resolved:** The issue has been resolved

---

### Appendix C: Post-Incident Review Template

```markdown
# Post-Incident Review: [Incident Title]

**Date:** YYYY-MM-DD
**Incident ID:** INC-YYYYMMDD-NNN
**Severity:** P1 / P2 / P3
**Duration:** [Detection to resolution]
**Attendees:** [List]

## Incident Summary

[Brief description of what happened]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Incident detected |
| HH:MM | Incident declared |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

## Impact

- **Users Affected:** [Number/percentage]
- **Duration:** [Hours/minutes]
- **Revenue Impact:** [$Amount]
- **Services Affected:** [List]

## Root Cause

[Detailed explanation of technical root cause]

## What Went Well

- [Item 1]
- [Item 2]

## What Didn't Go Well

- [Item 1]
- [Item 2]

## Action Items

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [Action 1] | [Name] | YYYY-MM-DD | High |
| [Action 2] | [Name] | YYYY-MM-DD | Medium |

## Lessons Learned

[Summary of key learnings]

---

**Reviewed By:** [Engineering Manager]
**Approved:** [Date]
```

---

### Appendix D: Customer Email Notification Template

**Subject:** [Action Required / Resolved] Service Disruption - [Date]

```
Dear dCMMS User,

We are writing to inform you about a service disruption that occurred on [Date] affecting [Service/Feature].

WHAT HAPPENED:
[Brief, non-technical explanation]

IMPACT:
- Affected Services: [List]
- Duration: [Start time] to [End time] UTC
- Users Affected: [Percentage or number]

RESOLUTION:
[What we did to fix it]

PREVENTIVE MEASURES:
[What we're doing to prevent recurrence]

We sincerely apologize for any inconvenience this may have caused.
If you have any questions or concerns, please contact our support
team at support@dcmms.com.

Thank you for your patience and understanding.

Best regards,
The dCMMS Team

---
For real-time status updates: https://status.dcmms.com
```

---

### Appendix E: Emergency Contact Numbers

**24/7 Emergency Hotline:** [TBD]

**External Vendors:**

| Vendor | Service | Support Number | Account ID |
|--------|---------|---------------|------------|
| AWS | Cloud Infrastructure | 1-800-xxx-xxxx | [Account ID] |
| PagerDuty | Alert Routing | 1-844-xxx-xxxx | [Account ID] |
| PostgreSQL Support | Database | [TBD] | [Account ID] |
| Security Firm | Incident Response | [TBD] | [Account ID] |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | Infrastructure Team | Initial version |

**Next Review Date:** 2026-02-19 (Quarterly)

**Document Owner:** Operations Manager

**Approval:**
- Operations Manager: _________________________ Date: _________
- Engineering Manager: _________________________ Date: _________
- CTO: _________________________ Date: _________

---

**For questions about this plan, contact: operations@dcmms.com**
