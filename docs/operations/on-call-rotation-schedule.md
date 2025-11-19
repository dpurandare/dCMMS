# On-Call Rotation Schedule

**Document:** dCMMS On-Call Rotation Schedule
**Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** Engineering Manager
**Review Frequency:** Monthly

---

## Overview

This document defines the on-call rotation schedule for the dCMMS platform, including rotation structure, responsibilities, compensation, and best practices.

---

## Rotation Structure

### On-Call Tiers

| Tier | Role | Response Time | Responsibility |
|------|------|---------------|----------------|
| **Tier 1** | Primary On-Call Engineer | 15 min (P1), 30 min (P2) | First responder, triage, initial investigation |
| **Tier 1 Backup** | Secondary On-Call Engineer | 30 min (if primary unavailable) | Backup for primary engineer |
| **Tier 2** | Incident Commander | 30 min (after escalation) | Coordinate P1/P2 incidents |
| **Tier 3 (Specialist)** | Database Administrator | 1 hour (when paged) | Database-specific incidents |
| **Tier 3 (Specialist)** | Security Lead | 15 min (security incidents) | Security incident response |

---

## Rotation Schedule

### Weekly Rotation Cycle

**Rotation Period:** Weekly (Monday 9:00 AM UTC → Monday 9:00 AM UTC)

**Handoff Time:** Monday 9:00 AM UTC (scheduled 30-minute handoff meeting)

**Rotation Type:** Round-robin through qualified engineers

---

## Current Rotation (Q4 2025 - Q1 2026)

### Tier 1: Primary On-Call Engineers

| Week Starting | Primary Engineer | Secondary Engineer | Notes |
|---------------|-----------------|-------------------|-------|
| **2025-11-18** | Alice Johnson | Bob Smith | - |
| **2025-11-25** | Bob Smith | Carol White | Thanksgiving week (US) |
| **2025-12-02** | Carol White | David Lee | - |
| **2025-12-09** | David Lee | Eva Martinez | - |
| **2025-12-16** | Eva Martinez | Alice Johnson | - |
| **2025-12-23** | Alice Johnson | Bob Smith | Christmas week - Holiday coverage |
| **2025-12-30** | Bob Smith | Carol White | New Year week - Holiday coverage |
| **2026-01-06** | Carol White | David Lee | - |
| **2026-01-13** | David Lee | Eva Martinez | - |
| **2026-01-20** | Eva Martinez | Alice Johnson | - |
| **2026-01-27** | Alice Johnson | Bob Smith | - |
| **2026-02-03** | Bob Smith | Carol White | - |

### Tier 2: Incident Commander

| Week Starting | Incident Commander | Backup IC |
|---------------|--------------------|-----------|
| **2025-11-18** | Michael Chen | Sarah Park |
| **2025-11-25** | Sarah Park | Michael Chen |
| **2025-12-02** | Michael Chen | Sarah Park |
| **2025-12-09** | Sarah Park | Michael Chen |
| **2025-12-16** | Michael Chen | Sarah Park |
| **2025-12-23** | Sarah Park | Michael Chen |
| **2025-12-30** | Michael Chen | Sarah Park |
| **2026-01-06** | Sarah Park | Michael Chen |

*Incident Commander role alternates between Senior Engineers/Engineering Managers*

### Tier 3: Database Administrator

| Week Starting | Primary DBA | Backup DBA |
|---------------|-------------|------------|
| **2025-11-18** | David Lee | Frank Wilson |
| **2025-12-02** | Frank Wilson | David Lee |
| **2025-12-16** | David Lee | Frank Wilson |
| **2025-12-30** | Frank Wilson | David Lee |

*DBA rotation is bi-weekly to maintain continuity*

### Security Lead (Always On-Call)

| Role | Primary | Backup |
|------|---------|--------|
| **Security Lead** | Lisa Thompson | James Rodriguez |

*Security Lead is dedicated 24/7 on-call with backup*

---

## Engineer Eligibility

### Tier 1 Eligibility (Primary On-Call)

**Requirements:**
- ✅ Senior Engineer or above (min 2 years experience)
- ✅ Completed on-call training program
- ✅ Passed on-call certification exam
- ✅ Familiar with production architecture
- ✅ Access to all production systems
- ✅ Completed shadowing (minimum 2 weeks with experienced engineer)

**Current Eligible Engineers:**
1. Alice Johnson - Senior Backend Engineer
2. Bob Smith - Senior Full-Stack Engineer
3. Carol White - Senior Infrastructure Engineer
4. David Lee - Senior Backend Engineer / DBA
5. Eva Martinez - Senior DevOps Engineer

**In Training (Will join rotation Q1 2026):**
- Frank Wilson (Database Engineer - completing training)
- Grace Kim (Backend Engineer - 2 weeks shadowing remaining)

---

### Tier 2 Eligibility (Incident Commander)

**Requirements:**
- ✅ Staff Engineer or Engineering Manager
- ✅ Min 3 years experience
- ✅ Completed incident command training
- ✅ Experience leading teams
- ✅ Strong communication skills
- ✅ Authority to make production decisions

**Current Eligible Engineers:**
1. Michael Chen - Staff Engineer
2. Sarah Park - Engineering Manager

---

## On-Call Responsibilities

### Before Your Shift

**Preparation Checklist:**

- [ ] Review handoff notes from previous on-call engineer
- [ ] Check for any ongoing incidents or known issues
- [ ] Review recent deployments (last 7 days)
- [ ] Ensure laptop is charged and accessible
- [ ] Test VPN connectivity
- [ ] Verify PagerDuty app is working (test alert)
- [ ] Test access to critical systems:
  - [ ] Production SSH access
  - [ ] Database access (pgAdmin, psql)
  - [ ] AWS Console
  - [ ] Grafana / Prometheus
  - [ ] Kibana / Logs
- [ ] Have phone charged and nearby
- [ ] Know location of escalation contacts

**Monday Handoff Meeting (30 minutes):**
- 9:00 - 9:10 AM: Previous on-call reviews week highlights
- 9:10 - 9:20 AM: Open incidents/issues handoff
- 9:20 - 9:30 AM: Q&A, system health review

---

### During Your Shift

**Daily Responsibilities:**

1. **Proactive Monitoring** (10 minutes, 3x per day: Morning, Afternoon, Evening)
   - Check Grafana dashboards
   - Review error rates
   - Check system resource utilization
   - Review recent alerts (even if auto-resolved)

2. **Alert Response**
   - Acknowledge alerts within SLA:
     - P1: 15 minutes
     - P2: 30 minutes
     - P3: 2 hours
   - Investigate and triage
   - Escalate if needed
   - Document all actions

3. **Communication**
   - Update incident channels regularly
   - Notify stakeholders promptly
   - Maintain status page
   - Log all significant events

4. **Availability**
   - Keep phone volume on (even during sleep)
   - Have laptop accessible 24/7
   - Respond to Slack messages within 30 minutes
   - Be available for escalations from support team

**Work-Life Balance:**
- You may continue regular work during on-call
- If actively responding to incident, pause regular work
- Take breaks between incidents
- Ask for relief if overwhelmed

---

### After Your Shift

**Handoff Checklist:**

- [ ] Prepare handoff notes for Monday meeting
- [ ] Document any ongoing incidents
- [ ] Update runbooks if you learned something new
- [ ] File expense report for after-hours work (if applicable)
- [ ] Complete post-on-call survey (feedback for improvements)

**Handoff Notes Template:**

```markdown
# On-Call Handoff Notes
**Week:** [Start Date] to [End Date]
**Engineer:** [Your Name]

## Incidents Handled

| Incident ID | Severity | Summary | Status |
|-------------|----------|---------|--------|
| INC-001 | P2 | Database slow queries | Resolved |
| INC-002 | P3 | Dashboard widget error | In Progress |

## Ongoing Issues

- [Issue 1]: Description and current status
- [Issue 2]: Description and recommended next steps

## System Health

- Overall system health: [Good / Fair / Poor]
- Known degradations: [List if any]
- Recent deployments: [List significant deployments]

## Recommendations for Next On-Call

- [Any advice or warnings for next engineer]

## Learnings / Runbook Updates

- [New things learned that should be documented]
```

---

## Compensation & Benefits

### On-Call Pay

| Component | Amount | Notes |
|-----------|--------|-------|
| **Weekly On-Call Stipend** | $200 | Paid regardless of incidents |
| **After-Hours Response** | 1.5x hourly rate | Mon-Fri 6pm-9am, weekends |
| **P1 Weekend Response** | 2.0x hourly rate | Saturday/Sunday |
| **Holiday Response** | 2.5x hourly rate | Official company holidays |

**Minimum Call-Out:** 2 hours (even if incident resolved in 30 minutes)

**Example Calculation:**

*Engineer with $75/hour base rate responds to P2 incident on Saturday at 2am, works for 1.5 hours:*
- On-call stipend: $200 (weekly)
- Incident response: 2 hours (minimum) × $75 × 2.0 (weekend P1 rate) = $300
- **Total:** $500 for the week

---

### Time-in-Lieu (Compensatory Time)

**When Available:**
- Extended incidents (> 4 hours after-hours)
- Multiple consecutive nights of interruptions
- Holiday coverage

**How to Request:**
- Discuss with manager within 2 weeks of on-call shift
- Manager approval required
- Take within 30 days

**Maximum Accrual:** 40 hours (5 days)

---

### Holiday Coverage

**Company Holidays Requiring Special Coverage:**

| Holiday | Date | Primary | Secondary | Notes |
|---------|------|---------|-----------|-------|
| **Thanksgiving** (US) | Nov 28, 2024 | Bob Smith | Carol White | Double pay |
| **Christmas Eve** | Dec 24, 2024 | Alice Johnson | Bob Smith | 2.5x pay |
| **Christmas Day** | Dec 25, 2024 | Alice Johnson | Bob Smith | 2.5x pay |
| **New Year's Eve** | Dec 31, 2024 | Bob Smith | Carol White | 2.5x pay |
| **New Year's Day** | Jan 1, 2025 | Bob Smith | Carol White | 2.5x pay |

**Holiday Coverage Incentive:**
- 2.5x hourly rate for all responses
- +$100 bonus for holiday on-call
- Automatic 1 day compensatory time off

---

## On-Call Best Practices

### DO ✅

- **Acknowledge alerts promptly** - Even if you're investigating, acknowledge within SLA
- **Communicate early and often** - Keep stakeholders informed
- **Escalate when uncertain** - Don't suffer in silence, ask for help
- **Document everything** - Actions taken, commands run, decisions made
- **Test before deploying** - Even in emergencies, test in staging if possible
- **Ask questions** - Use Slack incident channel, pull in experts
- **Take breaks** - Step away between incidents to stay fresh
- **Learn and improve** - Update runbooks, suggest monitoring improvements

### DON'T ❌

- **Ignore alerts** - Even if you think it's a false alarm, investigate
- **Make undocumented changes** - Always log what you're doing
- **Deploy untested code** - Especially at 3am when you're tired
- **Go silent** - Communicate status even if no progress
- **Skip escalation** - Better to over-escalate than under-escalate
- **Work while impaired** - If you're sick/injured, hand off to secondary
- **Panic** - Stay calm, follow runbooks, ask for help

---

## Escalation Paths

### When to Escalate

**Escalate to Incident Commander (Tier 2) if:**
- Any P1 or P2 incident
- Unable to resolve P3 within 4 hours
- Need cross-team coordination
- Require production deployment decision
- Data integrity concerns
- Security-related issue

**Escalate to Database Administrator if:**
- Database performance degradation
- Slow queries (> 2 seconds)
- Connection pool exhaustion
- Need to run manual queries
- Database failover consideration

**Escalate to Security Lead if:**
- Suspected security breach
- Unauthorized access detected
- Malware/ransomware alert
- Data exfiltration suspected
- DDoS attack
- Vulnerability disclosure

**Escalate to Engineering Manager if:**
- Incident exceeds 4 hours (P1) or 8 hours (P2)
- Need executive decision
- External vendor escalation needed
- Legal/compliance implications
- Multiple systems failing

---

## PagerDuty Configuration

### Alert Routing

**Primary Escalation Policy:**

1. **Level 1:** Primary On-Call Engineer
   - Immediately via push notification, SMS, phone call
   - If not acknowledged in 15 minutes → escalate to Level 2

2. **Level 2:** Secondary On-Call Engineer
   - Alert via push, SMS, phone
   - If not acknowledged in 15 minutes → escalate to Level 3

3. **Level 3:** Incident Commander
   - Alert via push, SMS, phone
   - If not acknowledged in 15 minutes → escalate to Level 4

4. **Level 4:** Engineering Manager
   - Alert via push, SMS, phone
   - Alert also goes to CTO

### Alert Severity Mapping

| Prometheus Alert | PagerDuty Severity | Primary Responder |
|------------------|-------------------|-------------------|
| `HighAPILatency` | High (P2) | Primary On-Call |
| `ServiceDown` | Critical (P1) | Primary On-Call |
| `DatabaseSlowQueries` | Medium (P3) | DBA |
| `HighErrorRate` | High (P2) | Primary On-Call |
| `DiskSpaceLow` | Low (P4) | Primary On-Call |
| `SecurityBreach` | Critical (P1) | Security Lead |
| `CertificateExpiring` | Low (P4) | Primary On-Call |

---

## Training Program

### On-Call Training Curriculum

**Week 1: Orientation**
- System architecture overview
- Production access setup
- Tool training (Grafana, PagerDuty, Slack)
- Runbook review

**Week 2-3: Shadowing**
- Shadow current on-call engineer for 2 weeks
- Observe incident response
- Participate in handoff meetings
- Review past incidents

**Week 4: Simulation**
- Chaos engineering exercises
- Simulated incidents (P3/P2)
- Practice escalation
- Communication drills

**Week 5: Certification**
- Written exam (system architecture, procedures)
- Practical exam (simulated incident response)
- Review by Engineering Manager
- Certification approval

**Ongoing Training:**
- Monthly incident review sessions
- Quarterly chaos engineering drills
- Annual refresher training
- Attend post-incident reviews

---

## Rotation Swaps & Coverage

### Requesting a Swap

**Process:**
1. Find a qualified engineer to swap with (from rotation list)
2. Notify Engineering Manager via email 1 week in advance
3. Update PagerDuty schedule
4. Notify team in #oncall-swaps Slack channel

**Swap Request Template:**

```
Subject: On-Call Swap Request - [Your Week] ↔ [Swap Week]

Hi [Manager Name],

I would like to swap my on-call shift:

FROM: [Week starting YYYY-MM-DD] (Originally assigned to me)
TO: [Week starting YYYY-MM-DD] (Originally assigned to [Engineer Name])

Swap Partner: [Engineer Name]
Reason: [Brief reason - vacation, conference, etc.]

Both engineers have agreed to this swap.

Thanks,
[Your Name]
```

**Emergency Coverage:**
- If you're unexpectedly unable to cover (illness, emergency), contact Secondary On-Call immediately
- Notify Engineering Manager as soon as possible
- Secondary takes over until replacement is found

---

## Metrics & Reporting

### On-Call Metrics Tracked

| Metric | Target | Reporting Frequency |
|--------|--------|---------------------|
| **Alert Acknowledgment Time** | < 15 min (P1) | Weekly |
| **Incidents per Week** | - | Weekly |
| **After-Hours Incidents** | < 5/week | Monthly |
| **False Alert Rate** | < 20% | Monthly |
| **Escalation Rate** | 30-40% | Monthly |
| **Incident Resolution Time** | - | Monthly |

### Monthly On-Call Report

**Report includes:**
- Total incidents by severity
- After-hours vs. business hours breakdown
- Alert acknowledgment time trends
- Engineer workload distribution
- False positive rate
- Top incident types
- Runbook gaps identified
- Improvement recommendations

**Report Distribution:**
- Engineering team (Slack #engineering)
- Engineering Manager
- CTO (executive summary)

---

## Contact Information

### On-Call Support

| Resource | Contact |
|----------|---------|
| **On-Call Hotline** | [TBD] - For emergencies when paging doesn't work |
| **PagerDuty Support** | 1-844-700-5544 (24/7) |
| **Engineering Manager** | [Email], [Phone] |
| **IT Help Desk** | helpdesk@dcmms.com - For access issues |

### Quick Reference

**PagerDuty Web:** https://dcmms.pagerduty.com

**PagerDuty Mobile App:** Required on all on-call engineers' phones

**Slack Channels:**
- `#oncall-handoffs` - Weekly handoff discussions
- `#oncall-swaps` - Rotation swap requests
- `#incidents` - Active incident coordination
- `#oncall-support` - Ask questions, get help

---

## Appendix: On-Call Survival Guide

### Essential Commands

```bash
# Check application status
systemctl status dcmms-backend
systemctl status dcmms-frontend

# Check logs (last 100 lines)
journalctl -u dcmms-backend -n 100 --no-pager

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check disk space
df -h

# Check memory
free -h

# Restart service (if needed)
sudo systemctl restart dcmms-backend

# Check recent deployments
cd /opt/dcmms && git log --oneline -10

# Tail application logs in real-time
tail -f /var/log/dcmms/application.log
```

### Quick Troubleshooting

**Symptom: Application Down (HTTP 500)**
1. Check if service is running: `systemctl status dcmms-backend`
2. If down, check logs: `journalctl -u dcmms-backend -n 100`
3. Restart if safe: `systemctl restart dcmms-backend`
4. If persists, check database connectivity
5. Escalate if unresolved in 30 minutes

**Symptom: Slow Performance**
1. Check Grafana dashboards (API latency, database)
2. Check database slow queries
3. Check system resources (CPU, memory, disk)
4. Check for recent deployments (possible regression)
5. Escalate to DBA if database issue

**Symptom: Database Connection Errors**
1. Check database status: `systemctl status postgresql`
2. Check connection count vs. pool size
3. Check for long-running queries
4. Restart connection pool if safe
5. Escalate to DBA immediately

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | Engineering Manager | Initial version |

**Next Review Date:** 2025-12-19 (Monthly review)

**Document Owner:** Engineering Manager

**Approval:**
- Engineering Manager: _________________________ Date: _________
- CTO: _________________________ Date: _________

---

**For questions about on-call rotation, contact: engineering-manager@dcmms.com**
